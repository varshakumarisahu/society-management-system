from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class VisitorHostResponse(BaseModel):
    resident_id: int
    full_name: str
    flat_id: int
    flat_number: str
    block_name: str

class VisitorCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    purpose: Optional[str] = None
    vehicle_number: Optional[str] = None
    flat_id: Optional[int] = None  # Which flat are they visiting?
    host_resident_id: Optional[int] = None  # Who are they visiting specifically?
    registered_by: Optional[int] = None  # The API sets this from the authenticated user.
    check_in_time: Optional[datetime] = None 
    status: Optional[str] = "checked_in" 
    remarks: Optional[str] = None

class VisitorResponse(BaseModel):
    visitor_id: int
    name: str
    phone: Optional[str]
    purpose: Optional[str]
    vehicle_number: Optional[str]
    flat_id: Optional[int]
    host_resident_id: Optional[int]
    registered_by: int
    check_in_time: datetime
    check_out_time: Optional[datetime]
    status: str  # 'checked_in', 'checked_out', 'denied'
    remarks: Optional[str]
    
    # Computed fields for easy frontend display
    flat_identifier: Optional[str] = None
    host_name: Optional[str] = None

    class Config:
        from_attributes = True
