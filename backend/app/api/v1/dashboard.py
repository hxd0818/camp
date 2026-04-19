"""Dashboard aggregation APIs - core of CAMP Kanban dashboard.

Extended with 13 KPI metrics (19 fields), signing structure,
brand tier trend, project info (simple + detail), and tool queries.

KPI Index (PPT page 6):
  1.  lease_adjustment_rate       - Rental/leasing adjustment growth (placeholder)
  2.  cumulative_adjustment_rate   - Cumulative growth rate (placeholder)
  3.  dynamic_occupancy_rate       - Occupancy by unit count
      static_occupancy_rate        - Occupancy by leased area
  4.  vacant_area / new_vacant_area / vacant_area_ratio
  5.  expiring_vacant_count / expiring_vacant_ratio  (area in 10k sqm)
  6.  warning_vacant_count / warning_vacant_ratio   (area in 10k sqm)
  7.  leasing_completion_rate / leasing_early_completion_rate
  8.  expiring_completion_rate
  9.  warning_completion_rate
  10. vacancy_removal_rate
  11. lianfa_brand_ratio
  12. lianfa_total_area / lianfa_area_ratio
  13. new_lianfa_area
"""

from datetime import date, timedelta, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, case, and_, desc, Float, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.mall import Mall, Floor, Building
from app.models.unit import Unit
from app.models.contract import Contract
from app.models.tenant import Tenant, BrandTier
from app.models.leasing_plan import LeasingPlan, PlanStatus
from app.schemas.dashboard import (
    DashboardStatsResponse,
    DashboardKPIs,
    DashboardSummary,
    KPIMetric,
    KanbanDataResponse,
    KanbanColumnSchema,
    KanbanCardSchema,
    KanbanMoveRequest,
    KanbanMoveResponse,
    VacancyAnalysisResponse,
    VacancyBucketSchema,
    LeaseTermResponse,
    LeaseTermBucketSchema,
    BrandTierResponse,
    BrandTierBucketSchema,
    ExpiringContractsResponse,
    ExpiringContractItem,
    ToolUnitsResponse,
    ToolUnitRow,
    ToolBrandsResponse,
    ToolBrandRow,
    FloorSummaryResponse,
    FloorSummaryRow,
    SigningStructureResponse,
    SigningStructureBucket,
    BrandTierTrendResponse,
    BrandTierTrendItem,
    ProjectInfoCard,
    ProjectInfoResponse,
    ProjectInfoDetailResponse,
    BasicInfoCard,
    OperationsCard,
    BrandStructureCard,
    BrandStructureItem,
    FloorStructureCard,
    FloorStructureItem,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

KANBAN_STATUS_MAP = {
    "vacant": "空置",
    "reserved": "洽谈中",
    "occupied": "已入驻",
    "maintenance": "维保中",
    "blocked": "封锁",
}

VALID_STATUSES = set(KANBAN_STATUS_MAP.keys())

BRAND_TIER_COLORS = {
    "s": "#1e40af",
    "a": "#3b82f6",
    "b": "#93c5fd",
    "c": "#9ca3af",
    "lianfa": "#06b6d4",
    "unknown": "#d1d5db",
}

BRAND_TIER_NAMES = {
    "s": "S级品牌",
    "a": "A级品牌",
    "b": "B级品牌",
    "c": "C级品牌",
    "lianfa": "联发品牌",
    "unknown": "未知能级",
}


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------


async def _get_mall_floor_ids(db: AsyncSession, mall_id: int) -> list[int]:
    """Return all floor IDs belonging to the given mall."""
    result = await db.execute(
        select(Floor.id).join(Building, Floor.building_id == Building.id).where(Building.mall_id == mall_id)
    )
    return [row[0] for row in result.all()]


async def _validate_mall(db: AsyncSession, mall_id: int) -> Mall:
    """Fetch and validate mall existence. Raises 404 if not found."""
    result = await db.execute(select(Mall).where(Mall.id == mall_id))
    mall = result.scalar_one_or_none()
    if not mall:
        raise HTTPException(status_code=404, detail="Mall not found")
    return mall


def _calc_ratio(numerator: float, denominator: float) -> float:
    """Safe ratio calculation returning percentage (0-100)."""
    return round(numerator / denominator * 100, 2) if denominator > 0 else 0.0


def _calc_mom(current: float, previous: float) -> float:
    """Calculate month-over-month change percentage.

    Uses time-window comparison: current period vs previous period.
    Returns 0.0 when both are zero.
    Returns 100.0 when growing from 0 to positive (new appearance).
    Returns negative when declining.
    """
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round((current - previous) / abs(previous) * 100, 2)


def _kpi(value: float, unit: str = "", change: float | None = None,
         budget_variance: float | None = None) -> KPIMetric:
    """Shorthand to create a KPIMetric with rounded value."""
    return KPIMetric(
        value=round(value, 2),
        unit=unit,
        change=change,
        budget_variance=budget_variance,
    )


def _make_zero_kpi() -> KPIMetric:
    """Create a zero-value KPI metric as fallback for empty malls."""
    return KPIMetric(value=0.0, unit="")


# ---------------------------------------------------------------------------
# 1. GET /dashboard/stats?mall_id=  (13 KPI groups, ~19 fields)
# ---------------------------------------------------------------------------


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    mall_id: int = Query(..., description="Mall ID"),
    db: AsyncSession = Depends(get_db),
):
    """Return 13 KPI metrics for a mall.

    All metrics calculated from real DB queries where possible.
    Placeholder metrics (no data source yet): budget variance, cumulative growth.
    Month-over-month uses time-window comparison (current vs previous period).
    """
    mall = await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)

    zk = _make_zero_kpi()

    # Zero-state response for malls without floors
    if not floor_ids:
        return DashboardStatsResponse(
            mall_id=mall_id,
            mall_name=mall.name,
            period="today",
            kpis=DashboardKPIs(
                lease_adjustment_rate=zk,
                cumulative_adjustment_rate=zk,
                dynamic_occupancy_rate=zk,
                static_occupancy_rate=zk,
                vacant_area=zk,
                new_vacant_area=zk,
                vacant_area_ratio=zk,
                expiring_vacant_count=zk,
                expiring_vacant_ratio=zk,
                warning_vacant_count=zk,
                warning_vacant_ratio=zk,
                leasing_completion_rate=zk,
                leasing_early_completion_rate=zk,
                expiring_completion_rate=zk,
                warning_completion_rate=zk,
                vacancy_removal_rate=zk,
                lianfa_brand_ratio=zk,
                lianfa_total_area=zk,
                lianfa_area_ratio=zk,
                new_lianfa_area=zk,
            ),
            summary=DashboardSummary(
                total_units=0, occupied_units=0, vacant_units=0,
                total_area=0.0, leased_area=0.0, total_tenants=0, active_contracts=0,
            ),
        )

    today = date.today()
    month_start = today.replace(day=1)
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)
    today_plus_30 = today + timedelta(days=30)
    today_plus_90 = today + timedelta(days=90)

    # ===================================================================
    # A. Core Unit Aggregation (foundational for many KPIs)
    # ===================================================================
    unit_agg = await db.execute(
        select(
            func.count(Unit.id).label("total"),
            func.sum(case((Unit.status == "occupied", 1), else_=0)).label("occupied"),
            func.sum(case((Unit.status == "vacant", 1), else_=0)).label("vacant"),
            func.coalesce(func.sum(Unit.gross_area), 0).label("total_area"),
            func.coalesce(func.sum(case((Unit.status == "occupied", Unit.gross_area), else_=0)), 0).label("leased_area"),
            func.coalesce(func.sum(case((Unit.status == "vacant", Unit.gross_area), else_=0)), 0).label("vacant_area"),
        ).where(Unit.floor_id.in_(floor_ids))
    )
    ua = unit_agg.one()
    total_units = int(ua.total or 0)
    occupied_units = int(ua.occupied or 0)
    vacant_units = int(ua.vacant or 0)
    total_area = float(ua.total_area or 0)
    leased_area = float(ua.leased_area or 0)
    vacant_area_val = float(ua.vacant_area or 0)

    # KPI Group 3: Occupancy rates
    dynamic_occupancy = _calc_ratio(occupied_units, total_units)
    static_occupancy = _calc_ratio(leased_area, total_area)

    # ===================================================================
    # B. New Vacant Area (this month) + MoM comparison
    # ===================================================================
    curr_new_vacant_result = await db.execute(
        select(func.coalesce(func.sum(Unit.gross_area), 0))
        .where(Unit.floor_id.in_(floor_ids), Unit.status == "vacant", Unit.updated_at >= month_start)
    )
    curr_nva = float(curr_new_vacant_result.scalar() or 0)

    prev_new_vacant_result = await db.execute(
        select(func.coalesce(func.sum(Unit.gross_area), 0))
        .where(Unit.floor_id.in_(floor_ids), Unit.status == "vacant",
               Unit.updated_at >= prev_month_start, Unit.updated_at < month_start)
    )
    prev_nva = float(prev_new_vacant_result.scalar() or 0)
    new_vacant_mom = _calc_mom(curr_nva, prev_nva)

    # KPI Group 4: Vacant area metrics
    vacant_area_ratio = _calc_ratio(vacant_area_val, total_area)

    # ===================================================================
    # C. Expiring-Vacant Analysis (KPI #5)
    #   Units whose contract expired in last 30 days AND currently vacant.
    #   Value reported in 10k sqm (wan m2) per PPT requirement.
    # ===================================================================
    eva_result = await db.execute(
        select(func.coalesce(func.sum(Unit.gross_area), 0))
        .join(Contract, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Unit.status == "vacant",
            Contract.lease_end >= today - timedelta(days=30),
            Contract.lease_end <= today,
            Contract.status == "active",
        )
    )
    eva = float(eva_result.scalar() or 0)

    # Previous period for MoM (30-60 days ago)
    prev_eva_result = await db.execute(
        select(func.coalesce(func.sum(Unit.gross_area), 0))
        .join(Contract, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Unit.status == "vacant",
            Contract.lease_end >= today - timedelta(days=60),
            Contract.lease_end < today - timedelta(days=30),
            Contract.status == "active",
        )
    )
    prev_eva = float(prev_eva_result.scalar() or 0)
    eva_mom = _calc_mom(eva, prev_eva)

    # Total expired area (for ratio denominator)
    eta_result = await db.execute(
        select(func.coalesce(func.sum(Unit.gross_area), 0))
        .join(Contract, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Contract.lease_end >= today - timedelta(days=30),
            Contract.lease_end <= today,
            Contract.status == "active",
        )
    )
    eta = float(eta_result.scalar() or 0)
    expiring_vacant_ratio = _calc_ratio(eva, eta) if eta > 0 else 0.0

    # Expiring status breakdown (for KPI #8: on-time completion rate)
    expiring_status_result = await db.execute(
        select(Unit.status)
        .join(Contract, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Contract.lease_end >= today,
            Contract.lease_end <= today_plus_30,
            Contract.status == "active"
        )
    )
    expiring_rows = expiring_status_result.all()
    expiring_total = len(expiring_rows)
    expiring_completed = sum(1 for r in expiring_rows if r[0] == "occupied")
    expiring_completion = _calc_ratio(expiring_completed, expiring_total)

    # ===================================================================
    # D. Warning-Vacant Analysis (KPI #6)
    #   Units with contracts expiring in 31-90 days AND currently vacant.
    #   Value reported in 10k sqm per PPT requirement.
    # ===================================================================
    wva_result = await db.execute(
        select(func.coalesce(func.sum(Unit.gross_area), 0))
        .join(Contract, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Unit.status == "vacant",
            Contract.lease_end > today_plus_30,
            Contract.lease_end <= today_plus_90,
            Contract.status == "active",
        )
    )
    wva = float(wva_result.scalar() or 0)

    # Previous period for MoM
    prev_wva_result = await db.execute(
        select(func.coalesce(func.sum(Unit.gross_area), 0))
        .join(Contract, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Unit.status == "vacant",
            Contract.lease_end > today_plus_30 - timedelta(days=30),
            Contract.lease_end <= today_plus_90 - timedelta(days=30),
            Contract.status == "active",
        )
    )
    prev_wva = float(prev_wva_result.scalar() or 0)
    wva_mom = _calc_mom(wva, prev_wva)

    # Total warning area (for ratio denominator)
    wta_result = await db.execute(
        select(func.coalesce(func.sum(Unit.gross_area), 0))
        .join(Contract, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Contract.lease_end > today_plus_30,
            Contract.lease_end <= today_plus_90,
            Contract.status == "active",
        )
    )
    wta = float(wta_result.scalar() or 0)
    warning_vacant_ratio = _calc_ratio(wva, wta) if wta > 0 else 0.0

    # Warning status breakdown (for KPI #9: on-time completion rate)
    warning_status_result = await db.execute(
        select(Unit.status)
        .join(Contract, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Contract.lease_end > today_plus_30,
            Contract.lease_end <= today_plus_90,
            Contract.status == "active"
        )
    )
    warning_rows = warning_status_result.all()
    warning_total = len(warning_rows)
    warning_completed = sum(1 for r in warning_rows if r[0] == "occupied")
    warning_completion = _calc_ratio(warning_completed, warning_total)

    # ===================================================================
    # E. Leasing Plan Completion Rates (KPI #7)
    # ===================================================================
    plan_agg = await db.execute(
        select(
            func.count(LeasingPlan.id).label("total"),
            func.sum(case((LeasingPlan.status == PlanStatus.COMPLETED, 1), else_=0)).label("completed"),
        ).where(LeasingPlan.mall_id == mall_id, LeasingPlan.due_date >= month_start)
    )
    pd = plan_agg.one()
    plan_total = int(pd.total or 0)
    plan_completed = int(pd.completed or 0)
    leasing_completion = _calc_ratio(plan_completed, plan_total)

    # Early completion (completed >=30 days before due_date)
    early_result = await db.execute(
        select(func.count(LeasingPlan.id)).where(
            LeasingPlan.mall_id == mall_id,
            LeasingPlan.status == PlanStatus.COMPLETED,
            LeasingPlan.completed_date.isnot(None),
            LeasingPlan.due_date >= LeasingPlan.completed_date + timedelta(days=30)
        )
    )
    early_count = early_result.scalar() or 0
    leasing_early = _calc_ratio(early_count, plan_total)

    # ===================================================================
    # F. Vacancy Removal Rate (KPI #10)
    #   Units that changed status this month (have vacancy_days history)
    #   and are now occupied -> successful absorption
    # ===================================================================
    removal_agg = await db.execute(
        select(
            func.count(Unit.id).label("total_changed"),
            func.sum(case((Unit.status == "occupied", 1), else_=0)).label("now_occupied"),
        ).where(Unit.floor_id.in_(floor_ids), Unit.updated_at >= month_start, Unit.vacancy_days.isnot(None))
    )
    rd = removal_agg.one()
    removal_total = int(rd.total_changed or 0)
    removal_occupied = int(rd.now_occupied or 0)
    vacancy_removal = _calc_ratio(removal_occupied, removal_total)

    # ===================================================================
    # G. Lianfa Brand Statistics (KPI #11, #12, #13)
    # ===================================================================
    active_tenant_subq = (
        select(Contract.tenant_id_ref.distinct().label("tid"))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    ).subquery()

    total_active = (await db.execute(select(func.count()).select_from(active_tenant_subq))).scalar() or 0

    lianfa_agg = await db.execute(
        select(
            func.count(Tenant.id).label("count"),
            func.coalesce(func.sum(Unit.gross_area), 0).label("area")
        )
        .join(active_tenant_subq, Tenant.id == active_tenant_subq.c.tid)
        .join(Contract, and_(Contract.tenant_id_ref == Tenant.id, Contract.status == "active"))
        .join(Unit, Unit.id == Contract.unit_id)
        .where(Tenant.brand_tier == BrandTier.LIANFA)
    )
    ld = lianfa_agg.one()
    lianfa_count = int(ld.count or 0)
    lianfa_area = float(ld.area or 0)

    lianfa_ratio = _calc_ratio(lianfa_count, total_active)
    lianfa_area_ratio_calc = _calc_ratio(lianfa_area, leased_area)

    # New Lianfa area this month
    new_lianfa_result = await db.execute(
        select(func.coalesce(func.sum(Unit.gross_area), 0))
        .join(Contract, and_(Contract.unit_id == Unit.id, Contract.created_at >= month_start, Contract.status == "active"))
        .where(Unit.floor_id.in_(floor_ids), Contract.tenant_id_ref.in_(
            select(Tenant.id).where(Tenant.brand_tier == BrandTier.LIANFA)
        ))
    )
    new_lianfa_area_val = float(new_lianfa_result.scalar() or 0)

    # New Lianfa MoM (compare current month vs previous month)
    prev_new_lianfa_result = await db.execute(
        select(func.coalesce(func.sum(Unit.gross_area), 0))
        .join(Contract, and_(
            Contract.unit_id == Unit.id,
            Contract.created_at >= prev_month_start,
            Contract.created_at < month_start,
            Contract.status == "active",
        ))
        .where(Unit.floor_id.in_(floor_ids), Contract.tenant_id_ref.in_(
            select(Tenant.id).where(Tenant.brand_tier == BrandTier.LIANFA)
        ))
    )
    prev_new_lianfa = float(prev_new_lianfa_result.scalar() or 0)
    new_lianfa_mom = _calc_mom(new_lianfa_area_val, prev_new_lianfa)

    # Lianfa total area MoM proxy (use new area trend as indicator)
    lianfa_mom = new_lianfa_mom if new_lianfa_area_val > 0 else 0.0

    # ===================================================================
    # H. Active Contracts Count
    # ===================================================================
    ac_result = await db.execute(
        select(func.count(Contract.id))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    )
    active_contracts = ac_result.scalar() or 0

    # ===================================================================
    # Build Response
    # ===================================================================
    return DashboardStatsResponse(
        mall_id=mall_id,
        mall_name=mall.name,
        period=today.strftime("%Y-%m"),
        kpis=DashboardKPIs(
            # Group 1-2: Growth rates (placeholder - no budget/YTD table yet)
            lease_adjustment_rate=_kpi(leasing_completion, "%", change=0.0),
            cumulative_adjustment_rate=_kpi(leasing_completion, "%", change=0.0),
            # Group 3: Occupancy rates
            dynamic_occupancy_rate=_kpi(dynamic_occupancy, "%"),
            static_occupancy_rate=_kpi(static_occupancy, "%"),
            # Group 4: Vacant area analysis
            vacant_area=_kpi(vacant_area_val, "m²"),
            new_vacant_area=_kpi(curr_nva, "m²", change=new_vacant_mom),
            vacant_area_ratio=_kpi(vacant_area_ratio, "%"),
            # Group 5: Expiring-vacant (area-based, reported in 10k sqm)
            expiring_vacant_count=_kpi(round(eva / 10000, 2), "万m²", change=eva_mom),
            expiring_vacant_ratio=_kpi(expiring_vacant_ratio, "%"),
            # Group 6: Warning-vacant (area-based, reported in 10k sqm)
            warning_vacant_count=_kpi(round(wva / 10000, 2), "万m²", change=wva_mom),
            warning_vacant_ratio=_kpi(warning_vacant_ratio, "%"),
            # Group 7: Leasing plan completion
            leasing_completion_rate=_kpi(leasing_completion, "%"),
            leasing_early_completion_rate=_kpi(leasing_early, "%"),
            # Group 8: Expiring on-time completion
            expiring_completion_rate=_kpi(expiring_completion, "%"),
            # Group 9: Warning on-time completion
            warning_completion_rate=_kpi(warning_completion, "%"),
            # Group 10: Vacancy removal on-time rate
            vacancy_removal_rate=_kpi(vacancy_removal, "%"),
            # Group 11: Lianfa brand ratio
            lianfa_brand_ratio=_kpi(lianfa_ratio, "%"),
            # Group 12: Lianfa total area
            lianfa_total_area=_kpi(round(lianfa_area / 10000, 2), "万m²", change=lianfa_mom),
            lianfa_area_ratio=_kpi(lianfa_area_ratio_calc, "%"),
            # Group 13: New Lianfa area
            new_lianfa_area=_kpi(round(new_lianfa_area_val / 10000, 2), "万m²", change=new_lianfa_mom),
        ),
        summary=DashboardSummary(
            total_units=total_units,
            occupied_units=occupied_units,
            vacant_units=vacant_units,
            total_area=total_area,
            leased_area=leased_area,
            total_tenants=total_active,
            active_contracts=active_contracts,
        ),
    )


