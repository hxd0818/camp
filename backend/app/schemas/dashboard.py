"""Pydantic schemas for Dashboard / Kanban feature."""

from __future__ import annotations

from datetime import date, datetime
from pydantic import BaseModel, Field


class KPIMetric(BaseModel):
    value: float
    change: float | None = None
    unit: str = ""
    budget_variance: float | None = None  # 预算差异百分比


class DashboardKPIs(BaseModel):
    """扩展后的13项KPI指标"""
    # 1. 租费招调增长率（预算±%, 月环比）
    lease_adjustment_rate: KPIMetric
    # 2. 累计招调增长率（月环比）
    cumulative_adjustment_rate: KPIMetric
    # 3. 动态出租率 + 静态出租率 + 月环比
    dynamic_occupancy_rate: KPIMetric
    static_occupancy_rate: KPIMetric
    # 4. 空置总面积 + 新增空铺面积 + 占比 + 月环比
    vacant_area: KPIMetric
    new_vacant_area: KPIMetric
    vacant_area_ratio: KPIMetric
    # 5. 到期铺出空 + 占比 + 月环比
    expiring_vacant_count: KPIMetric
    expiring_vacant_ratio: KPIMetric
    # 6. 预警铺出空 + 占比 + 月环比
    warning_vacant_count: KPIMetric
    warning_vacant_ratio: KPIMetric
    # 7. 招商按时完成率 + 提前30天完成率 + 月环比
    leasing_completion_rate: KPIMetric
    leasing_early_completion_rate: KPIMetric
    # 8. 到期铺按时完成率 + 月环比
    expiring_completion_rate: KPIMetric
    # 9. 预警铺按时完成率 + 月环比
    warning_completion_rate: KPIMetric
    # 10. 空铺去化按时完成率 + 月环比
    vacancy_removal_rate: KPIMetric
    # 11. 联发品牌占比%
    lianfa_brand_ratio: KPIMetric
    # 12. 联发合作总面积万m² + 占比 + 月环比
    lianfa_total_area: KPIMetric
    lianfa_area_ratio: KPIMetric
    # 13. 新增联发合作面积 + 月环比
    new_lianfa_area: KPIMetric


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


# --- Tool Query Schemas ---


class ToolUnitRow(BaseModel):
    id: int
    unit_code: str
    floor_id: int
    floor_number: int = 0
    floor_name: str = ""
    building_id: int = 0
    building_name: str = ""
    area: float = 0.0
    layout_type: str = ""
    status: str = ""
    tenant_name: str | None = None
    monthly_rent: float | None = None
    mall_id: int = 0
    # 招商相关字段
    leasing_type: str | None = None  # new/renewal/adjustment
    lease_end: str | None = None     # 合同到期日期
    vacancy_days: int | None = None  # 空置天数
    previous_rent: float | None = None  # 前序租金


class ToolUnitsResponse(BaseModel):
    data: list[ToolUnitRow] = Field(default_factory=list)
    total: int = 0


class ToolBrandRow(BaseModel):
    id: int
    tenant_name: str
    brand_tier: str | None = None
    type: str = ""
    contract_count: int = 0
    total_area: float = 0.0
    monthly_rent: float = 0.0
    status: str = ""
    # 经营数据指标
    avg_daily_traffic: float | None = None
    avg_daily_sales: float | None = None
    avg_monthly_sales_per_sqm: float | None = None
    avg_rent_to_sales_ratio: float | None = None
    annual_rent_income: float | None = None


class ToolBrandsResponse(BaseModel):
    data: list[ToolBrandRow] = Field(default_factory=list)
    total: int = 0


class FloorSummaryRow(BaseModel):
    floor_name: str = ""
    occupied: int = 0
    vacant: int = 0


class FloorSummaryResponse(BaseModel):
    floors: list[FloorSummaryRow] = Field(default_factory=list)


# --- 新增API Schema ---


class SigningStructureBucket(BaseModel):
    """签约结构分桶：新签/续签"""
    type: str  # "new" 或 "renewal"
    name: str  # "新签" 或 "续签"
    area: float = 0.0
    count: int = 0
    ratio: float = 0.0  # 占比百分比


class SigningStructureResponse(BaseModel):
    """签约结构API响应"""
    buckets: list[SigningStructureBucket]
    total_area: float = 0.0
    total_count: int = 0


class BrandTierTrendItem(BaseModel):
    """品牌能级趋势单项"""
    tier: str  # S/A/B/C/lianfa/unknown
    tier_name: str  # 能级名称
    new_count: int = 0  # 本月新增
    month_on_month: float | None = None  # 月环比百分比
    color: str = ""  # 图表颜色


class BrandTierTrendResponse(BaseModel):
    """品牌能级趋势API响应"""
    items: list[BrandTierTrendItem]
    period: str  # "2026-04" 等


class ProjectInfoCard(BaseModel):
    """项目综合信息卡片"""
    card_id: str  # "lease_adjustment", "vacancy_analysis", "leasing_progress", "lianfa_stats"
    title: str  # 卡片标题
    value: str  # 主要数值
    subtitle: str  # 副标题
    change: float | None = None  # 变化百分比
    trend: str = "neutral"  # "up", "down", "neutral"


class BasicInfoCard(BaseModel):
    """基础信息卡片"""
    opening_date: str | None = None
    operation_category: str | None = None
    total_area: float = 0.0
    leasable_area: float = 0.0
    building_count: int = 0
    floor_count: int = 0


class OperationsCard(BaseModel):
    """经营情况卡片"""
    annual_rent: float = 0.0
    rent_per_sqm: float = 0.0  # 坪效
    daily_traffic: int = 0
    monthly_sales: float = 0.0
    rent_to_sales_ratio: float = 0.0  # 租售比


class BrandStructureItem(BaseModel):
    """品牌结构项"""
    tier: str
    tier_name: str
    count: int
    percentage: float
    color: str


class BrandStructureCard(BaseModel):
    """品牌结构卡片"""
    total: int = 0
    items: list[BrandStructureItem] = []


class FloorStructureItem(BaseModel):
    """楼层结构项"""
    floor_id: int
    floor_name: str
    floor_number: int
    total_units: int
    occupied_units: int
    vacant_units: int
    occupancy_rate: float
    total_area: float
    leased_area: float
    expiring_count: int = 0  # 到期预警数量


class FloorStructureCard(BaseModel):
    """铺位结构卡片"""
    total_units: int = 0
    occupied_units: int = 0
    vacant_units: int = 0
    occupancy_rate: float = 0.0
    expiring_total: int = 0
    floors: list[FloorStructureItem] = []


class ProjectInfoDetailResponse(BaseModel):
    """项目详细信息API响应 - 扩展版"""
    mall_id: int
    mall_name: str

    # 4大信息卡片区
    basic_info: BasicInfoCard
    operations: OperationsCard
    brand_structure: BrandStructureCard
    floor_structure: FloorStructureCard

    updated_at: datetime
