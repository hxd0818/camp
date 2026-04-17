"""Pydantic schemas for Contract, Invoice, Payment entities."""

from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field


# --- Contract Schemas ---

class ContractBase(BaseModel):
    tenant_ref_id: int = Field(..., alias="tenant_id")
    unit_id: int
    contract_number: str = Field(..., max_length=50)
    lease_start: date
    lease_end: date
    monthly_rent: Decimal | None = None
    management_fee: Decimal | None = None
    deposit: Decimal | None = None
    currency: str = "CNY"
    payment_frequency: str = "monthly"
    signed_area: float | None = None
    notes: str | None = None


class ContractCreate(ContractBase):
    pass


class ContractUpdate(BaseModel):
    status: str | None = None
    lease_start: date | None = None
    lease_end: date | None = None
    monthly_rent: Decimal | None = None
    management_fee: Decimal | None = None
    deposit: Decimal | None = None
    payment_frequency: str | None = None
    notes: str | None = None


class ContractResponse(BaseModel):
    id: int
    tenant_id_field: str | None = Field(None, alias="tenant_id")
    tenant_id_ref: int = Field(alias="tenant_ref_id")
    unit_id: int
    contract_number: str
    status: str
    lease_start: date
    lease_end: date
    monthly_rent: Decimal | None
    management_fee: Decimal | None
    deposit: Decimal | None
    currency: str
    payment_frequency: str
    ai_imported: bool
    ai_confidence_score: float | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


# --- AI Import Schema ---

class ContractAIExtractedData(BaseModel):
    """Structured data extracted from contract by AI."""
    tenant_name: str
    unit_code: str | None = None
    area: float | None = None
    monthly_rent: Decimal | None = None
    deposit: Decimal | None = None
    lease_start: date | None = None
    lease_end: date | None = None
    payment_terms: str | None = None
    confidence_score: float = Field(..., ge=0.0, le=1.0)


class ContractAIImportRequest(BaseModel):
    """Request for AI-powered contract import."""
    file_content_b64: str  # base64 encoded file content
    file_name: str
    file_type: str  # pdf | image


class ContractAIImportResponse(BaseModel):
    """Response from AI contract extraction."""
    extracted_data: ContractAIExtractedData
    matched_unit_id: int | None = None
    matched_unit_code: str | None = None
    match_confidence: float | None = None
    warnings: list[str] = []


# --- Invoice Schemas ---

class InvoiceBase(BaseModel):
    contract_id: int
    amount: Decimal = Field(..., decimal_places=2)
    due_date: date
    notes: str | None = None


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceResponse(InvoiceBase):
    id: int
    invoice_number: str
    status: str
    issued_date: date
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Payment Schemas ---

class PaymentBase(BaseModel):
    invoice_id: int
    amount: Decimal = Field(..., decimal_places=2)
    payment_method: str | None = None
    reference_number: str | None = None
    notes: str | None = None


class PaymentCreate(PaymentBase):
    pass


class PaymentResponse(PaymentBase):
    id: int
    payment_date: date
    created_at: datetime

    model_config = {"from_attributes": True}
