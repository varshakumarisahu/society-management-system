from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


NotificationType = Literal["notice", "complaint", "maintenance", "visitor", "system"]


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    notification_id: int
    user_id: int
    type: NotificationType
    title: str
    message: str | None
    reference_id: int | None
    is_read: bool
    created_at: datetime


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)


class AnnouncementResult(BaseModel):
    sent: int
