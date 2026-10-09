from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class ResidentCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    flat_id: int  # Frontend sends the flat_id selected from dropdown
    resident_type: str  # 'owner', 'tenant', 'family_member'
    status: str = 'active'  # 'active', 'inactive', 'moved_out'
    occupation: Optional[str] = None
    family_members_count: Optional[int] = 0
    move_in_date: Optional[date] = date.today()
    is_primary_contact: bool = False

class ResidentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    flat_id: Optional[int] = None
    resident_type: Optional[str] = None
    status: Optional[str] = None
    occupation: Optional[str] = None
    family_members_count: Optional[int] = None
    is_primary_contact: Optional[bool] = None

class ResidentAccountCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=72)

class ResidentResponse(BaseModel):
    resident_id: int
    user_id: Optional[int] = None
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    flat_id: Optional[int]
    resident_type: str
    status: str
    is_primary_contact: bool = False
    occupation: Optional[str]
    # We will inject this formatted string in the service layer for the UI table
    flat_identifier: Optional[str] = None 
    block_name: Optional[str] = None
    flat_number: Optional[str] = None

    class Config:
        from_attributes = True
