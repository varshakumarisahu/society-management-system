from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg import Connection

from server.api.dependencies import get_current_user, require_role
from server.db.database import get_db
from server.schemas.auth import UserOut
from server.schemas.maintenance import (
    BillGenerate, BillGenerationResult, BillOut, BillSummary,
    PaymentCreate, PaymentOut,
)
from server.services import maintenance_service


maintenance_router = APIRouter(prefix="/api/v1/maintenance", tags=["Maintenance"])


def _raise_service_error(error: Exception) -> None:
    if isinstance(error, maintenance_service.BillNotFoundError):
        raise HTTPException(status_code=404, detail=str(error)) from error
    if isinstance(error, maintenance_service.InvalidBillError):
        raise HTTPException(status_code=400, detail=str(error)) from error
    raise error


def _ensure_view_role(user: UserOut) -> int | None:
    if user.role == "resident":
        return user.user_id
    if user.role in ("admin", "committee_member"):
        return None
    raise HTTPException(status_code=403, detail="You do not have permission to view maintenance bills")


@maintenance_router.get("/summary", response_model=BillSummary)
def get_summary(
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    return maintenance_service.summary(db, _ensure_view_role(current_user))


@maintenance_router.get("", response_model=list[BillOut])
def get_bills(
    status_filter: str | None = Query(None, alias="status"),
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    rows = maintenance_service.list_bills(db, _ensure_view_role(current_user))
    if status_filter:
        rows = [row for row in rows if row["status"] == status_filter]
    return rows


@maintenance_router.post("/generate", response_model=BillGenerationResult)
def generate_bills(
    body: BillGenerate,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member")),
):
    try:
        generated, skipped, bills = maintenance_service.generate_bills(db, body, current_user.user_id)
        return {"generated": generated, "skipped": skipped, "bills": bills}
    except maintenance_service.InvalidBillError as exc:
        _raise_service_error(exc)


@maintenance_router.get("/{bill_id}/payments", response_model=list[PaymentOut])
def get_payment_history(
    bill_id: int,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(get_current_user),
):
    resident_user_id = _ensure_view_role(current_user)
    try:
        if resident_user_id is not None:
            visible = db.execute(
                """SELECT 1 FROM maintenance_bills b JOIN residents r ON r.flat_id = b.flat_id
                   WHERE b.bill_id = %s AND r.user_id = %s AND r.status = 'active' LIMIT 1""",
                (bill_id, resident_user_id),
            ).fetchone()
            if visible is None:
                raise HTTPException(status_code=404, detail="Bill not found")
        return maintenance_service.list_payments(db, bill_id)
    except maintenance_service.BillNotFoundError as exc:
        _raise_service_error(exc)


@maintenance_router.post("/{bill_id}/payments", response_model=BillOut)
def add_payment(
    bill_id: int,
    body: PaymentCreate,
    db: Connection = Depends(get_db),
    current_user: UserOut = Depends(require_role("admin", "committee_member")),
):
    try:
        return maintenance_service.record_payment(db, bill_id, body, current_user.user_id)
    except (maintenance_service.BillNotFoundError, maintenance_service.InvalidBillError) as exc:
        _raise_service_error(exc)