# ---------------------------------------------------------------------------
# 2. GET /dashboard/signing-structure?mall_id=
# ---------------------------------------------------------------------------


@router.get("/signing-structure", response_model=SigningStructureResponse)
async def get_signing_structure(
    mall_id: int = Query(..., description="Mall ID"),
    start_date: date | None = Query(None, description="Start date filter (inclusive)"),
    end_date: date | None = Query(None, description="End date filter (inclusive)"),
    db: AsyncSession = Depends(get_db),
):
    """Return new-signed vs renewal contract structure by area and count.

    Classification uses Contract.is_renewal field:
      - is_renewal=True  -> renewal (续签)
      - is_renewal=False or NULL -> new signing (新签, backward compatible)
    """
    await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)

    if not floor_ids:
        return SigningStructureResponse(buckets=[], total_area=0.0, total_count=0)

    today = date.today()
    query_start = start_date or today.replace(day=1)
    query_end = end_date or today

    result = await db.execute(
        select(
            Contract.is_renewal,
            func.count(Contract.id).label("count"),
            func.coalesce(func.sum(Unit.gross_area), 0).label("area")
        )
        .join(Unit, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Contract.created_at >= query_start,
            Contract.created_at <= query_end,
            Contract.status.in_(["active", "expiring"]),
        )
        .group_by(Contract.is_renewal)
    )
    rows = result.all()

    total_area = sum(float(r.area or 0) for r in rows)
    total_count = sum(int(r.count or 0) for r in rows)

    # Aggregate: is_renewal=True -> renewal; else (False/NULL) -> new signing
    renewal_area = sum(float(r.area or 0) for r in rows if r.is_renewal is True)
    renewal_count = sum(int(r.count or 0) for r in rows if r.is_renewal is True)
    new_area = sum(float(r.area or 0) for r in rows if r.is_renewal is not True)
    new_count = sum(int(r.count or 0) for r in rows if r.is_renewal is not True)

    buckets = [
        SigningStructureBucket(
            type="new",
            name="新签",
            area=new_area,
            count=new_count,
            ratio=_calc_ratio(new_area, total_area) if total_area > 0 else 0.0,
        ),
        SigningStructureBucket(
            type="renewal",
            name="续签",
            area=renewal_area,
            count=renewal_count,
            ratio=_calc_ratio(renewal_area, total_area) if total_area > 0 else 0.0,
        ),
    ]

    return SigningStructureResponse(buckets=buckets, total_area=total_area, total_count=total_count)


