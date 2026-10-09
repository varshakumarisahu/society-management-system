from fastapi import APIRouter, Depends
from psycopg import Connection

from server.api.dependencies import require_role
from server.db.database import get_db
from server.schemas.auth import UserOut
from server.schemas.settings import (
    PreferenceSettings, SettingsResponse, SocietySettings, SystemSettings,
)
from server.services import settings_service


settings_router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])


@settings_router.get("", response_model=SettingsResponse)
def get_settings(
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin")),
):
    return settings_service.get_settings(db)


@settings_router.patch("/society", response_model=SocietySettings)
def update_society_settings(
    body: SocietySettings,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin")),
):
    return settings_service.update_society(db, body, current_user.user_id)


@settings_router.patch("/system", response_model=SystemSettings)
def update_system_settings(
    body: SystemSettings,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin")),
):
    return settings_service.update_system(db, body, current_user.user_id)


@settings_router.patch("/preferences", response_model=PreferenceSettings)
def update_preferences(
    body: PreferenceSettings,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin")),
):
    return settings_service.update_preferences(db, body, current_user.user_id)
