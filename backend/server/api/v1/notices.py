from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg import Connection

from server.api.dependencies import get_current_user, require_role
from server.db.database import get_db
from server.schemas.auth import UserOut
from server.schemas.notice import NoticeCreate, NoticeOut, NoticeUpdate
from server.services import notice_service


notices_router = APIRouter(prefix="/api/v1/notices", tags=["Notice Board"])


@notices_router.get("", response_model=list[NoticeOut])
def get_notices(
    include_archived: bool = Query(False),
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if current_user.role not in ("admin", "committee_member", "resident"):
        raise HTTPException(status_code=403, detail="You do not have permission to view notices")
    if include_archived and current_user.role not in ("admin", "committee_member"):
        raise HTTPException(status_code=403, detail="Only administrators can view archived notices")
    return notice_service.list_notices(db, include_archived)


@notices_router.post("", response_model=NoticeOut, status_code=status.HTTP_201_CREATED)
def create_notice(
    body: NoticeCreate,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin")),
):
    return notice_service.create_notice(db, body, current_user.user_id)


@notices_router.patch("/{notice_id}", response_model=NoticeOut)
def update_notice(
    notice_id: int,
    body: NoticeUpdate,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin")),
):
    try:
        return notice_service.update_notice(db, notice_id, body)
    except notice_service.NoticeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@notices_router.delete("/{notice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notice(
    notice_id: int,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin")),
):
    try:
        notice_service.delete_notice(db, notice_id)
    except notice_service.NoticeNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