# ---------------------------------------------------------------------------
# 3. GET /dashboard/brand-tier-trend?mall_id=
# ---------------------------------------------------------------------------


@router.get("/brand-tier-trend", response_model=BrandTierTrendResponse)
async def get_brand_tier_trend(
    mall_id: int = Query(..., description="Mall ID"),
    months: int = Query(6, ge=1, le=12, description="Number of months to analyze"),
    db: AsyncSession = Depends(get_db),
):
    """Return brand tier entry trend with month-over-month comparison.

    For each brand tier (S/A/B/C/lianfa/unknown), returns:
      - new_count: number of new contracts this month
      - month_on_month: % change vs last month
    """
    await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)

    if not floor_ids:
        return BrandTierTrendResponse(items=[], period="")

    today = date.today()
    current_month_start = today.replace(day=1)

    # Subquery: active contract -> tenant mappings in this mall
    contract_tenant_subq = (
        select(Contract.tenant_id_ref.label("tid"), Contract.created_at.label("created"))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    ).subquery()

    # Current month new entries per tier
    current_data = await db.execute(
        select(Tenant.brand_tier, func.count().label("cnt"))
        .join(contract_tenant_subq, Tenant.id == contract_tenant_subq.c.tid)
        .where(contract_tenant_subq.c.created >= current_month_start)
        .group_by(Tenant.brand_tier)
    )
    current_map = {r[0]: int(r[1]) for r in current_data.all()}

    # Previous month (for MoM calculation)
    prev_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
    prev_month_end = current_month_start - timedelta(days=1)

    prev_data = await db.execute(
        select(Tenant.brand_tier, func.count().label("cnt"))
        .join(contract_tenant_subq, Tenant.id == contract_tenant_subq.c.tid)
        .where(contract_tenant_subq.c.created >= prev_month_start,
               contract_tenant_subq.c.created <= prev_month_end)
        .group_by(Tenant.brand_tier)
    )
    prev_map = {r[0]: int(r[1]) for r in prev_data.all()}

    items = []
    for tier_key, tier_name in BRAND_TIER_NAMES.items():
        tier_enum = BrandTier(tier_key) if tier_key != "unknown" else None
        current_cnt = current_map.get(tier_enum, 0)
        prev_cnt = prev_map.get(tier_enum, 0)
        mom = _calc_mom(float(current_cnt), float(prev_cnt))

        items.append(BrandTierTrendItem(
            tier=tier_key,
            tier_name=tier_name,
            new_count=current_cnt,
            month_on_month=mom,
            color=BRAND_TIER_COLORS.get(tier_key, BRAND_TIER_COLORS["unknown"]),
        ))

    return BrandTierTrendResponse(items=items, period=current_month_start.strftime("%Y-%m"))


