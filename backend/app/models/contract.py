"""Contract model with AI import support."""

import enum
from decimal import Decimal
from datetime import datetime, date
from sqlalchemy import String, Text, Numeric, DateTime, Date, Enum, JSON, ForeignKey, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRING = "expiring"
    EXPIRED = "expired"
    TERMINATED = "terminated"
    RENEWED = "renewed"


class PaymentFrequency(str, enum.Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    HALF_YEARLY = "half_yearly"
    YEARLY = "yearly"


class Contract(Base):
    """Lease agreement between tenant and unit."""

    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id_field: Mapped[str | None] = mapped_column(
        String(36), nullable=True, index=True, name="tenant_id"
    )

    # Relations
    tenant_id_ref: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"), nullable=False, name="tenant_ref_id"
    )
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"), nullable=True)

    # Contract details
    contract_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    status: Mapped[ContractStatus] = mapped_column(Enum(ContractStatus), default=ContractStatus.DRAFT)

    # Lease period
    lease_start: Mapped[date] = mapped_column(Date, nullable=False)
    lease_end: Mapped[date] = mapped_column(Date, nullable=False)

    # Financial terms
    monthly_rent: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    management_fee: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    deposit: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="CNY")
    payment_frequency: Mapped[PaymentFrequency] = mapped_column(
        Enum(PaymentFrequency), default=PaymentFrequency.MONTHLY
    )

    # Unit info at signing time (snapshot)
    signed_area: Mapped[float | None] = mapped_column(nullable=True)
    unit_code_at_signing: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Renewal flag: True = renewal contract, False = new signing
    is_renewal: Mapped[bool] = mapped_column(
        Boolean, default=False,
        comment="Whether this contract is a renewal of an existing lease"
    )

    # AI Import metadata
    ai_imported: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_confidence_score: Mapped[float | None] = mapped_column(nullable=True)  # 0.0 - 1.0
    source_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_extracted_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Documents
    contract_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="contracts", foreign_keys=[tenant_id_ref])
    unit: Mapped["Unit"] = relationship(back_populates="current_contract")
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="contract", lazy="noload")


class Invoice(Base):
    """Billing invoice for a contract."""

    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    contract_id: Mapped[int] = mapped_column(ForeignKey("contracts.id"), nullable=False)

    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)

    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/paid/overdue/cancelled
    issued_date: Mapped[date] = mapped_column(Date, default=date.today)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    contract: Mapped["Contract"] = relationship(back_populates="invoices")


class Payment(Base):
    """Payment record against an invoice."""

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False)

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_date: Mapped[date] = mapped_column(Date, default=date.today)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)  # bank_transfer/cash/etc
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
