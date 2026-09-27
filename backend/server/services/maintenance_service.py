from decimal import Decimal

from psycopg import Connection

from server.schemas.maintenance import BillGenerate, PaymentCreate
from server.services.notification_service import notify_active_residents


class BillNotFoundError(Exception):
    pass


class InvalidBillError(Exception):
    pass


_SELECT_BILLS = """SELECT b.bill_id, b.flat_id, f.flat_number, bl.name AS block_name,
       residents.resident_names, b.billing_period_start, b.billing_period_end,
       b.amount, payments.amount_paid, GREATEST(b.amount - payments.amount_paid, 0) AS outstanding,
       b.due_date, b.status, b.generated_by, b.generated_at
    FROM maintenance_bills b
    JOIN flats f ON f.flat_id = b.flat_id
    JOIN blocks bl ON bl.block_id = f.block_id
    LEFT JOIN LATERAL (
      SELECT string_agg(DISTINCT r.full_name, ', ' ORDER BY r.full_name) AS resident_names
      FROM residents r WHERE r.flat_id = f.flat_id AND r.status = 'active'
    ) residents ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(p.amount_paid), 0)::numeric(12,2) AS amount_paid
      FROM maintenance_payments p WHERE p.bill_id = b.bill_id
    ) payments ON true"""


def _refresh_statuses(db: Connection) -> None:
    db.execute(
        """UPDATE maintenance_bills b SET status = CASE
             WHEN COALESCE((SELECT SUM(p.amount_paid) FROM maintenance_payments p WHERE p.bill_id = b.bill_id), 0) >= b.amount THEN 'paid'
             WHEN COALESCE((SELECT SUM(p.amount_paid) FROM maintenance_payments p WHERE p.bill_id = b.bill_id), 0) > 0 THEN 'partially_paid'
             WHEN b.due_date < CURRENT_DATE THEN 'overdue'
             ELSE 'unpaid' END,
           updated_at = now()
           WHERE b.status IS DISTINCT FROM CASE
             WHEN COALESCE((SELECT SUM(p.amount_paid) FROM maintenance_payments p WHERE p.bill_id = b.bill_id), 0) >= b.amount THEN 'paid'
             WHEN COALESCE((SELECT SUM(p.amount_paid) FROM maintenance_payments p WHERE p.bill_id = b.bill_id), 0) > 0 THEN 'partially_paid'
             WHEN b.due_date < CURRENT_DATE THEN 'overdue'
             ELSE 'unpaid' END"""
    )


def _bill(db: Connection, bill_id: int) -> dict:
    row = db.execute(f"{_SELECT_BILLS} WHERE b.bill_id = %s", (bill_id,)).fetchone()
    if row is None:
        raise BillNotFoundError(f"Bill {bill_id} not found")
    return row


def list_bills(db: Connection, resident_user_id: int | None = None) -> list[dict]:
    _refresh_statuses(db)
    if resident_user_id is None:
        return db.execute(f"{_SELECT_BILLS} ORDER BY b.billing_period_start DESC, bl.name, f.flat_number").fetchall()
    return db.execute(
        f"""{_SELECT_BILLS}
          WHERE EXISTS (SELECT 1 FROM residents r WHERE r.flat_id = b.flat_id
                        AND r.user_id = %s AND r.status = 'active')
          ORDER BY b.billing_period_start DESC, bl.name, f.flat_number""",
        (resident_user_id,),
    ).fetchall()


def generate_bills(db: Connection, data: BillGenerate, generated_by: int) -> tuple[int, int, list[dict]]:
    if data.billing_period_start > data.billing_period_end:
        raise InvalidBillError("Billing period start must be on or before its end")
    if data.flat_id is not None:
        flats = db.execute("SELECT flat_id FROM flats WHERE flat_id = %s", (data.flat_id,)).fetchall()
        if not flats:
            raise InvalidBillError("Selected flat does not exist")
    else:
        flats = db.execute("SELECT flat_id FROM flats ORDER BY flat_id").fetchall()

    generated_ids: list[int] = []
    skipped = 0
    for flat in flats:
        duplicate = db.execute(
            """SELECT bill_id FROM maintenance_bills
               WHERE flat_id = %s AND billing_period_start = %s AND billing_period_end = %s""",
            (flat["flat_id"], data.billing_period_start, data.billing_period_end),
        ).fetchone()
        if duplicate:
            skipped += 1
            continue
        row = db.execute(
            """INSERT INTO maintenance_bills
                 (flat_id, billing_period_start, billing_period_end, amount, due_date, status, generated_by)
               VALUES (%s, %s, %s, %s, %s, 'unpaid', %s) RETURNING bill_id""",
            (flat["flat_id"], data.billing_period_start, data.billing_period_end,
             data.amount, data.due_date, generated_by),
        ).fetchone()
        generated_ids.append(row["bill_id"])
        notify_active_residents(
            db, "maintenance", "Maintenance Bill Generated",
            f"A maintenance bill of ₹{data.amount} was generated for "
            f"{data.billing_period_start} to {data.billing_period_end}. Due date: {data.due_date}.",
            row["bill_id"], flat["flat_id"],
        )
    _refresh_statuses(db)
    created = [_bill(db, bill_id) for bill_id in generated_ids]
    return len(generated_ids), skipped, created


def list_payments(db: Connection, bill_id: int) -> list[dict]:
    _bill(db, bill_id)
    return db.execute(
        """SELECT p.payment_id, p.bill_id, p.amount_paid, p.payment_date, p.payment_mode,
                  p.transaction_ref, p.recorded_by, u.full_name AS recorded_by_name
           FROM maintenance_payments p LEFT JOIN users u ON u.user_id = p.recorded_by
           WHERE p.bill_id = %s ORDER BY p.payment_date DESC, p.payment_id DESC""",
        (bill_id,),
    ).fetchall()


def record_payment(db: Connection, bill_id: int, data: PaymentCreate, recorded_by: int) -> dict:
    bill = _bill(db, bill_id)
    if data.amount_paid > bill["outstanding"]:
        raise InvalidBillError("Payment exceeds the outstanding balance")
    db.execute(
        """INSERT INTO maintenance_payments
             (bill_id, amount_paid, payment_date, payment_mode, transaction_ref, recorded_by)
           VALUES (%s, %s, COALESCE(%s, now()), %s, %s, %s)""",
        (bill_id, data.amount_paid, data.payment_date, data.payment_mode,
         data.transaction_ref, recorded_by),
    )
    _refresh_statuses(db)
    return _bill(db, bill_id)


def summary(db: Connection, resident_user_id: int | None = None) -> dict:
    bills = list_bills(db, resident_user_id)
    return {
        "total_billed": sum((row["amount"] for row in bills), Decimal("0.00")),
        "total_paid": sum((row["amount_paid"] for row in bills), Decimal("0.00")),
        "pending_dues": sum((row["outstanding"] for row in bills), Decimal("0.00")),
        "pending_bills": sum(row["status"] in ("unpaid", "partially_paid") for row in bills),
        "overdue_bills": sum(row["status"] == "overdue" for row in bills),
    }