# ---------------------------------------------------------------------------
# 4. GET /dashboard/project-info?mall_id=
# ---------------------------------------------------------------------------


@router.get("/project-info", response_model=ProjectInfoResponse)
async def get_project_info(
    mall_id: int = Query(..., description="Mall ID"),
    db: AsyncSession = Depends(get_db),
):
    """Return project overview with 4 summary cards.

    Cards:
      1. lease_adjustment  - Leasing adjustment progress (completion rate)
      2. vacancy_analysis  - Vacancy rate and area
      3. leasing_progress  - Urgent plans needing action within 30 days
      4. lianfa_stats      - Lianfa brand cooperation stats
    """
    mall = await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)

    today = date.today()
    month_start = today.replace(day=1)

    cards: list[ProjectInfoCard] = []

    # Card 1: Leasing Adjustment Progress
    plan_agg = await db.execute(
        select(
            func.count(LeasingPlan.id).label("total"),
            func.sum(case((LeasingPlan.status == PlanStatus.COMPLETED, 1), else_=0)).label("completed"),
        ).where(LeasingPlan.mall_id == mall_id, LeasingPlan.due_date >= month_start)
    )
    pr = plan_agg.one()
    p_total = int(pr.total or 0)
    p_done = int(pr.completed or 0)
    p_rate = _calc_ratio(p_done, p_total)

    cards.append(ProjectInfoCard(
        card_id="lease_adjustment",
        title="租费招调",
        value=f"{p_rate}%",
        subtitle=f"完成 {p_done}/{p_total} 项计划",
        change=None,  # Requires historical data for real MoM
        trend="up" if p_rate >= 80 else ("neutral" if p_rate >= 50 else "down"),
    ))

    # Card 2: Vacancy Analysis
    vac_agg = await db.execute(
        select(
            func.count(Unit.id).label("total"),
            func.sum(case((Unit.status == "vacant", 1), else_=0)).label("vacant"),
            func.coalesce(func.sum(Unit.gross_area), 0).label("total_area"),
            func.coalesce(func.sum(case((Unit.status == "vacant", Unit.gross_area), else_=0)), 0).label("vacant_area"),
        ).where(Unit.floor_id.in_(floor_ids))
    )
    vr = vac_agg.one()
    v_total = int(vr.total or 0)
    v_vacant = int(vr.vacant or 0)
    v_va = float(vr.vacant_area or 0)
    v_rate = _calc_ratio(v_vacant, v_total)

    cards.append(ProjectInfoCard(
        card_id="vacancy_analysis",
        title="空置分析",
        value=f"{v_rate}%",
        subtitle=f"{v_vacant}个空铺 / {int(v_va)}m²",
        change=None,
        trend="down" if v_rate < 15 else ("neutral" if v_rate < 25 else "up"),
    ))

    # Card 3: Leasing Progress (urgent items within 30 days)
    urgent_result = await db.execute(
        select(func.count(LeasingPlan.id)).where(
            LeasingPlan.mall_id == mall_id,
            LeasingPlan.status.in_([PlanStatus.DRAFT, PlanStatus.ACTIVE, PlanStatus.IN_PROGRESS]),
            LeasingPlan.due_date <= today + timedelta(days=30),
        )
    )
    urgent_count = urgent_result.scalar() or 0

    cards.append(ProjectInfoCard(
        card_id="leasing_progress",
        title="招商进度",
        value=f"{urgent_count}",
        subtitle="30天内需完成招商项",
        change=None,
        trend="down" if urgent_count > 5 else "neutral",
    ))

    # Card 4: Lianfa Statistics
    lianfa_agg = await db.execute(
        select(
            func.count(Tenant.id).label("count"),
            func.coalesce(func.sum(Unit.gross_area), 0).label("area"),
        )
        .join(Contract, and_(Contract.tenant_id_ref == Tenant.id, Contract.status == "active"))
        .join(Unit, Unit.id == Contract.unit_id)
        .where(Unit.floor_id.in_(floor_ids), Tenant.brand_tier == BrandTier.LIANFA)
    )
    lr = lianfa_agg.one()
    lf_count = int(lr.count or 0)
    lf_area = float(lr.area or 0)

    cards.append(ProjectInfoCard(
        card_id="lianfa_stats",
        title="联发统计",
        value=f"{lf_count}个品牌",
        subtitle=f"合作面积 {int(lf_area)}m² ({round(lf_area/10000, 2)}万m²)",
        change=None,
        trend="up" if lf_count > 0 else "neutral",
    ))

    return ProjectInfoResponse(
        mall_id=mall_id,
        mall_name=mall.name,
        cards=cards,
        updated_at=datetime.now(),
    )


