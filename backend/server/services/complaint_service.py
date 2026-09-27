from psycopg import Connection

from server.schemas.complaint import ComplaintCreate, ComplaintUpdate, ComplaintStatus
from server.services.notification_service import notify_user
from server.services.settings_service import system_config


class ComplaintNotFoundError(Exception):
    pass


class InvalidComplaintReferenceError(Exception):
    pass


class InvalidAssigneeError(Exception):
    pass


_SELECT = """
    SELECT c.complaint_id, c.subject, c.description, c.category, c.status,
           c.priority, c.resident_id, r.full_name AS resident_name, c.flat_id,
           f.flat_number, b.name AS block_name, c.assigned_to,
           assignee.full_name AS assigned_to_name,
           latest.note AS resolution_notes,
           c.created_at, c.updated_at, c.resolved_at, c.closed_at
    FROM complaints c
    JOIN residents r ON r.resident_id = c.resident_id
    JOIN flats f ON f.flat_id = c.flat_id
    JOIN blocks b ON b.block_id = f.block_id
    LEFT JOIN users assignee ON assignee.user_id = c.assigned_to
    LEFT JOIN LATERAL (
        SELECT note FROM complaint_history h
        WHERE h.complaint_id = c.complaint_id
          AND h.new_status = 'resolved' AND h.note IS NOT NULL
        ORDER BY h.created_at DESC, h.history_id DESC LIMIT 1
    ) latest ON true
"""


def _get_one(db: Connection, complaint_id: int) -> dict:
    row = db.execute(
        f"{_SELECT} WHERE c.complaint_id = %s", (complaint_id,)
    ).fetchone()
    if row is None:
        raise ComplaintNotFoundError(f"Complaint {complaint_id} not found")
    return row


def list_complaints(
    db: Connection,
    status: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    resident_user_id: int | None = None,
) -> list[dict]:
    conditions: list[str] = []
    params: list = []
    if resident_user_id is not None:
        conditions.append("r.user_id = %s")
        params.append(resident_user_id)
    if status:
        conditions.append("c.status = %s")
        params.append(status)
    if priority:
        conditions.append("c.priority = %s")
        params.append(priority)
    if search:
        like = f"%{search}%"
        conditions.append(
            "(c.subject ILIKE %s OR c.description ILIKE %s OR c.category ILIKE %s "
            "OR r.full_name ILIKE %s OR f.flat_number ILIKE %s OR b.name ILIKE %s "
            "OR assignee.full_name ILIKE %s)"
        )
        params.extend([like] * 7)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    return db.execute(
        f"{_SELECT} {where} ORDER BY c.created_at DESC, c.complaint_id DESC", params
    ).fetchall()


def list_assignees(db: Connection) -> list[dict]:
    return db.execute(
        """SELECT user_id, full_name, role FROM users
           WHERE status = 'active' AND role IN ('admin', 'committee_member', 'security')
           ORDER BY full_name"""
    ).fetchall()


def _validate_resident_flat(db: Connection, resident_id: int, flat_id: int) -> None:
    match = db.execute(
        "SELECT 1 FROM residents WHERE resident_id = %s AND flat_id = %s AND status = 'active'",
        (resident_id, flat_id),
    ).fetchone()
    if not match:
        raise InvalidComplaintReferenceError(
            "Choose an active resident who belongs to the selected flat"
        )


def create_complaint(db: Connection, data: ComplaintCreate, changed_by: int) -> dict:
    resident_id, flat_id = data.resident_id, data.flat_id
    if resident_id is None or flat_id is None:
        raise InvalidComplaintReferenceError("A resident and flat are required")
    _validate_resident_flat(db, resident_id, flat_id)
    config = system_config(db)
    assignee = None
    if config.complaintAutoAssign:
        assignee = db.execute(
            """SELECT user_id, full_name FROM users
               WHERE status = 'active' AND role IN ('admin', 'committee_member')
               ORDER BY CASE role WHEN 'committee_member' THEN 0 ELSE 1 END, user_id
               LIMIT 1"""
        ).fetchone()
    initial_status = "assigned" if assignee else "open"
    row = db.execute(
        """
        INSERT INTO complaints
            (resident_id, flat_id, category, subject, description, status, priority, assigned_to)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING complaint_id
        """,
        (resident_id, flat_id, data.category, data.subject,
         data.description, initial_status, data.priority,
         assignee["user_id"] if assignee else None),
    ).fetchone()
    complaint_id = row["complaint_id"]
    db.execute(
        """INSERT INTO complaint_history
           (complaint_id, changed_by, old_status, new_status, note)
           VALUES (%s, %s, NULL, %s, %s)""",
        (complaint_id, changed_by, initial_status,
         f"Complaint submitted and automatically assigned to {assignee['full_name']}"
         if assignee else "Complaint submitted"),
    )
    if assignee:
        resident_user = db.execute(
            "SELECT user_id FROM residents WHERE resident_id = %s", (resident_id,)
        ).fetchone()
        notify_user(
            db, resident_user["user_id"] if resident_user else None, "complaint",
            "Complaint assigned", f"Complaint #{complaint_id} was assigned to {assignee['full_name']}.",
            complaint_id,
        )
    return _get_one(db, complaint_id)


