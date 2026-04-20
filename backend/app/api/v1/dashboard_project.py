"""Dashboard project info endpoints: project-info, project-detail, floor-summary."""

from datetime import datetime, date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Float

from app.database import get_db
from app.models.mall import Mall, Floor, Building
from app.models.unit import Unit
from app.models.contract import Contract
from app.models.tenant import Tenant, BrandTier
from app.models.leasing_plan import LeasingPlan, PlanStatus
from app.schemas.dashboard import (
    ProjectInfoResponse,
    ProjectInfoCard,
    ProjectInfoDetailResponse,
    BasicInfoCard,
    OperationsCard,
    BrandStructureCard,
    BrandStructureItem,
    FloorStructureCard,
    FloorStructureItem,
    FloorSummaryResponse,
    FloorSummaryRow,
)

from .dashboard_helpers import (
    _validate_mall,
    _get_mall_floor_ids,
    _calc_ratio,
    BRAND_TIER_COLORS,
    BRAND_TIER_NAMES,
)

router = APIRouter()


@router.get("/project-info", response_model=ProjectInfoResponse)
async def get_project_info(
    mall_id: int = Query(..., description="Mall ID"),
    db: AsyncSession = Depends(get_db),
):
    """Return project overview with 4 summary cards."""
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
        card_id="lease_adjustment", title="租费招调",
        value=f"{p_rate}%", subtitle=f"完成 {p_done}/{p_total} 项计划",
        change=None, trend="up" if p_rate >= 80 else ("neutral" if p_rate >= 50 else "down"),
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
        card_id="vacancy_analysis", title="空置分析",
        value=f"{v_rate}%", subtitle=f"{v_vacant}个空铺 / {int(v_va)}m²",
        change=None, trend="down" if v_rate < 15 else ("neutral" if v_rate < 25 else "up"),
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
        card_id="leasing_progress", title="招商进度",
        value=f"{urgent_count}", subtitle="30天内需完成招商项",
        change=None, trend="down" if urgent_count > 5 else "neutral",
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
        card_id="lianfa_stats", title="联发统计",
        value=f"{lf_count}个品牌",
        subtitle=f"合作面积 {int(lf_area)}m² ({round(lf_area/10000, 2)}万m²)",
        change=None, trend="up" if lf_count > 0 else "neutral",
    ))

    return ProjectInfoResponse(mall_id=mall_id, mall_name=mall.name, cards=cards, updated_at=datetime.now())


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
            mall_id=mall_id, mall_name=mall.name,
            basic_info=BasicInfoCard(), operations=OperationsCard(),
            brand_structure=BrandStructureCard(), floor_structure=FloorStructureCard(),
            updated_at=datetime.now(),
        )

    today = date.today()
    today_plus_30 = today + timedelta(days=30)

    building_result = await db.execute(select(func.count(Building.id)).where(Building.mall_id == mall_id))
    building_count = building_result.scalar() or 0

    floor_result = await db.execute(
        select(func.count(Floor.id)).join(Building, Floor.building_id == Building.id).where(Building.mall_id == mall_id)
    )
    floor_count = floor_result.scalar() or 0

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
            tier=tier_key, tier_name=BRAND_TIER_NAMES.get(tier_key, tier_key.upper()),
            count=count, percentage=round(count / brand_total * 100, 1) if brand_total > 0 else 0,
            color=BRAND_TIER_COLORS.get(tier_key, BRAND_TIER_COLORS["unknown"]),
        ))

    existing_tiers = {item.tier for item in brand_items}
    for tier_key, tier_name in BRAND_TIER_NAMES.items():
        if tier_key not in existing_tiers:
            brand_items.append(BrandStructureItem(
                tier=tier_key, tier_name=tier_name,
                count=0, percentage=0.0,
                color=BRAND_TIER_COLORS.get(tier_key, BRAND_TIER_COLORS["unknown"]),
            ))

    brand_structure = BrandStructureCard(total=brand_total, items=brand_items)

    # Floor structure with bulk expiring query (N+1 fix)
    floor_structure_result = await db.execute(
        select(Floor.id, Floor.name, Floor.floor_number,
               func.count(Unit.id).label("total"),
               func.sum(case((Unit.status == "occupied", 1), else_=0)).label("occupied"),
               func.sum(case((Unit.status == "vacant", 1), else_=0)).label("vacant"),
               func.coalesce(func.sum(Unit.gross_area), 0).label("total_area"),
               func.coalesce(func.sum(case((Unit.status == "occupied", Unit.gross_area), else_=0)), 0).label("leased_area"),
        ).join(Unit, Unit.floor_id == Floor.id)
        .group_by(Floor.id, Floor.name, Floor.floor_number)
        .order_by(Floor.sort_order, Floor.floor_number)
    )
    floor_rows = floor_structure_result.all()

    expiring_map: dict[int, int] = {}
    if floor_ids:
        expiring_bulk = await db.execute(
            select(Unit.floor_id, func.count(Contract.id))
            .join(Contract, Contract.unit_id == Unit.id)
            .where(Unit.floor_id.in_(floor_ids), Contract.status == "active",
                   Contract.lease_end >= today, Contract.lease_end <= today_plus_30)
            .group_by(Unit.floor_id)
        )
        expiring_map = {row[0]: row[1] for row in expiring_bulk.all()}

    floor_items = []
    total_units_sum = 0
    total_occupied_sum = 0
    total_vacant_sum = 0
    total_expiring_sum = 0

    for r in floor_rows:
        t = int(r.total or 0); occ = int(r.occupied or 0); vac = int(r.vacant or 0)
        ta = float(r.total_area or 0); la = float(r.leased_area or 0)
        oc = _calc_ratio(occ, t)
        ec = expiring_map.get(r[0], 0)
        floor_items.append(FloorStructureItem(floor_id=r[0], floor_name=r[1] or f"{r[2]}F",
            floor_number=int(r[2] or 0), total_units=t, occupied_units=occ, vacant_units=vac,
            occupancy_rate=oc, total_area=ta, leased_area=la, expiring_count=ec))
        total_units_sum += t; total_occupied_sum += occ; total_vacant_sum += vac; total_expiring_sum += ec

    floor_structure = FloorStructureCard(total_units=total_units_sum, occupied_units=total_occupied_sum,
                                     vacant_units=total_vacant_sum, occupancy_rate=_calc_ratio(total_occupied_sum, total_units_sum),
                                     expiring_total=total_expiring_sum, floors=floor_items)

    return ProjectInfoDetailResponse(mall_id=mall_id, mall_name=mall.name, basic_info=basic_info,
                                         operations=operations, brand_structure=brand_structure,
                                         floor_structure=floor_structure, updated_at=datetime.now())


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

    items = [
        FloorSummaryRow(floor_name=r[0] or "", occupied=int(r[1] or 0), vacant=int(r[2] or 0))
        for r in rows
    ]

    return FloorSummaryResponse(items=items)