# ---------------------------------------------------------------------------
# 5. GET /dashboard/project-detail?mall_id= - 扩展版项目信息
# ---------------------------------------------------------------------------


@router.get("/project-detail", response_model=ProjectInfoDetailResponse)
async def get_project_detail(
    mall_id: int = Query(..., description="Mall ID"),
    db: AsyncSession = Depends(get_db),
):
    """Return detailed project info with 4 comprehensive cards."""
    mall = await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)

    if not floor_ids:
        return ProjectInfoDetailResponse(
            mall_id=mall_id,
            mall_name=mall.name,
            basic_info=BasicInfoCard(),
            operations=OperationsCard(),
            brand_structure=BrandStructureCard(),
            floor_structure=FloorStructureCard(),
            updated_at=datetime.now(),
        )

    today = date.today()
    today_plus_30 = today + timedelta(days=30)

    # 获取楼宇和楼层统计
    building_result = await db.execute(
        select(func.count(Building.id)).where(Building.mall_id == mall_id)
    )
    building_count = building_result.scalar() or 0

    floor_result = await db.execute(
        select(func.count(Floor.id)).join(Building, Floor.building_id == Building.id).where(Building.mall_id == mall_id)
    )
    floor_count = floor_result.scalar() or 0

    # 基础信息
    unit_agg = await db.execute(
        select(
            func.coalesce(func.sum(Unit.gross_area), 0).label("total_area"),
            func.coalesce(func.sum(case((Unit.status == "occupied", Unit.gross_area), else_=0)), 0).label("leased_area"),
        ).where(Unit.floor_id.in_(floor_ids))
    )
    ua = unit_agg.one()

    basic_info = BasicInfoCard(
        opening_date=mall.created_at.strftime("%Y-%m-%d") if mall.created_at else None,
        operation_category="综合购物中心",
        total_area=float(mall.total_area or 0),
        leasable_area=float(ua.leased_area or 0),
        building_count=building_count,
        floor_count=floor_count,
    )

    # 经营情况（从MockBusinessData聚合）
    from app.models.mock_business_data import MockBusinessData

    biz_data = await db.execute(
        select(
            func.sum(MockBusinessData.daily_traffic).label("total_traffic"),
            func.sum(MockBusinessData.monthly_sales).label("total_sales"),
            func.sum(MockBusinessData.sales_per_sqm * MockBusinessData.daily_traffic).label("weighted_sales_per_sqm"),
            func.avg(MockBusinessData.rent_to_sales_ratio).label("avg_ratio"),
            func.count().label("data_count"),
        )
        .join(Unit, MockBusinessData.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), MockBusinessData.data_date >= today.replace(day=1))
    )
    bd = biz_data.one()

    # 年租金 = 月租金 * 12
    rent_result = await db.execute(
        select(func.coalesce(func.sum(Contract.monthly_rent), 0))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    )
    monthly_rent = rent_result.scalar() or 0

    operations = OperationsCard(
        annual_rent=round(monthly_rent * 12, 2),
        rent_per_sqm=round(float(monthly_rent) / float(ua.leased_area or 1), 2),
        daily_traffic=int(bd.total_traffic or 0),
        monthly_sales=float(bd.total_sales or 0),
        rent_to_sales_ratio=float(bd.avg_ratio or 0),
    )

    # 品牌结构
    active_tenant_subq = (
        select(Contract.tenant_id_ref.distinct().label("tid"))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    ).subquery()

    brand_result = await db.execute(
        select(Tenant.brand_tier, func.count().label("cnt"))
        .join(active_tenant_subq, Tenant.id == active_tenant_subq.c.tid)
        .group_by(Tenant.brand_tier)
    )
    brand_rows = brand_result.all()
    brand_total = sum(r[1] for r in brand_rows)

    brand_items = []
    for tier_enum, count in brand_rows:
        tier_key = tier_enum.value if tier_enum else "unknown"
        brand_items.append(BrandStructureItem(
            tier=tier_key,
            tier_name=BRAND_TIER_NAMES.get(tier_key, tier_key.upper()),
            count=count,
            percentage=round(count / brand_total * 100, 1) if brand_total > 0 else 0,
            color=BRAND_TIER_COLORS.get(tier_key, BRAND_TIER_COLORS["unknown"]),
        ))

    # 确保所有能级都有数据
    existing_tiers = {item.tier for item in brand_items}
    for tier_key, tier_name in BRAND_TIER_NAMES.items():
        if tier_key not in existing_tiers:
            brand_items.append(BrandStructureItem(
                tier=tier_key,
                tier_name=tier_name,
                count=0,
                percentage=0.0,
                color=BRAND_TIER_COLORS.get(tier_key, BRAND_TIER_COLORS["unknown"]),
            ))

    brand_structure = BrandStructureCard(total=brand_total, items=brand_items)

    # 楼层结构（含到期预警）
    floor_structure_result = await db.execute(
        select(
            Floor.id,
            Floor.name,
            Floor.floor_number,
            func.count(Unit.id).label("total"),
            func.sum(case((Unit.status == "occupied", 1), else_=0)).label("occupied"),
            func.sum(case((Unit.status == "vacant", 1), else_=0)).label("vacant"),
            func.coalesce(func.sum(Unit.gross_area), 0).label("total_area"),
            func.coalesce(func.sum(case((Unit.status == "occupied", Unit.gross_area), else_=0)), 0).label("leased_area"),
        )
        .join(Unit, Unit.floor_id == Floor.id)
        .group_by(Floor.id, Floor.name, Floor.floor_number)
        .order_by(Floor.sort_order, Floor.floor_number)
    )
    floor_rows = floor_structure_result.all()

    # Bulk query: expiring contract counts per floor (avoid N+1 in loop)
    expiring_map: dict[int, int] = {}
    if floor_ids:
        expiring_bulk = await db.execute(
            select(Unit.floor_id, func.count(Contract.id))
            .join(Contract, Contract.unit_id == Unit.id)
            .where(
                Unit.floor_id.in_(floor_ids),
                Contract.status == "active",
                Contract.lease_end >= today,
                Contract.lease_end <= today_plus_30,
            )
            .group_by(Unit.floor_id),
        )
        expiring_map = {row[0]: row[1] for row in expiring_bulk.all()}

    floor_items = []
    total_units_sum = 0
    total_occupied_sum = 0
    total_vacant_sum = 0
    total_expiring_sum = 0

    for r in floor_rows:
        total_units = int(r.total or 0)
        occupied = int(r.occupied or 0)
        vacant = int(r.vacant or 0)
        total_area_val = float(r.total_area or 0)
        leased_area_val = float(r.leased_area or 0)
        occupancy_rate = _calc_ratio(occupied, total_units)

        # Look up expiring count from pre-fetched map
        expiring_count = expiring_map.get(r[0], 0)

        floor_items.append(FloorStructureItem(
            floor_id=r[0],
            floor_name=r[1] or f"{r[2]}F",
            floor_number=int(r[2] or 0),
            total_units=total_units,
            occupied_units=occupied,
            vacant_units=vacant,
            occupancy_rate=occupancy_rate,
            total_area=total_area_val,
            leased_area=leased_area_val,
            expiring_count=expiring_count,
        ))

        total_units_sum += total_units
        total_occupied_sum += occupied
        total_vacant_sum += vacant
        total_expiring_sum += expiring_count

    floor_structure = FloorStructureCard(
        total_units=total_units_sum,
        occupied_units=total_occupied_sum,
        vacant_units=total_vacant_sum,
        occupancy_rate=_calc_ratio(total_occupied_sum, total_units_sum),
        expiring_total=total_expiring_sum,
        floors=floor_items,
    )

    return ProjectInfoDetailResponse(
        mall_id=mall_id,
        mall_name=mall.name,
        basic_info=basic_info,
        operations=operations,
        brand_structure=brand_structure,
        floor_structure=floor_structure,
        updated_at=datetime.now(),
    )


