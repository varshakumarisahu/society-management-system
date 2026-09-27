from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg import Connection
from server.api.dependencies import require_role
from server.db.database import get_db
from server.schemas.auth import UserOut
from server.schemas.resident import ResidentAccountCreate, ResidentCreate, ResidentUpdate, ResidentResponse
from server.services import resident_service
from server.core.security import hash_password
import psycopg

resident_router = APIRouter(prefix="/residents", tags=["Residents"])

@resident_router.post("/{resident_id}/account", response_model=ResidentResponse, status_code=201)
def create_resident_login(
    resident_id: int,
    body: ResidentAccountCreate,
    conn: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin")),
):
    """Create a resident-role login and securely link it to a resident record."""
    resident = resident_service.get_resident_by_id(conn, resident_id)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    if resident["status"] != "active":
        raise HTTPException(status_code=400, detail="Only active residents can receive a login")
    if resident.get("user_id"):
        raise HTTPException(status_code=409, detail="This resident already has a linked login")
    if not resident.get("email"):
        raise HTTPException(status_code=400, detail="Add an email address to the resident before creating a login")

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """INSERT INTO users (username, email, password_hash, full_name, phone, role, status)
                   VALUES (%s, %s, %s, %s, %s, 'resident', 'active') RETURNING user_id""",
                (body.username, resident["email"], hash_password(body.password), resident["full_name"], resident["phone"]),
            )
            user_id = cursor.fetchone()["user_id"]
            cursor.execute(
                "UPDATE residents SET user_id = %s, updated_at = NOW() WHERE resident_id = %s",
                (user_id, resident_id),
            )
    except psycopg.errors.UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="That username or email is already used by another account") from exc

    return resident_service.get_resident_by_id(conn, resident_id)

@resident_router.get("/", response_model=list[ResidentResponse])
def list_residents(
    conn: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member")),
    status: str = Query(None, description="Filter by status: active, inactive, moved_out"),
    flat_id: int = Query(None, description="Filter by flat ID"),
    search: str = Query(None, description="Search by name, email, or phone")
):
    return resident_service.get_residents(conn, status, flat_id, search)

@resident_router.get("/{resident_id}", response_model=ResidentResponse)
def get_resident(
    resident_id: int,
    conn: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member")),
):
    resident = resident_service.get_resident_by_id(conn, resident_id)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    return resident

@resident_router.post("/", response_model=ResidentResponse, status_code=201)
def register_resident(
    resident_data: ResidentCreate,
    conn: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member")),
):
    try:
        return resident_service.create_resident(conn, resident_data)
    except psycopg.errors.ForeignKeyViolation:
        raise HTTPException(status_code=400, detail="Invalid flat_id. Flat does not exist.")
    except psycopg.errors.CheckViolation as e:
        raise HTTPException(status_code=400, detail=f"Invalid data provided (e.g., wrong resident_type or status). {str(e)}")

@resident_router.patch("/{resident_id}", response_model=ResidentResponse)
def edit_resident(
    resident_id: int,
    resident_data: ResidentUpdate,
    conn: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member")),
):
    resident = resident_service.update_resident(conn, resident_id, resident_data)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    return resident

@resident_router.patch("/{resident_id}/deactivate", response_model=ResidentResponse)
def toggle_deactivate_resident(
    resident_id: int,
    conn: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member")),
):
    """Maps to the Pause/Play icon in your UI table actions"""
    resident = resident_service.deactivate_resident(conn, resident_id)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    return resident

@resident_router.delete("/{resident_id}", status_code=204)
def remove_resident(
    resident_id: int,
    conn: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member")),
):
    """Maps to the Trash icon in your UI table actions"""
    success = resident_service.delete_resident(conn, resident_id)
    if not success:
        raise HTTPException(status_code=404, detail="Resident not found")
