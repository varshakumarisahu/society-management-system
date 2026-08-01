"""
Flat Management API endpoints.

This file only wires HTTP <-> service layer. No SQL here --
see server/services/flat_service.py for that.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg import Connection

from server.api.dependencies import get_current_user
from server.db.database import get_db
from server.schemas.auth import UserOut
from server.schemas.flat import (
    FlatCreate,
    FlatListResponse,
    FlatResponse,
    FlatUpdate,
    OccupancyStatus,
)
from server.services import flat_service

flats_router = APIRouter(prefix="/api/v1/flats", tags=["Flats"])


@flats_router.post("", response_model=FlatResponse, status_code=status.HTTP_201_CREATED)
def create_flat(
    body: FlatCreate,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
) -> FlatResponse:
    """
    Create a new flat.
    """
    try:
        flat = flat_service.create_flat(db, body)
    except flat_service.InvalidBlockError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except flat_service.DuplicateFlatError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    return FlatResponse(**flat)


@flats_router.get("", response_model=FlatListResponse)
def get_flats(
    search: str | None = Query(
        None, description="Search by flat number, block name, or owner name"
    ),
    status_filter: OccupancyStatus | None = Query(None, alias="status"),
    block_id: int | None = Query(None),
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
) -> FlatListResponse:
    """
    List flats. Supports:
      GET /api/v1/flats
      GET /api/v1/flats?search=A-101
      GET /api/v1/flats?status=occupied
      GET /api/v1/flats?block_id=1
    (filters can be combined)
    """
    rows = flat_service.get_all_flats(
        db, search=search, occupancy_status=status_filter, block_id=block_id
    )
    return FlatListResponse(total=len(rows), items=[FlatResponse(**row) for row in rows])


@flats_router.get("/{flat_id}", response_model=FlatResponse)
def get_flat(
    flat_id: int,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
) -> FlatResponse:
    """
    Fetch a single flat by ID.
    """
    try:
        flat = flat_service.get_flat(db, flat_id)
    except flat_service.FlatNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    return FlatResponse(**flat)


@flats_router.put("/{flat_id}", response_model=FlatResponse)
def update_flat(
    flat_id: int,
    body: FlatUpdate,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
) -> FlatResponse:
    """
    Update an existing flat. Only the fields supplied in the body are changed.
    Used for both the edit form and the quick occupy/vacate toggle.
    """
    try:
        flat = flat_service.update_flat(db, flat_id, body)
    except flat_service.FlatNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except flat_service.InvalidBlockError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except flat_service.DuplicateFlatError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    return FlatResponse(**flat)


@flats_router.delete("/{flat_id}", status_code=status.HTTP_200_OK)
def delete_flat(
    flat_id: int,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
) -> dict[str, str]:
    """
    Delete a flat.
    """
    try:
        flat_service.delete_flat(db, flat_id)
    except flat_service.FlatNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    return {"message": "Flat deleted successfully"}