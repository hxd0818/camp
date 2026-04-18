"""Pydantic schemas for Dashboard / Kanban feature."""

from __future__ import annotations

from datetime import date, datetime
from pydantic import BaseModel, Field


class KPIMetric(BaseModel):
    value: float
    change: float | None = None
    unit: str = ""


class DashboardKPIs(BaseModel):
    occupancy_rate: KPIMetric
    vacant_area: KPIMetric
    monthly_revenue: KPIMetric
    expiring_count: KPIMetric
    leasing_completion: KPIMetric
    lianfa_ratio: KPIMetric


class DashboardSummary(BaseModel):
    total_units: int
    occupied_units: int
    vacant_units: int
    total_area: float
    leased_area: float
    total_tenants: int
    active_contracts: int


class DashboardStatsResponse(BaseModel):
    mall_id: int
    mall_name: str
    period: str
    kpis: DashboardKPIs
    summary: DashboardSummary


class KanbanCardSchema(BaseModel):
    unit_id: int
    unit_code: str
    area: float | None = None
    floor_name: str = ""
    layout_type: str = ""
    tenant_name: str | None = None
    brand_tier: str | None = None
    vacancy_days: int | None = None
    monthly_rent: float | None = None


class KanbanColumnSchema(BaseModel):
    id: str
    title: str
    unit_count: int = 0
    total_area: float = 0
    cards: list[KanbanCardSchema] = Field(default_factory=list)


class KanbanDataResponse(BaseModel):
    columns: list[KanbanColumnSchema]


class KanbanMoveRequest(BaseModel):
    unit_id: int
    new_status: str


class KanbanMoveResponse(BaseModel):
    unit_id: int
    old_status: str
    new_status: str


class VacancyBucketSchema(BaseModel):
    name: str
    value: float = 0
    count: int = 0
    color: str = ""


class VacancyAnalysisResponse(BaseModel):
    buckets: list[VacancyBucketSchema]
    total_vacant_area: float
    total_vacant_count: int


class LeaseTermBucketSchema(BaseModel):
    term: str
    count: int = 0
    area: float = 0


class LeaseTermResponse(BaseModel):
    buckets: list[LeaseTermBucketSchema]


class BrandTierBucketSchema(BaseModel):
    name: str
    value: int = 0
    color: str = ""
    percentage: float = 0


class BrandTierResponse(BaseModel):
    buckets: list[BrandTierBucketSchema]
    total: int


class ExpiringContractItem(BaseModel):
    contract_id: int
    contract_number: str
    unit_code: str
    tenant_name: str | None = None
    lease_end: date
    days_remaining: int
    monthly_rent: float | None = None
    status: str


class ExpiringContractsResponse(BaseModel):
    items: list[ExpiringContractItem]
    total: int
