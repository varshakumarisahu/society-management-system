"""
Blocks API endpoints.

Read-only for now -- just enough to populate the Block dropdown on the
Add/Edit Flat form. Full block management (create/rename/etc.) can be
added later if needed.
"""

from fastapi import APIRouter, Depends
from psycopg import Connection

from server.api.dependencies import get_current_user
from server.db.database import get_db
from server.schemas.auth import UserOut
from server.schemas.block import BlockOut

blocks_router = APIRouter(prefix="/api/v1/blocks", tags=["Blocks"])


@blocks_router.get("", response_model=list[BlockOut])
def list_blocks(
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
) -> list[BlockOut]:
    """
    List all blocks, ordered by name.
    """
    with db.cursor() as cursor:
        cursor.execute("SELECT * FROM blocks ORDER BY name")
        rows = cursor.fetchall()

    return [BlockOut(**row) for row in rows]