def update_complaint(
    db: Connection, complaint_id: int, data: ComplaintUpdate
) -> dict:
    _get_one(db, complaint_id)
    values = data.model_dump(exclude_unset=True, exclude_none=True)
    if "resident_id" in values or "flat_id" in values:
        current = _get_one(db, complaint_id)
        _validate_resident_flat(
            db, values.get("resident_id", current["resident_id"]),
            values.get("flat_id", current["flat_id"]),
        )
    if values:
        clause = ", ".join(f"{field} = %s" for field in values)
        db.execute(
            f"UPDATE complaints SET {clause}, updated_at = now() WHERE complaint_id = %s",
            [*values.values(), complaint_id],
        )
    return _get_one(db, complaint_id)


def assign_complaint(
    db: Connection, complaint_id: int, assignee_id: int, changed_by: int
) -> dict:
    current = _get_one(db, complaint_id)
    user = db.execute(
        "SELECT full_name FROM users WHERE user_id = %s AND status = 'active'",
        (assignee_id,),
    ).fetchone()
    if user is None:
        raise InvalidAssigneeError("Select an active staff account")
    db.execute(
        "UPDATE complaints SET assigned_to = %s, status = 'assigned', updated_at = now() WHERE complaint_id = %s",
        (assignee_id, complaint_id),
    )
    db.execute(
        """INSERT INTO complaint_history
           (complaint_id, changed_by, old_status, new_status, note)
           VALUES (%s, %s, %s, 'assigned', %s)""",
        (complaint_id, changed_by, current["status"], f"Assigned to {user['full_name']}"),
    )
    resident_user = db.execute(
        "SELECT user_id FROM residents WHERE resident_id = %s", (current["resident_id"],)
    ).fetchone()
    notify_user(
        db, resident_user["user_id"] if resident_user else None, "complaint",
        "Complaint status updated",
        f"Complaint #{complaint_id} was assigned to {user['full_name']}.", complaint_id,
    )
    return _get_one(db, complaint_id)


def update_status(
    db: Connection, complaint_id: int, new_status: ComplaintStatus,
    note: str | None, changed_by: int,
) -> dict:
    current = _get_one(db, complaint_id)
    db.execute(
        """UPDATE complaints
           SET status = %s, updated_at = now(),
               resolved_at = CASE WHEN %s = 'resolved' THEN now() ELSE resolved_at END,
               closed_at = CASE WHEN %s = 'closed' THEN now() ELSE closed_at END
           WHERE complaint_id = %s""",
        (new_status, new_status, new_status, complaint_id),
    )
    db.execute(
        """INSERT INTO complaint_history
           (complaint_id, changed_by, old_status, new_status, note)
           VALUES (%s, %s, %s, %s, %s)""",
        (complaint_id, changed_by, current["status"], new_status, note),
    )
    resident_user = db.execute(
        "SELECT user_id FROM residents WHERE resident_id = %s", (current["resident_id"],)
    ).fetchone()
    notify_user(
        db, resident_user["user_id"] if resident_user else None, "complaint",
        "Complaint status updated",
        f"Complaint #{complaint_id} is now {new_status.replace('_', ' ')}."
        + (f" {note}" if note else ""), complaint_id,
    )
    return _get_one(db, complaint_id)


def delete_complaint(db: Connection, complaint_id: int) -> None:
    result = db.execute(
        "DELETE FROM complaints WHERE complaint_id = %s RETURNING complaint_id",
        (complaint_id,),
    ).fetchone()
    if result is None:
        raise ComplaintNotFoundError(f"Complaint {complaint_id} not found")


def resident_for_user(db: Connection, user_id: int) -> dict | None:
    return db.execute(
        """SELECT resident_id, flat_id FROM residents
           WHERE user_id = %s AND status = 'active'
           ORDER BY is_primary_contact DESC, resident_id LIMIT 1""",
        (user_id,),
    ).fetchone()


def list_history(db: Connection, complaint_id: int) -> list[dict]:
    _get_one(db, complaint_id)
    return db.execute(
        """SELECT h.history_id, h.changed_by, u.full_name AS changed_by_name,
                  h.old_status, h.new_status, h.note, h.created_at
           FROM complaint_history h JOIN users u ON u.user_id = h.changed_by
           WHERE h.complaint_id = %s
           ORDER BY h.created_at DESC, h.history_id DESC""",
        (complaint_id,),
    ).fetchall()