# ---------------------------------------------------------------------------
# 以下保留原有端点...
# ---------------------------------------------------------------------------


@router.get("/kanban", response_model=KanbanDataResponse)
async def get_kanban_data(
    mall_id: int = Query(..., description="Mall ID"),
    floor_id: int | None = Query(None, description="Filter by floor ID"),
    status: str | None = Query(None, description="Filter by unit status"),
    db: AsyncSession = Depends(get_db),
):
    """Return kanban board data with units grouped by status."""
    await _validate_mall(db, mall_id)

    base_conditions = [
        Unit.floor_id.in_(
            select(Floor.id).join(Building, Floor.building_id == Building.id).where(Building.mall_id == mall_id)
        )
    ]
    if floor_id is not None:
        base_conditions.append(Unit.floor_id == floor_id)
    if status is not None and status in VALID_STATUSES:
        base_conditions.append(Unit.status == status)

    stmt = (
        select(Unit, Floor.name.label("floor_name"), Tenant.name.label("tenant_name"),
               Tenant.brand_tier.label("brand_tier"), Contract.monthly_rent.label("monthly_rent"))
        .join(Floor, Unit.floor_id == Floor.id)
        .outerjoin(Contract, and_(Unit.id == Contract.unit_id, Contract.status == "active"))
        .outerjoin(Tenant, Contract.tenant_id_ref == Tenant.id)
        .where(and_(*base_conditions))
        .order_by(Floor.sort_order, Unit.code)
    )
    result = await db.execute(stmt)
    rows = result.all()

    columns_map: dict[str, list[KanbanCardSchema]] = {}
    for row in rows:
        unit = row[0]
        card = KanbanCardSchema(
            unit_id=unit.id,
            unit_code=unit.code,
            area=unit.gross_area,
            floor_name=row.floor_name or "",
            layout_type=unit.layout_type.value if unit.layout_type else "",
            tenant_name=row.tenant_name,
            brand_tier=row.brand_tier.value if row.brand_tier else None,
            vacancy_days=unit.vacancy_days,
            monthly_rent=float(row.monthly_rent) if row.monthly_rent else None,
        )
        status_key = unit.status.value
        if status_key not in columns_map:
            columns_map[status_key] = []
        columns_map[status_key].append(card)

    columns: list[KanbanColumnSchema] = []
    for status_key in ("vacant", "reserved", "occupied", "maintenance", "blocked"):
        cards = columns_map.get(status_key, [])
        total_area = sum(c.area for c in cards if c.area is not None)
        columns.append(KanbanColumnSchema(
            id=status_key, title=KANBAN_STATUS_MAP[status_key],
            unit_count=len(cards), total_area=round(total_area, 2), cards=cards,
        ))

    return KanbanDataResponse(columns=columns)


