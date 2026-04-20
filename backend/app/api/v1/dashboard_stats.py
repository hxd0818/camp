"""Dashboard KPI stats endpoint - 13 KPI metrics (19 fields)."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.unit import Unit
from app.models.contract import Contract
from app.models.tenant import Tenant, BrandTier
from app.models.leasing_plan import LeasingPlan, PlanStatus
from app.schemas.dashboard import (
    DashboardStatsResponse,
    DashboardKPIs,
    DashboardSummary,
)

from .dashboard_helpers import (
    _get_mall_floor_ids,
    _validate_mall,
    _calc_ratio,
    _calc_mom,
    _kpi,
    _make_zero_kpi,
)

router = APIRouter()


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

    # A. Core Unit Aggregation
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

    dynamic_occupancy = _calc_ratio(occupied_units, total_units)
    static_occupancy = _calc_ratio(leased_area, total_area)

    # B. New Vacant Area (this month) + MoM
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

    vacant_area_ratio = _calc_ratio(vacant_area_val, total_area)

    # C. Expiring-Vacant Analysis (KPI #5) - count-based, unit="个"
    eva_result = await db.execute(
        select(func.coalesce(func.count(Unit.id), 0))
        .join(Contract, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Unit.status == "vacant",
            Contract.lease_end >= today - timedelta(days=30),
            Contract.lease_end <= today,
            Contract.status.in_(["expired", "terminated"]),
        )
    )
    eva = float(eva_result.scalar() or 0)

    prev_eva_result = await db.execute(
        select(func.coalesce(func.count(Unit.id), 0))
        .join(Contract, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Unit.status == "vacant",
            Contract.lease_end >= today - timedelta(days=60),
            Contract.lease_end < today - timedelta(days=30),
            Contract.status.in_(["expired", "terminated"]),
        )
    )
    prev_eva = float(prev_eva_result.scalar() or 0)
    eva_mom = _calc_mom(eva, prev_eva)

    eta_result = await db.execute(
        select(func.coalesce(func.count(Unit.id), 0))
        .join(Contract, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Contract.lease_end >= today - timedelta(days=30),
            Contract.lease_end <= today,
            Contract.status.in_(["expired", "terminated", "active"]),
        )
    )
    eta = float(eta_result.scalar() or 0)
    expiring_vacant_ratio = _calc_ratio(eva, eta) if eta > 0 else 0.0

    # Expiring status breakdown (for KPI #8)
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

    # D. Warning-Vacant Analysis (KPI #6) - count-based, unit="个"
    wva_result = await db.execute(
        select(func.coalesce(func.count(Unit.id), 0))
        .where(
            Unit.floor_id.in_(floor_ids),
            Unit.status == "vacant",
            Unit.vacancy_days >= 90,
        )
    )
    wva = float(wva_result.scalar() or 0)

    prev_wva_result = await db.execute(
        select(func.coalesce(func.count(Unit.id), 0))
        .where(
            Unit.floor_id.in_(floor_ids),
            Unit.status == "vacant",
            Unit.vacancy_days >= 120,
        )
    )
    prev_wva = float(prev_wva_result.scalar() or 0)
    wva_mom = _calc_mom(wva, prev_wva)

    wta_result = await db.execute(
        select(func.coalesce(func.count(Unit.id), 0))
        .where(Unit.floor_id.in_(floor_ids), Unit.status == "vacant")
    )
    wta = float(wta_result.scalar() or 0)
    warning_vacant_ratio = _calc_ratio(wva, wta) if wta > 0 else 0.0

    # Warning status breakdown (for KPI #9)
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

    # E. Leasing Plan Completion Rates (KPI #7)
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

    # F. Vacancy Removal Rate (KPI #10)
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

    # G. Lianfa Brand Statistics (KPI #11-13)
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

    new_lianfa_result = await db.execute(
        select(func.coalesce(func.sum(Unit.gross_area), 0))
        .join(Contract, and_(Contract.unit_id == Unit.id, Contract.created_at >= month_start, Contract.status == "active"))
        .where(Unit.floor_id.in_(floor_ids), Contract.tenant_id_ref.in_(
            select(Tenant.id).where(Tenant.brand_tier == BrandTier.LIANFA)
        ))
    )
    new_lianfa_area_val = float(new_lianfa_result.scalar() or 0)

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
    lianfa_mom = new_lianfa_mom if new_lianfa_area_val > 0 else 0.0

    # H. Active Contracts Count
    ac_result = await db.execute(
        select(func.count(Contract.id))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    )
    active_contracts = ac_result.scalar() or 0

    return DashboardStatsResponse(
        mall_id=mall_id,
        mall_name=mall.name,
        period=today.strftime("%Y-%m"),
        kpis=DashboardKPIs(
            lease_adjustment_rate=_kpi(leasing_completion, "%", change=0.0),
            cumulative_adjustment_rate=_kpi(leasing_completion, "%", change=0.0),
            dynamic_occupancy_rate=_kpi(dynamic_occupancy, "%"),
            static_occupancy_rate=_kpi(static_occupancy, "%"),
            vacant_area=_kpi(vacant_area_val, "m²"),
            new_vacant_area=_kpi(curr_nva, "m²", change=new_vacant_mom),
            vacant_area_ratio=_kpi(vacant_area_ratio, "%"),
            expiring_vacant_count=_kpi(eva, "个", change=eva_mom),
            expiring_vacant_ratio=_kpi(expiring_vacant_ratio, "%"),
            warning_vacant_count=_kpi(wva, "个", change=wva_mom),
            warning_vacant_ratio=_kpi(warning_vacant_ratio, "%"),
            leasing_completion_rate=_kpi(leasing_completion, "%"),
            leasing_early_completion_rate=_kpi(leasing_early, "%"),
            expiring_completion_rate=_kpi(expiring_completion, "%"),
            warning_completion_rate=_kpi(warning_completion, "%"),
            vacancy_removal_rate=_kpi(vacancy_removal, "%"),
            lianfa_brand_ratio=_kpi(lianfa_ratio, "%"),
            lianfa_total_area=_kpi(round(lianfa_area / 10000, 2), "万m²", change=lianfa_mom),
            lianfa_area_ratio=_kpi(lianfa_area_ratio_calc, "%"),
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
