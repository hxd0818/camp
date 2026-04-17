"""Finance API endpoints - invoices and payments."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.contract import Invoice, Payment
from app.schemas.contract import InvoiceCreate, InvoiceResponse, PaymentCreate, PaymentResponse

router = APIRouter()


# --- Invoice Endpoints ---

@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    contract_id: int | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List invoices with optional filters."""
    query = select(Invoice)
    if contract_id:
        query = query.where(Invoice.contract_id == contract_id)
    if status:
        query = query.where(Invoice.status == status)

    result = await db.execute(query.order_by(Invoice.due_date.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/invoices", response_model=InvoiceResponse, status_code=201)
async def create_invoice(invoice: InvoiceCreate, db: AsyncSession = Depends(get_db)):
    """Create a new invoice."""
    from app.models.contract import Contract

    # Verify contract exists
    result = await db.execute(select(Contract).where(Contract.id == invoice.contract_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Contract not found")

    # Generate invoice number
    from datetime import datetime as _dt
    count_result = await db.execute(func.count(Invoice.id))
    count = count_result.scalar() or 0
    invoice_number = f"INV-{_dt.now().strftime('%Y%m')}-{count + 1:04d}"

    db_invoice = Invoice(
        contract_id=invoice.contract_id,
        invoice_number=invoice_number,
        amount=invoice.amount,
        due_date=invoice.due_date,
        notes=invoice.notes,
    )
    db.add(db_invoice)
    await db.flush()
    await db.refresh(db_invoice)
    return db_invoice


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(invoice_id: int, db: AsyncSession = Depends(get_db)):
    """Get invoice by ID."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


# --- Payment Endpoints ---

@router.get("/payments", response_model=list[PaymentResponse])
async def list_payments(
    invoice_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List payments with optional filters."""
    query = select(Payment)
    if invoice_id:
        query = query.where(Payment.invoice_id == invoice_id)

    result = await db.execute(query.order_by(Payment.payment_date.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("/payments", response_model=PaymentResponse, status_code=201)
async def create_payment(payment: PaymentCreate, db: AsyncSession = Depends(get_db)):
    """Record a payment against an invoice."""
    from app.models.contract import Invoice

    # Verify invoice exists
    result = await db.execute(select(Invoice).where(Invoice.id == payment.invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db_payment = Payment(**payment.model_dump())
    db.add(db_payment)

    # Update invoice status to paid if payment covers full amount
    total_paid_result = await db.execute(
        func.coalesce(func.sum(Payment.amount), 0)
        .filter(Payment.invoice_id == payment.invoice_id)
    )
    total_paid = total_paid_result.scalar() or 0

    if total_paid >= float(invoice.amount):
        invoice.status = "paid"

    await db.flush()
    await db.refresh(db_payment)
    return db_payment