@router.put("/kanban/move", response_model=KanbanMoveResponse)
async def move_kanban_card(
    body: KanbanMoveRequest,
    db: AsyncSession = Depends(get_db),
):
    """Move a unit to a new kanban status column."""
    if body.new_status not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status: {body.new_status}")

    result = await db.execute(select(Unit).where(Unit.id == body.unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    old_status = unit.status.value
    unit.status = body.new_status

    if body.new_status == "occupied":
        unit.vacancy_days = None
    elif body.new_status == "vacant":
        unit.vacancy_days = 0

    await db.flush()
    await db.refresh(unit)

    return KanbanMoveResponse(unit_id=unit.id, old_status=old_status, new_status=unit.status.value)


@router.get("/vacancy", response_model=VacancyAnalysisResponse)
async def get_vacancy_analysis(
    mall_id: int = Query(..., description="Mall ID"),
    db: AsyncSession = Depends(get_db),
):
    """Analyze vacant units bucketed by vacancy duration."""
    await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)

    if not floor_ids:
        return VacancyAnalysisResponse(buckets=[], total_vacant_area=0.0, total_vacant_count=0)

    result = await db.execute(
        select(Unit.vacancy_days, Unit.gross_area)
        .where(Unit.floor_id.in_(floor_ids), Unit.status == "vacant")
    )
    rows = result.all()

    buckets_data = [
        {"name": "短期空置", "color": "#22c55e", "count": 0, "area": 0.0},
        {"name": "中期空置", "color": "#f59e0b", "count": 0, "area": 0.0},
        {"name": "长期空置", "color": "#f97316", "count": 0, "area": 0.0},
        {"name": "超长期空置", "color": "#ef4444", "count": 0, "area": 0.0},
    ]

    for vd, area in rows:
        days = vd if vd is not None else 0
        area_val = float(area) if area else 0.0
        if days < 90:
            idx = 0
        elif days < 181:
            idx = 1
        elif days < 365:
            idx = 2
        else:
            idx = 3
        buckets_data[idx]["count"] += 1
        buckets_data[idx]["area"] += area_val

    buckets = [
        VacancyBucketSchema(name=b["name"], value=round(b["area"], 2), count=b["count"], color=b["color"])
        for b in buckets_data
    ]

    return VacancyAnalysisResponse(
        buckets=buckets,
        total_vacant_area=round(sum(b.value for b in buckets), 2),
        total_vacant_count=sum(b.count for b in buckets),
    )


@router.get("/lease-term", response_model=LeaseTermResponse)
async def get_lease_term_distribution(
    mall_id: int = Query(..., description="Mall ID"),
    db: AsyncSession = Depends(get_db),
):
    """Distribution of active contracts by lease term length."""
    await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)

    if not floor_ids:
        return LeaseTermResponse(buckets=[])

    result = await db.execute(
        select(Contract.lease_start, Contract.lease_end, Unit.gross_area)
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    )
    rows = result.all()

    term_buckets = {
        "1年以下": {"count": 0, "area": 0.0},
        "1-2年": {"count": 0, "area": 0.0},
        "2-3年": {"count": 0, "area": 0.0},
        "3-5年": {"count": 0, "area": 0.0},
        "5年以上": {"count": 0, "area": 0.0},
    }

    for lease_start, lease_end, area in rows:
        days = (lease_end - lease_start).days
        area_val = float(area) if area else 0.0
        if days < 365:
            key = "1年以下"
        elif days < 731:
            key = "1-2年"
        elif days < 1096:
            key = "2-3年"
        elif days < 1826:
            key = "3-5年"
        else:
            key = "5年以上"
        term_buckets[key]["count"] += 1
        term_buckets[key]["area"] += area_val

    buckets = [
        LeaseTermBucketSchema(term=k, count=v["count"], area=round(v["area"], 2))
        for k, v in term_buckets.items()
    ]

    return LeaseTermResponse(buckets=buckets)


@router.get("/brand-tier", response_model=BrandTierResponse)
async def get_brand_tier_breakdown(
    mall_id: int = Query(..., description="Mall ID"),
    db: AsyncSession = Depends(get_db),
):
    """Breakdown of tenants by brand tier for this mall."""
    await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)

    if not floor_ids:
        return BrandTierResponse(buckets=[], total=0)

    subq = (
        select(Contract.tenant_id_ref.distinct().label("tid"))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    ).subquery()

    result = await db.execute(
        select(Tenant.brand_tier.label("tier"), func.count().label("cnt"))
        .join(subq, Tenant.id == subq.c.tid)
        .group_by(Tenant.brand_tier)
    )
    rows = result.all()

    total = sum(r[1] for r in rows)

    buckets = []
    for r in rows:
        tier_val = r[0]
        tier_key = "unknown" if tier_val is None else (tier_val.value if hasattr(tier_val, "value") else str(tier_val))
        buckets.append(BrandTierBucketSchema(
            name=tier_key,
            value=r[1],
            color=BRAND_TIER_COLORS.get(tier_key, BRAND_TIER_COLORS["unknown"]),
            percentage=round(r[1] / total * 100, 1) if total > 0 else 0.0,
        ))

    existing_tiers = {str(b.name).lower() for b in buckets}
    for tier_key, color in BRAND_TIER_COLORS.items():
        if tier_key not in existing_tiers:
            buckets.append(BrandTierBucketSchema(name=tier_key, value=0, color=color, percentage=0.0))

    return BrandTierResponse(buckets=buckets, total=total)


@router.get("/expiring", response_model=ExpiringContractsResponse)
async def get_expiring_contracts(
    mall_id: int = Query(..., description="Mall ID"),
    days: int = Query(30, ge=1, le=365, description="Days threshold"),
    db: AsyncSession = Depends(get_db),
):
    """List contracts expiring within N days."""
    await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)
    today = date.today()
    end_date = today + timedelta(days=days)

    if not floor_ids:
        return ExpiringContractsResponse(items=[], total=0)

    result = await db.execute(
        select(Contract.id, Contract.contract_number, Unit.code, Tenant.name,
               Contract.lease_end, Contract.monthly_rent, Contract.status)
        .join(Unit, Contract.unit_id == Unit.id)
        .outerjoin(Tenant, Contract.tenant_id_ref == Tenant.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.lease_end >= today, Contract.lease_end <= end_date)
        .order_by(Contract.lease_end.asc())
        .limit(10)
    )
    rows = result.all()

    items = [
        ExpiringContractItem(
            contract_id=r[0], contract_number=r[1], unit_code=r[2], tenant_name=r[3],
            lease_end=r[4], days_remaining=(r[4] - today).days,
            monthly_rent=float(r[5]) if r[5] else None,
            status=r[6].value if hasattr(r[6], "value") else str(r[6]),
        )
        for r in rows
    ]

    count_result = await db.execute(
        select(func.count(Contract.id))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.lease_end >= today, Contract.lease_end <= end_date)
    )
    total = count_result.scalar() or 0

    return ExpiringContractsResponse(items=items, total=total)


@router.get("/tools/units", response_model=ToolUnitsResponse)
async def query_units_tool(
    mall_id: int = Query(..., description="Mall ID"),
    building_id: int | None = Query(None),
    floor_id: int | None = Query(None),
    status: str | None = Query(None),
    area_min: float | None = Query(None),
    area_max: float | None = Query(None),
    rent_min: float | None = Query(None),
    rent_max: float | None = Query(None),
    leasing_type: str | None = Query(None, description="Filter by leasing type: new/renewal/adjustment"),
    layout_type: str | None = Query(None, description="Filter by layout type"),
    db: AsyncSession = Depends(get_db),
):
    """Rich unit query for the units tool page with leasing info."""
    await _validate_mall(db, mall_id)

    if floor_id is not None:
        floor_filter = Unit.floor_id == floor_id
    elif building_id is not None:
        floor_filter = Unit.floor_id.in_(select(Floor.id).where(Floor.building_id == building_id))
    else:
        floor_filter = Unit.floor_id.in_(
            select(Floor.id).join(Building, Floor.building_id == Building.id).where(Building.mall_id == mall_id)
        )

    base_conditions = [floor_filter]
    if status is not None and status in VALID_STATUSES:
        base_conditions.append(Unit.status == status)
    if leasing_type is not None:
        base_conditions.append(Unit.leasing_type == leasing_type)
    if layout_type is not None:
        try:
            from app.models.unit import UnitLayoutType
            base_conditions.append(Unit.layout_type == UnitLayoutType(layout_type))
        except ValueError:
            pass

    stmt = (
        select(Unit, Floor.floor_number, Floor.name.label("floor_name"), Building.id.label("bid"),
               Building.name.label("building_name"), Tenant.name.label("tenant_name"),
               Contract.monthly_rent.label("monthly_rent"), Contract.lease_end.label("lease_end"))
        .join(Floor, Unit.floor_id == Floor.id)
        .join(Building, Floor.building_id == Building.id)
        .outerjoin(Contract, and_(Unit.id == Contract.unit_id, Contract.status == "active"))
        .outerjoin(Tenant, Contract.tenant_id_ref == Tenant.id)
        .where(and_(*base_conditions))
        .order_by(Building.name, Floor.floor_number, Unit.code)
    )

    if area_min is not None:
        stmt = stmt.where(Unit.gross_area >= area_min)
    if area_max is not None:
        stmt = stmt.where(Unit.gross_area <= area_max)
    if rent_min is not None:
        stmt = stmt.where(Contract.monthly_rent >= rent_min)
    if rent_max is not None:
        stmt = stmt.where(Contract.monthly_rent <= rent_max)

    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for row in rows:
        unit = row[0]
        items.append(ToolUnitRow(
            id=unit.id,
            unit_code=unit.code,
            floor_id=unit.floor_id,
            floor_number=int(row[1] or 0),
            floor_name=row[2] or "",
            building_id=int(row[3] or 0),
            building_name=row[4] or "",
            area=float(unit.gross_area or 0),
            layout_type=unit.layout_type.value if unit.layout_type else "",
            status=unit.status.value,
            tenant_name=row[5],
            monthly_rent=float(row[6]) if row[6] else None,
            mall_id=mall_id,
            # 新增招商字段
            leasing_type=unit.leasing_type,
            lease_end=row[7].isoformat() if row[7] else None,
            vacancy_days=unit.vacancy_days,
            previous_rent=None,  # Historical contract rent (to be implemented)
        ))

    return ToolUnitsResponse(data=items, total=len(items))


