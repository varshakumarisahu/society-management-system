"""
Pydantic schemas for the Flats feature.

Only request/response shapes live here. No database logic.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class OccupancyStatus(str, Enum):
    """Occupancy status of a flat, matching the flats.occupancy_status CHECK constraint."""

    OCCUPIED = "occupied"
    VACANT = "vacant"
    RENTED = "rented"


class FlatCreate(BaseModel):
    """Payload for creating a new flat (POST /api/v1/flats)."""

    block_id: int
    flat_number: str = Field(..., max_length=20, examples=["A-101"])
    floor: int | None = Field(None, ge=0)
    flat_type: str | None = Field(None, max_length=20, examples=["2BHK"])
    area_sqft: float | None = Field(None, gt=0, examples=[1200])
    parking_slot: str | None = Field(None, max_length=20, examples=["P-1"])
    occupancy_status: OccupancyStatus = OccupancyStatus.VACANT


class FlatUpdate(BaseModel):
    """
    Payload for updating an existing flat (PUT /api/v1/flats/{id}).

    All fields are optional; only the ones supplied are changed.
    """

    block_id: int | None = None
    flat_number: str | None = Field(None, max_length=20)
    floor: int | None = Field(None, ge=0)
    flat_type: str | None = Field(None, max_length=20)
    area_sqft: float | None = Field(None, gt=0)
    parking_slot: str | None = Field(None, max_length=20)
    occupancy_status: OccupancyStatus | None = None


class FlatResponse(BaseModel):
    """
    Flat representation returned by the API.

    `block_name`, `owner_name`, and `residents_count` are not columns on
    `flats` -- the service layer computes them by joining `blocks` and
    `residents` when it builds this response.
    """

    model_config = ConfigDict(from_attributes=True)

    flat_id: int
    block_id: int
    block_name: str
    flat_number: str
    floor: int | None
    flat_type: str | None
    area_sqft: float | None
    parking_slot: str | None
    occupancy_status: OccupancyStatus
    owner_name: str | None = None
    residents_count: int = 0
    created_at: datetime
    updated_at: datetime


class FlatListResponse(BaseModel):
    """Response for GET /api/v1/flats."""

    total: int
    items: list[FlatResponse]