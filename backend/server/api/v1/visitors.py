from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg import Connection
from server.api.dependencies import require_role
from server.db.database import get_db
from server.schemas.auth import UserOut
from server.schemas.visitor import VisitorCreate, VisitorHostResponse, VisitorResponse
from server.services import visitor_service
import psycopg

visitor_router = APIRouter(prefix="/visitors", tags=["Visitors"])

@visitor_router.get("/", response_model=list[VisitorResponse])
def list_visitors(
    conn: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member", "security")),
    status: str = Query(None, description="Filter by status: checked_in, checked_out, denied"),
    flat_id: int = Query(None, description="Filter visitors for a specific flat"),
    search: str = Query(None, description="Search by visitor name, phone, or vehicle number")
):
    """
    Maintains visitor history. Returns latest visitors first.
    """
    return visitor_service.get_visitors(conn, status, flat_id, search)

@visitor_router.get("/hosts", response_model=list[VisitorHostResponse])
def list_visitor_hosts(
    conn: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member", "security")),
):
    """List active resident/flat pairs needed to register a visitor."""
    return visitor_service.get_visitor_hosts(conn)

@visitor_router.post("/", response_model=VisitorResponse, status_code=201)
def register_visitor(
    visitor_data: VisitorCreate,
    conn: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member", "security")),
):
    """
    Security personnel registers a new visitor.
    This action automatically checks them IN (sets status to 'checked_in' and logs time).
    """
    try:
        visitor_data.registered_by = current_user.user_id
        return visitor_service.register_visitor(conn, visitor_data)
    except visitor_service.DailyVisitorLimitError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except psycopg.errors.ForeignKeyViolation:
        raise HTTPException(
            status_code=400, 
            detail="Invalid flat_id, host_resident_id, or registered_by. Entity does not exist."
        )

@visitor_router.patch("/{visitor_id}/check-out", response_model=VisitorResponse)
def check_out_visitor(
    visitor_id: int,
    conn: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member", "security")),
):
    """
    Records visitor check-out. 
    Fails if visitor is already checked out or denied.
    """
    visitor = visitor_service.check_out_visitor(conn, visitor_id)
    if not visitor:
        raise HTTPException(status_code=400, detail="Visitor is not currently checked in or does not exist.")
    return visitor

@visitor_router.patch("/{visitor_id}/deny", response_model=VisitorResponse)
def deny_visitor(
    visitor_id: int,
    conn: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member", "security")),
):
    """
    Deny entry to a visitor who was expected/registered.
    """
    visitor = visitor_service.deny_visitor(conn, visitor_id)
    if not visitor:
        raise HTTPException(status_code=400, detail="Cannot deny visitor. They may not be checked in.")
    return visitor
