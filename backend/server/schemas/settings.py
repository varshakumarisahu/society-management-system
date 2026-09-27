from typing import Literal

from pydantic import BaseModel, Field


class SocietySettings(BaseModel):
    name: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""
    website: str = ""
    registrationNumber: str = ""
    bankName: str = ""
    accountNumber: str = ""
    ifscCode: str = ""


class SystemSettings(BaseModel):
    enableNotifications: bool = True
    maxVisitorsPerDay: int = Field(default=10, ge=0, le=10000)
    complaintAutoAssign: bool = False


class PreferenceSettings(BaseModel):
    theme: Literal["light", "dark"] = "light"
    language: Literal["en", "hi", "mr", "gu"] = "en"
    dateFormat: Literal["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] = "DD/MM/YYYY"
    timezone: Literal["Asia/Kolkata", "Asia/Dubai", "America/New_York"] = "Asia/Kolkata"
    currencySymbol: str = "₹"
    defaultDashboard: Literal["dashboard"] = "dashboard"


class SettingsResponse(BaseModel):
    society: SocietySettings
    system: SystemSettings
    preferences: PreferenceSettings
    roles: list[dict]
