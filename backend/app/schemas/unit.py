"""Pydantic schemas for Unit and FloorPlan entities."""

from datetime import datetime
from pydantic import BaseModel, Field


class HotspotData(BaseModel):
    """Coordinates for a unit on the floor plan image."""
    x: int
    y: int
    width: int
    height: int
    shape: str = "rect"  # rect | polygon
    points: list[list[int]] | None = None  # for polygon shapes


class UnitBase(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=200)
    layout_type: str = "retail"
    status: str = "vacant"
    gross_area: float | None = None
    net_leasable_area: float | None = None
    ceiling_height: float | None = None
    description: str | None = None


class UnitCreate(UnitBase):
    floor_id: int
    hotspot_data: HotspotData | None = None


class UnitUpdate(BaseModel):
    code: str | None = Field(None, max_length=50)
    name: str | None = Field(None, max_length=200)
    layout_type: str | None = None
    status: str | None = None
    gross_area: float | None = None
    net_leasable_area: float | None = None
    ceiling_height: float | None = None
    hotspot_data: HotspotData | None = None
    description: str | None = None


class UnitResponse(UnitBase):
    id: int
    floor_id: int
    hotspot_data: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UnitWithContract(UnitResponse):
    """Unit response with current contract summary."""
    tenant_name: str | None = None
    contract_status: str | None = None
    lease_end: str | None = None


# --- Floor Plan Schemas ---

class HotspotItem(BaseModel):
    unit_id: int
    unit_code: str
    x: int
    y: int
    w: int
    h: int
    shape: str = "rect"
    status_color: str = "#94a3b8"


class FloorPlanBase(BaseModel):
    floor_id: int
    image_url: str


class FloorPlanCreate(FloorPlanBase):
    hotspots: list[HotspotItem] | None = None


class FloorPlanResponse(FloorPlanBase):
    id: int
    image_width: int | None
    image_height: int | None
    hotspots: list[dict] | None
    version: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
