import json

from psycopg import Connection

from server.schemas.settings import PreferenceSettings, SocietySettings, SystemSettings


DEFAULT_SYSTEM = SystemSettings()
DEFAULT_PREFERENCES = PreferenceSettings()
ROLE_DEFINITIONS = [
    {"id": "admin", "name": "Administrator", "permissions": ["all"]},
    {"id": "committee_member", "name": "Committee Member", "permissions": [
        "manage_residents", "manage_flats", "manage_visitors", "manage_complaints",
        "submit_complaints", "manage_notices", "view_notices", "manage_maintenance",
        "view_maintenance", "view_notifications",
    ]},
    {"id": "security", "name": "Security", "permissions": ["manage_visitors", "view_notifications"]},
    {"id": "resident", "name": "Resident", "permissions": [
        "view_notices", "submit_complaints", "view_maintenance", "view_notifications",
    ]},
]


def _load_json_setting(db: Connection, key: str, default: dict) -> dict:
    row = db.execute(
        "SELECT setting_value FROM settings WHERE setting_key = %s", (key,)
    ).fetchone()
    if not row or not row["setting_value"]:
        return default
    try:
        value = json.loads(row["setting_value"])
        return value if isinstance(value, dict) else default
    except (TypeError, json.JSONDecodeError):
        return default


def _save_json_setting(db: Connection, key: str, value: dict, updated_by: int, description: str) -> None:
    db.execute(
        """INSERT INTO settings (setting_key, setting_value, description, updated_by)
           VALUES (%s, %s, %s, %s)
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value,
             description = EXCLUDED.description, updated_by = EXCLUDED.updated_by,
             updated_at = now()""",
        (key, json.dumps(value), description, updated_by),
    )


def _get_society(db: Connection) -> SocietySettings:
    row = db.execute(
        """SELECT name, address_line1, contact_phone, contact_email, registration_number
           FROM society ORDER BY society_id LIMIT 1"""
    ).fetchone()
    extra = _load_json_setting(db, "society_extra", {})
    return SocietySettings(
        name=(row["name"] if row else "") or "",
        address=(row["address_line1"] if row else "") or "",
        phone=(row["contact_phone"] if row else "") or "",
        email=(row["contact_email"] if row else "") or "",
        registrationNumber=(row["registration_number"] if row else "") or "",
        **{key: extra.get(key, "") for key in ("website", "bankName", "accountNumber", "ifscCode")},
    )


def get_settings(db: Connection) -> dict:
    system = {**DEFAULT_SYSTEM.model_dump(), **_load_json_setting(db, "system_config", {})}
    preferences = {**DEFAULT_PREFERENCES.model_dump(), **_load_json_setting(db, "application_preferences", {})}
    return {
        "society": _get_society(db),
        "system": SystemSettings(**system),
        "preferences": PreferenceSettings(**preferences),
        "roles": ROLE_DEFINITIONS,
    }


def update_society(db: Connection, data: SocietySettings, updated_by: int) -> SocietySettings:
    values = data.model_dump()
    existing = db.execute("SELECT society_id FROM society ORDER BY society_id LIMIT 1").fetchone()
    sql_values = (
        values["name"].strip() or "Society",
        values["registrationNumber"].strip() or None,
        values["address"].strip() or None,
        values["email"].strip() or None,
        values["phone"].strip() or None,
    )
    if existing:
        db.execute(
            """UPDATE society SET name = %s, registration_number = %s,
               address_line1 = %s, contact_email = %s, contact_phone = %s,
               updated_at = now() WHERE society_id = %s""",
            (*sql_values, existing["society_id"]),
        )
    else:
        db.execute(
            """INSERT INTO society (name, registration_number, address_line1, contact_email, contact_phone)
               VALUES (%s, %s, %s, %s, %s)""",
            sql_values,
        )
    extra = {key: values[key] for key in ("website", "bankName", "accountNumber", "ifscCode")}
    _save_json_setting(db, "society_extra", extra, updated_by, "Additional society contact and bank details")
    return _get_society(db)


def update_system(db: Connection, data: SystemSettings, updated_by: int) -> SystemSettings:
    value = data.model_dump()
    _save_json_setting(db, "system_config", value, updated_by, "Supported application behavior settings")
    return SystemSettings(**value)


def update_preferences(db: Connection, data: PreferenceSettings, updated_by: int) -> PreferenceSettings:
    value = data.model_dump()
    _save_json_setting(db, "application_preferences", value, updated_by, "Application display preferences")
    return PreferenceSettings(**value)


def system_config(db: Connection) -> SystemSettings:
    return SystemSettings(**{**DEFAULT_SYSTEM.model_dump(), **_load_json_setting(db, "system_config", {})})
