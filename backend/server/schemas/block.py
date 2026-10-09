"""
Pydantic schemas for Blocks (read-only for now, used to populate the
Block dropdown on the Add/Edit Flat form).
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BlockOut(BaseModel):
    """Block representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    block_id: int
    name: str
    description: str | None = None
    total_floors: int | None = None
    total_flats: int
    created_at: datetime
    updated_at: datetime