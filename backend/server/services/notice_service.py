from psycopg import Connection

from server.schemas.notice import NoticeCreate, NoticeUpdate
from server.services.notification_service import notify_active_residents


class NoticeNotFoundError(Exception):
    pass


_SELECT = """SELECT n.notice_id, n.title, n.content, n.posted_by,
                    u.full_name AS posted_by_name, n.valid_from, n.valid_until,
                    n.is_active, n.is_archived, n.created_at, n.updated_at
             FROM notices n JOIN users u ON u.user_id = n.posted_by"""


def archive_expired(db: Connection) -> None:
    db.execute(
        """UPDATE notices SET is_active = false, is_archived = true, updated_at = now()
           WHERE is_archived = false AND valid_until IS NOT NULL AND valid_until <= now()"""
    )


def list_notices(db: Connection, include_archived: bool = False) -> list[dict]:
    archive_expired(db)
    if include_archived:
        return db.execute(f"{_SELECT} ORDER BY n.created_at DESC, n.notice_id DESC").fetchall()
    return db.execute(
        f"""{_SELECT}
            WHERE n.is_active = true AND n.is_archived = false
              AND n.valid_from <= now()
              AND (n.valid_until IS NULL OR n.valid_until > now())
            ORDER BY n.created_at DESC, n.notice_id DESC"""
    ).fetchall()


def _get_one(db: Connection, notice_id: int) -> dict:
    row = db.execute(f"{_SELECT} WHERE n.notice_id = %s", (notice_id,)).fetchone()
    if row is None:
        raise NoticeNotFoundError(f"Notice {notice_id} not found")
    return row


def create_notice(db: Connection, data: NoticeCreate, posted_by: int) -> dict:
    row = db.execute(
        """INSERT INTO notices (title, content, posted_by, valid_until)
           VALUES (%s, %s, %s, %s) RETURNING notice_id""",
        (data.title.strip(), data.content.strip(), posted_by, data.valid_until),
    ).fetchone()
    notice = _get_one(db, row["notice_id"])
    notify_active_residents(
        db, "notice", f"New Notice: {notice['title']}", notice["content"], notice["notice_id"]
    )
    return notice


def update_notice(db: Connection, notice_id: int, data: NoticeUpdate) -> dict:
    _get_one(db, notice_id)
    values = data.model_dump(exclude_unset=True)
    for key in ("title", "content"):
        if values.get(key) is not None:
            values[key] = values[key].strip()
    if values:
        assignments = ", ".join(f"{column} = %s" for column in values)
        db.execute(
            f"UPDATE notices SET {assignments}, updated_at = now() WHERE notice_id = %s",
            [*values.values(), notice_id],
        )
    return _get_one(db, notice_id)


def delete_notice(db: Connection, notice_id: int) -> None:
    row = db.execute(
        "DELETE FROM notices WHERE notice_id = %s RETURNING notice_id", (notice_id,)
    ).fetchone()
    if row is None:
        raise NoticeNotFoundError(f"Notice {notice_id} not found")
