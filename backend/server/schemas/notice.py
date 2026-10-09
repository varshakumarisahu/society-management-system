from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NoticeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1)
    valid_until: datetime | None = None


class NoticeUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = Field(default=None, min_length=1)
    valid_until: datetime | None = None
    is_active: bool | None = None
    is_archived: bool | None = None


class NoticeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    notice_id: int
    title: str
    content: str
    posted_by: int
    posted_by_name: str
    valid_from: datetime
    valid_until: datetime | None
    is_active: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime
