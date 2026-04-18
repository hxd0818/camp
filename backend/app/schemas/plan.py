"""Pydantic schemas for Leasing Plan."""

from datetime import date, datetime
from pydantic import BaseModel, Field


class PlanBase(BaseModel):
    name: str = Field(..., max_length=200)
    plan_type: str = "adjustment"
    description: str | None = None
    target_area: float | None = None
    target_units: int | None = None
    owner: str | None = Field(None, max_length=100)
    start_date: date
    due_date: date
    notes: str | None = None


class PlanCreate(PlanBase):
    mall_id: int


class PlanUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    plan_type: str | None = None
    description: str | None = None
    target_area: float | None = None
    target_units: int | None = None
    completed_area: float | None = None
    completed_units: int | None = None
    status: str | None = None
    owner: str | None = Field(None, max_length=100)
    start_date: date | None = None
    due_date: date | None = None
    notes: str | None = None


class PlanResponse(PlanBase):
    id: int
    mall_id: int
    completed_area: float = 0
    completed_units: int = 0
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
