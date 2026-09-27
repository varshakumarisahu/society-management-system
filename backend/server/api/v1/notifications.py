from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg import Connection

from server.api.dependencies import get_current_user, require_role
from server.db.database import get_db
from server.schemas.auth import UserOut
from server.schemas.notification import (
    AnnouncementCreate, AnnouncementResult, NotificationOut,
)
from server.services import notification_service


notifications_router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@notifications_router.get("", response_model=list[NotificationOut])
def get_notifications(
    notification_type: Literal["notice", "complaint", "maintenance", "visitor", "system"] | None = Query(None, alias="type"),
    unread_only: bool = False,
    limit: int = Query(100, ge=1, le=200),
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    return notification_service.list_notifications(
        db, current_user.user_id, notification_type, unread_only, limit
    )


@notifications_router.get("/unread-count")
def get_unread_count(
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    return {"count": notification_service.unread_count(db, current_user.user_id)}


@notifications_router.patch("/read-all")
def mark_all_read(
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    return {"updated": notification_service.mark_all_read(db, current_user.user_id)}


@notifications_router.delete("/read")
def clear_read_notifications(
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    return {"deleted": notification_service.clear_read(db, current_user.user_id)}


@notifications_router.post("/announcements", response_model=AnnouncementResult, status_code=status.HTTP_201_CREATED)
def create_announcement(
    body: AnnouncementCreate,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin")),
):
    return {"sent": notification_service.broadcast_announcement(db, body)}


@notifications_router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if not notification_service.mark_read(db, current_user.user_id, notification_id):
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"updated": True}


@notifications_router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_notification(
    notification_id: int,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    if not notification_service.delete_notification(db, current_user.user_id, notification_id):
        raise HTTPException(status_code=404, detail="Notification not found")
