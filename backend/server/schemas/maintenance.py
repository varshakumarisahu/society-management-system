from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


PaymentMode = Literal["cash", "cheque", "upi", "card", "net_banking", "other"]


class BillGenerate(BaseModel):
    billing_period_start: date
    billing_period_end: date
    due_date: date
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    flat_id: int | None = None


class PaymentCreate(BaseModel):
    amount_paid: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    payment_mode: PaymentMode
    transaction_ref: str | None = Field(default=None, max_length=150)
    payment_date: datetime | None = None


class BillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bill_id: int
    flat_id: int
    flat_number: str
    block_name: str
    resident_names: str | None
    billing_period_start: date
    billing_period_end: date
    amount: Decimal
    amount_paid: Decimal
    outstanding: Decimal
    due_date: date
    status: Literal["unpaid", "partially_paid", "paid", "overdue"]
    generated_by: int | None
    generated_at: datetime


class BillGenerationResult(BaseModel):
    generated: int
    skipped: int
    bills: list[BillOut]


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    payment_id: int
    bill_id: int
    amount_paid: Decimal
    payment_date: datetime
    payment_mode: PaymentMode
    transaction_ref: str | None
    recorded_by: int | None
    recorded_by_name: str | None


class BillSummary(BaseModel):
    total_billed: Decimal
    total_paid: Decimal
    pending_dues: Decimal
    pending_bills: int
    overdue_bills: int
