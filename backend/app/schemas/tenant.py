"""Pydantic schemas for Tenant entity."""

from datetime import datetime
from pydantic import BaseModel, Field


class TenantBase(BaseModel):
    name: str = Field(..., max_length=200)
    type: str = "company"
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    business_license: str | None = None
    industry: str | None = None
    notes: str | None = None


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    type: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    business_license: str | None = None
    industry: str | None = None
    status: str | None = None
    notes: str | None = None


class TenantResponse(TenantBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