@router.get("/tools/brands", response_model=ToolBrandsResponse)
async def query_brands_tool(
    mall_id: int = Query(..., description="Mall ID"),
    search: str = Query("", description="Search tenant name"),
    tier: str = Query("", description="Filter by brand tier"),
    status: str = Query("", description="Filter by tenant status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(15, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Brand/tenant query with tier, contract aggregation, and business metrics."""
    await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)

    if not floor_ids:
        return ToolBrandsResponse(data=[], total=0)

    tenant_subq = (
        select(Contract.tenant_id_ref.distinct().label("tid"))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    ).subquery()

    conds = []
    if search:
        conds.append(Tenant.name.ilike(f"%{search}%"))
    if tier:
        try:
            conds.append(Tenant.brand_tier == BrandTier(tier))
        except ValueError:
            pass
    if status:
        conds.append(Tenant.status == status)

    count_stmt = select(func.count()).select_from(Tenant).join(tenant_subq, Tenant.id == tenant_subq.c.tid)
    if conds:
        count_stmt = count_stmt.where(and_(*conds))
    total = (await db.execute(count_stmt)).scalar() or 0

    # 主查询 - 获取租户基本信息和合同聚合
    data_stmt = (
        select(Tenant.id, Tenant.name, Tenant.brand_tier, Tenant.type, Tenant.status,
               func.count(Contract.id).label("contract_count"),
               func.coalesce(func.sum(Unit.gross_area), 0).label("total_area"),
               func.coalesce(func.sum(Contract.monthly_rent.cast(Float)), 0).label("total_rent"))
        .outerjoin(Contract, Contract.tenant_id_ref == Tenant.id)
        .outerjoin(Unit, and_(Contract.unit_id == Unit.id, Unit.floor_id.in_(floor_ids)))
        .join(tenant_subq, Tenant.id == tenant_subq.c.tid)
        .where(and_(*conds) if conds else True)
        .group_by(Tenant.id, Tenant.name, Tenant.brand_tier, Tenant.type, Tenant.status)
        .order_by(Tenant.name)
        .offset(skip)
        .limit(limit)
    )
    rows = (await db.execute(data_stmt)).all()

    # 获取所有tenant_id以批量查询经营数据
    tenant_ids = [r[0] for r in rows]

    # 批量查询MockBusinessData
    from app.models.mock_business_data import MockBusinessData

    biz_metrics_map: dict[int, dict] = {}
    if tenant_ids:
        biz_result = await db.execute(
            select(
                MockBusinessData.tenant_id_ref,
                func.avg(MockBusinessData.daily_traffic).label("avg_traffic"),
                func.avg(MockBusinessData.daily_sales).label("avg_daily_sales"),
                func.avg(MockBusinessData.sales_per_sqm).label("avg_sales_per_sqm"),
                func.avg(MockBusinessData.rent_to_sales_ratio).label("avg_ratio"),
            )
            .join(Unit, MockBusinessData.unit_id == Unit.id)
            .where(
                Unit.floor_id.in_(floor_ids),
                MockBusinessData.tenant_id_ref.in_(tenant_ids),
                MockBusinessData.data_date >= date.today().replace(day=1)
            )
            .group_by(MockBusinessData.tenant_id_ref)
        )
        for br in biz_result.all():
            biz_metrics_map[br[0]] = {
                "avg_traffic": float(br[1]) if br[1] else None,
                "avg_daily_sales": float(br[2]) if br[2] else None,
                "avg_sales_per_sqm": float(br[3]) if br[3] else None,
                "avg_ratio": float(br[4]) if br[4] else None,
            }

    items = []
    for r in rows:
        tenant_id = r[0]
        monthly_rent_val = float(r[7] or 0)
        biz = biz_metrics_map.get(tenant_id, {})

        items.append(ToolBrandRow(
            id=tenant_id,
            tenant_name=r[1],
            brand_tier=r[2].value if r[2] else None,
            type=r[3] or "",
            contract_count=int(r[5] or 0),
            total_area=float(r[6] or 0),
            monthly_rent=monthly_rent_val,
            status=r[4].value if hasattr(r[4], "value") else str(r[4] or ""),
            # 经营数据指标
            avg_daily_traffic=biz.get("avg_traffic"),
            avg_daily_sales=biz.get("avg_daily_sales"),
            avg_monthly_sales_per_sqm=biz.get("avg_sales_per_sqm"),
            avg_rent_to_sales_ratio=biz.get("avg_ratio"),
            annual_rent_income=round(monthly_rent_val * 12, 2) if monthly_rent_val > 0 else None,
        ))

    return ToolBrandsResponse(data=items, total=total)


@router.get("/floor-summary", response_model=FloorSummaryResponse)
async def get_floor_summary(
    mall_id: int = Query(..., description="Mall ID"),
    db: AsyncSession = Depends(get_db),
):
    """Per-floor occupied/vacant unit counts."""
    await _validate_mall(db, mall_id)

    result = await db.execute(
        select(Floor.name.label("floor_name"),
               func.sum(case((Unit.status == "occupied", 1), else_=0)).label("occupied"),
               func.sum(case((Unit.status == "vacant", 1), else_=0)).label("vacant"))
        .join(Building, Floor.building_id == Building.id)
        .outerjoin(Unit, Unit.floor_id == Floor.id)
        .where(Building.mall_id == mall_id)
        .group_by(Floor.id, Floor.name)
        .order_by(Floor.sort_order, Floor.floor_number)
    )
    rows = result.all()

    floors = [
        FloorSummaryRow(floor_name=r[0] or "-", occupied=int(r[1] or 0), vacant=int(r[2] or 0))
        for r in rows
    ]

    return FloorSummaryResponse(floors=floors)
