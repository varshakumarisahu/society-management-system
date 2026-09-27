from psycopg import Connection

from server.schemas.notification import AnnouncementCreate, NotificationType
from server.services.settings_service import system_config


def notify_active_residents(
    db: Connection,
    notification_type: NotificationType,
    title: str,
    message: str,
    reference_id: int | None = None,
    flat_id: int | None = None,
) -> int:
    if not system_config(db).enableNotifications:
        return 0
    flat_clause = "AND r.flat_id = %s" if flat_id is not None else ""
    params: list = [notification_type, title, message, reference_id]
    if flat_id is not None:
        params.append(flat_id)
    result = db.execute(
        f"""INSERT INTO notifications (user_id, type, title, message, reference_id)
            SELECT DISTINCT u.user_id, %s, %s, %s, %s
            FROM residents r JOIN users u ON u.user_id = r.user_id
            WHERE r.status = 'active' AND u.status = 'active' AND u.role = 'resident'
              {flat_clause}
            ON CONFLICT DO NOTHING""",
        params,
    )
    return result.rowcount


def notify_user(
    db: Connection,
    user_id: int | None,
    notification_type: NotificationType,
    title: str,
    message: str,
    reference_id: int | None = None,
) -> None:
    if not system_config(db).enableNotifications:
        return
    if user_id is None:
        return
    db.execute(
        """INSERT INTO notifications (user_id, type, title, message, reference_id)
           SELECT user_id, %s, %s, %s, %s FROM users
           WHERE user_id = %s AND status = 'active'""",
        (notification_type, title, message, reference_id, user_id),
    )


def list_notifications(
    db: Connection, user_id: int, notification_type: str | None = None,
    unread_only: bool = False, limit: int = 100,
) -> list[dict]:
    conditions = ["user_id = %s"]
    params: list = [user_id]
    if notification_type:
        conditions.append("type = %s")
        params.append(notification_type)
    if unread_only:
        conditions.append("is_read = false")
    params.append(limit)
    return db.execute(
        f"""SELECT notification_id, user_id, type, title, message, reference_id, is_read, created_at
            FROM notifications WHERE {' AND '.join(conditions)}
            ORDER BY created_at DESC, notification_id DESC LIMIT %s""",
        params,
    ).fetchall()


def unread_count(db: Connection, user_id: int) -> int:
    row = db.execute(
        "SELECT COUNT(*) AS total FROM notifications WHERE user_id = %s AND is_read = false",
        (user_id,),
    ).fetchone()
    return row["total"]


def mark_read(db: Connection, user_id: int, notification_id: int) -> bool:
    row = db.execute(
        """UPDATE notifications SET is_read = true
           WHERE notification_id = %s AND user_id = %s RETURNING notification_id""",
        (notification_id, user_id),
    ).fetchone()
    return row is not None


def mark_all_read(db: Connection, user_id: int) -> int:
    result = db.execute(
        "UPDATE notifications SET is_read = true WHERE user_id = %s AND is_read = false",
        (user_id,),
    )
    return result.rowcount


def delete_notification(db: Connection, user_id: int, notification_id: int) -> bool:
    row = db.execute(
        "DELETE FROM notifications WHERE notification_id = %s AND user_id = %s RETURNING notification_id",
        (notification_id, user_id),
    ).fetchone()
    return row is not None


def clear_read(db: Connection, user_id: int) -> int:
    result = db.execute(
        "DELETE FROM notifications WHERE user_id = %s AND is_read = true", (user_id,)
    )
    return result.rowcount


def broadcast_announcement(db: Connection, data: AnnouncementCreate) -> int:
    if not system_config(db).enableNotifications:
        return 0
    result = db.execute(
        """INSERT INTO notifications (user_id, type, title, message)
           SELECT user_id, 'system', %s, %s FROM users WHERE status = 'active'""",
        (data.title.strip(), data.message.strip()),
    )
    return result.rowcount
