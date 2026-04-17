"""Pydantic schemas for WorkOrder entity."""

from datetime import date, datetime
from pydantic import BaseModel, Field


class WorkOrderBase(BaseModel):
    mall_id: int
    title: str = Field(..., max_length=200)
    description: str | None = None
    category: str = "general"
    priority: str = "medium"
    unit_id: int | None = None
    requested_by: str | None = None
    assigned_to: str | None = None
    due_date: date | None = None


class WorkOrderCreate(WorkOrderBase):
    pass


class WorkOrderUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    category: str | None = None
    priority: str | None = None
    status: str | None = None
    assigned_to: str | None = None
    due_date: date | None = None
    resolution_notes: str | None = None


class WorkOrderResponse(WorkOrderBase):
    id: int
    status: str
    completed_at: datetime | None
    resolution_notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Common Response Envelope ---

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int
