from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


ComplaintStatus = Literal["open", "assigned", "in_progress", "resolved", "closed", "reopened"]
ComplaintPriority = Literal["low", "medium", "high", "urgent"]


class ComplaintCreate(BaseModel):
    subject: str
    description: str | None = None
    category: str | None = None
    status: ComplaintStatus = "open"
    priority: ComplaintPriority = "medium"
    resident_id: int | None = None
    flat_id: int | None = None


class ComplaintUpdate(BaseModel):
    subject: str | None = None
    description: str | None = None
    category: str | None = None
    priority: ComplaintPriority | None = None
    resident_id: int | None = None
    flat_id: int | None = None


class ComplaintAssign(BaseModel):
    assignee_id: int


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus
    note: str | None = None


class ComplaintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    complaint_id: int
    subject: str
    description: str | None
    category: str | None
    status: ComplaintStatus
    priority: ComplaintPriority
    resident_id: int
    resident_name: str
    flat_id: int
    flat_number: str
    block_name: str
    assigned_to: int | None
    assigned_to_name: str | None
    resolution_notes: str | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
    closed_at: datetime | None


class AssigneeOut(BaseModel):
    user_id: int
    full_name: str
    role: str


class ComplaintHistoryOut(BaseModel):
    history_id: int
    changed_by: int
    changed_by_name: str
    old_status: ComplaintStatus | None
    new_status: ComplaintStatus
    note: str | None
    created_at: datetime
