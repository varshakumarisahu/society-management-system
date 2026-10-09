from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg import Connection

from server.api.dependencies import get_current_user, require_role
from server.db.database import get_db
from server.schemas.auth import UserOut
from server.schemas.complaint import (
    AssigneeOut, ComplaintAssign, ComplaintCreate, ComplaintHistoryOut, ComplaintOut,
    ComplaintStatusUpdate, ComplaintUpdate,
)
from server.services import complaint_service


complaints_router = APIRouter(prefix="/api/v1/complaints", tags=["Complaints"])


def _raise_service_error(error: Exception) -> None:
    if isinstance(error, complaint_service.ComplaintNotFoundError):
        raise HTTPException(status_code=404, detail=str(error))
    if isinstance(error, complaint_service.InvalidAssigneeError):
        raise HTTPException(status_code=400, detail=str(error))
    if isinstance(error, complaint_service.InvalidComplaintReferenceError):
        raise HTTPException(status_code=400, detail=str(error))
    raise error


@complaints_router.get("/assignees", response_model=list[AssigneeOut])
def get_assignees(
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member")),
):
    return complaint_service.list_assignees(db)


@complaints_router.get("", response_model=list[ComplaintOut])
def get_complaints(
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = None,
    search: str | None = None,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if current_user.role not in ("resident", "admin", "committee_member"):
        raise HTTPException(status_code=403, detail="You do not have permission to view complaints")
    return complaint_service.list_complaints(
        db, status_filter, priority, search,
        resident_user_id=current_user.user_id if current_user.role == "resident" else None,
    )


@complaints_router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def submit_complaint(
    body: ComplaintCreate,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        if current_user.role == "resident":
            linked_resident = complaint_service.resident_for_user(db, current_user.user_id)
            if linked_resident is None:
                raise HTTPException(status_code=403, detail="Your account is not linked to an active resident profile")
            body.resident_id = linked_resident["resident_id"]
            body.flat_id = linked_resident["flat_id"]
        elif current_user.role not in ("admin", "committee_member"):
            raise HTTPException(status_code=403, detail="You do not have permission to submit complaints")
        return complaint_service.create_complaint(db, body, current_user.user_id)
    except (complaint_service.InvalidComplaintReferenceError,):
        raise HTTPException(status_code=400, detail="Choose an active resident assigned to the selected flat")


@complaints_router.patch("/{complaint_id}", response_model=ComplaintOut)
def edit_complaint(
    complaint_id: int,
    body: ComplaintUpdate,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member")),
):
    try:
        return complaint_service.update_complaint(db, complaint_id, body)
    except (complaint_service.ComplaintNotFoundError, complaint_service.InvalidComplaintReferenceError) as exc:
        _raise_service_error(exc)


@complaints_router.patch("/{complaint_id}/assign", response_model=ComplaintOut)
def assign_complaint(
    complaint_id: int,
    body: ComplaintAssign,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member")),
):
    try:
        return complaint_service.assign_complaint(db, complaint_id, body.assignee_id, current_user.user_id)
    except (complaint_service.ComplaintNotFoundError, complaint_service.InvalidAssigneeError) as exc:
        _raise_service_error(exc)


@complaints_router.patch("/{complaint_id}/status", response_model=ComplaintOut)
def change_complaint_status(
    complaint_id: int,
    body: ComplaintStatusUpdate,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member")),
):
    try:
        return complaint_service.update_status(
            db, complaint_id, body.status, body.note, current_user.user_id
        )
    except complaint_service.ComplaintNotFoundError as exc:
        _raise_service_error(exc)


@complaints_router.get("/{complaint_id}/history", response_model=list[ComplaintHistoryOut])
def get_complaint_history(
    complaint_id: int,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    try:
        complaint = complaint_service._get_one(db, complaint_id)
        if current_user.role == "resident" and complaint["resident_id"] != (complaint_service.resident_for_user(db, current_user.user_id) or {}).get("resident_id"):
            raise HTTPException(status_code=403, detail="You can only view history for your own complaints")
        if current_user.role not in ("resident", "admin", "committee_member"):
            raise HTTPException(status_code=403, detail="You do not have permission to view complaint history")
        return complaint_service.list_history(db, complaint_id)
    except complaint_service.ComplaintNotFoundError as exc:
        _raise_service_error(exc)
