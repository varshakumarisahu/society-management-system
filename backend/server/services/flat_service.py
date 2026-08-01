"""
Flat Management service layer.

Every SQL query for the Flats feature lives here. The API layer
(`api/v1/flats.py`) never talks to the database directly -- it calls
these functions and gets back plain dicts (thanks to psycopg's
dict_row factory configured in db/database.py).
"""

from psycopg import Connection
from psycopg.errors import ForeignKeyViolation, UniqueViolation

from server.schemas.flat import FlatCreate, FlatUpdate, OccupancyStatus


class FlatNotFoundError(Exception):
    """Raised when a flat_id doesn't exist."""


class DuplicateFlatError(Exception):
    """Raised when flat_number already exists in that block."""


class InvalidBlockError(Exception):
    """Raised when block_id doesn't exist."""


#: Base SELECT used by every read path so the shape returned is always
#: consistent, whether it's a single flat or the whole list.
_FLAT_SELECT = """
    SELECT
        f.flat_id,
        f.block_id,
        b.name AS block_name,
        f.flat_number,
        f.floor,
        f.flat_type,
        f.area_sqft,
        f.parking_slot,
        f.occupancy_status,
        owner.full_name AS owner_name,
        COALESCE(rc.residents_count, 0) AS residents_count,
        f.created_at,
        f.updated_at
    FROM flats f
    JOIN blocks b ON b.block_id = f.block_id
    LEFT JOIN LATERAL (
        SELECT full_name
        FROM residents r
        WHERE r.flat_id = f.flat_id
          AND r.status = 'active'
          AND r.resident_type = 'owner'
        ORDER BY r.is_primary_contact DESC, r.created_at ASC
        LIMIT 1
    ) owner ON true
    LEFT JOIN (
        SELECT flat_id, COUNT(*) AS residents_count
        FROM residents
        WHERE status = 'active'
        GROUP BY flat_id
    ) rc ON rc.flat_id = f.flat_id
"""


def create_flat(db: Connection, data: FlatCreate) -> dict:
    """
    Insert a new flat and return the full enriched row.

    Raises:
        InvalidBlockError: if data.block_id doesn't exist.
        DuplicateFlatError: if flat_number already exists in that block.
    """
    with db.cursor() as cursor:
        try:
            cursor.execute(
                """
                INSERT INTO flats
                    (block_id, flat_number, floor, flat_type, area_sqft,
                     parking_slot, occupancy_status)
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s)
                RETURNING flat_id
                """,
                (
                    data.block_id,
                    data.flat_number,
                    data.floor,
                    data.flat_type,
                    data.area_sqft,
                    data.parking_slot,
                    data.occupancy_status.value,
                ),
            )
        except ForeignKeyViolation as exc:
            raise InvalidBlockError(f"Block {data.block_id} does not exist") from exc
        except UniqueViolation as exc:
            raise DuplicateFlatError(
                f"Flat '{data.flat_number}' already exists in this block"
            ) from exc

        new_id = cursor.fetchone()["flat_id"]

    return get_flat(db, new_id)


def get_all_flats(
    db: Connection,
    search: str | None = None,
    occupancy_status: OccupancyStatus | None = None,
    block_id: int | None = None,
) -> list[dict]:
    """
    List flats, optionally filtered by free-text search, status, or block.

    `search` matches against flat number, block name, or owner name --
    this covers both `?search=A-101` and `?status=occupied` from the
    same endpoint, so there's no need for a separate search function.
    """
    conditions: list[str] = []
    params: list = []

    if search:
        conditions.append(
            "(f.flat_number ILIKE %s OR b.name ILIKE %s OR owner.full_name ILIKE %s)"
        )
        like_term = f"%{search}%"
        params.extend([like_term, like_term, like_term])

    if occupancy_status:
        conditions.append("f.occupancy_status = %s")
        params.append(occupancy_status.value)

    if block_id:
        conditions.append("f.block_id = %s")
        params.append(block_id)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with db.cursor() as cursor:
        cursor.execute(
            f"{_FLAT_SELECT} {where_clause} ORDER BY b.name, f.flat_number",
            params,
        )
        return cursor.fetchall()


def get_flat(db: Connection, flat_id: int) -> dict:
    """
    Fetch a single enriched flat row by ID.

    Raises:
        FlatNotFoundError: if flat_id doesn't exist.
    """
    with db.cursor() as cursor:
        cursor.execute(f"{_FLAT_SELECT} WHERE f.flat_id = %s", (flat_id,))
        flat = cursor.fetchone()

    if flat is None:
        raise FlatNotFoundError(f"Flat {flat_id} not found")

    return flat


def update_flat(db: Connection, flat_id: int, data: FlatUpdate) -> dict:
    """
    Update only the fields supplied in `data`, then return the full row.

    Raises:
        FlatNotFoundError: if flat_id doesn't exist.
        InvalidBlockError: if a new block_id doesn't exist.
        DuplicateFlatError: if the new flat_number collides in that block.
    """
    updates = data.model_dump(exclude_unset=True)

    if not updates:
        # Nothing to change -- just return the current row.
        return get_flat(db, flat_id)

    if "occupancy_status" in updates and isinstance(
        updates["occupancy_status"], OccupancyStatus
    ):
        updates["occupancy_status"] = updates["occupancy_status"].value

    set_clause = ", ".join(f"{field} = %s" for field in updates)
    params = [*updates.values(), flat_id]

    with db.cursor() as cursor:
        try:
            cursor.execute(
                f"""
                UPDATE flats
                SET {set_clause}, updated_at = now()
                WHERE flat_id = %s
                RETURNING flat_id
                """,
                params,
            )
        except ForeignKeyViolation as exc:
            raise InvalidBlockError("Target block does not exist") from exc
        except UniqueViolation as exc:
            raise DuplicateFlatError(
                "Flat number already in use for this block"
            ) from exc

        updated = cursor.fetchone()

    if updated is None:
        raise FlatNotFoundError(f"Flat {flat_id} not found")

    return get_flat(db, flat_id)


def delete_flat(db: Connection, flat_id: int) -> None:
    """
    Delete a flat.

    Raises:
        FlatNotFoundError: if flat_id doesn't exist.
    """
    with db.cursor() as cursor:
        cursor.execute(
            "DELETE FROM flats WHERE flat_id = %s RETURNING flat_id", (flat_id,)
        )
        deleted = cursor.fetchone()

    if deleted is None:
        raise FlatNotFoundError(f"Flat {flat_id} not found")