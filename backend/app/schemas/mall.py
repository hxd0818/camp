"""Pydantic schemas for Mall, Building, Floor entities."""

from datetime import datetime
from pydantic import BaseModel, Field


# --- Mall Schemas ---

class MallBase(BaseModel):
    name: str = Field(..., max_length=200)
    code: str = Field(..., max_length=50)
    address: str | None = None
    city: str | None = None
    total_area: float | None = None
    description: str | None = None


class MallCreate(MallBase):
    pass


class MallUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    address: str | None = None
    city: str | None = None
    total_area: float | None = None
    status: str | None = None
    description: str | None = None


class MallResponse(MallBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Building Schemas ---

class BuildingBase(BaseModel):
    name: str = Field(..., max_length=200)
    code: str = Field(..., max_length=50)
    total_floors: int = 0
    description: str | None = None


class BuildingCreate(BuildingBase):
    mall_id: int


class BuildingUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    code: str | None = Field(None, max_length=50)
    total_floors: int | None = None
    description: str | None = None


class BuildingResponse(BuildingBase):
    id: int
    mall_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Floor Schemas ---

class FloorBase(BaseModel):
    floor_number: int
    name: str = Field(..., max_length=100)
    total_area: float | None = None
    description: str | None = None
    sort_order: int = 0


class FloorCreate(FloorBase):
    building_id: int


class FloorUpdate(BaseModel):
    floor_number: int | None = None
    name: str | None = Field(None, max_length=100)
    plan_image_url: str | None = None
    total_area: float | None = None
    description: str | None = None
    sort_order: int | None = None


class FloorResponse(FloorBase):
    id: int
    building_id: int
    plan_image_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
