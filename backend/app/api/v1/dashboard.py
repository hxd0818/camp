"""Dashboard aggregation APIs - core of CAMP Kanban dashboard.

Provides 7 endpoints for KPI stats, kanban board, vacancy analysis,
lease term distribution, brand tier breakdown, and expiring contracts.
"""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, case, and_, desc, Float
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.mall import Mall, Floor, Building
from app.models.unit import Unit
from app.models.contract import Contract
from app.models.tenant import Tenant
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
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# ---------------------------------------------------------------------------
# Helpers
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


# ---------------------------------------------------------------------------
# 1. GET /dashboard/stats?mall_id=
# ---------------------------------------------------------------------------


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    mall_id: int = Query(..., description="Mall ID"),
    db: AsyncSession = Depends(get_db),
):
    """Return 6 KPI metrics + summary for a mall.

    Uses consolidated queries to minimize DB round-trips.
    Note: asyncio.gather cannot be used with a single AsyncSession
    because SQLAlchemy's async session is not concurrency-safe.
    """
    mall = await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)

    if not floor_ids:
        # No floors yet -- return zeros
        zero_kpi = KPIMetric(value=0.0, unit="")
        return DashboardStatsResponse(
            mall_id=mall_id,
            mall_name=mall.name,
            period="today",
            kpis=DashboardKPIs(
                occupancy_rate=KPIMetric(value=0.0, unit="%"),
                vacant_area=zero_kpi,
                monthly_revenue=zero_kpi,
                expiring_count=KPIMetric(value=0.0, unit="个"),
                leasing_completion=KPIMetric(value=0.0, unit="%"),
                lianfa_ratio=KPIMetric(value=0.0, unit="%"),
            ),
            summary=DashboardSummary(
                total_units=0,
                occupied_units=0,
                vacant_units=0,
                total_area=0.0,
                leased_area=0.0,
                total_tenants=0,
                active_contracts=0,
            ),
        )

    today = date.today()
    today_plus_30 = today + timedelta(days=30)

    # --- Query 1: Unit aggregates (counts by status + area sums) ---
    unit_agg = await db.execute(
        select(
            func.count(Unit.id).label("total"),
            func.sum(case((Unit.status == "occupied", 1), else_=0)).label("occupied"),
            func.sum(case((Unit.status == "vacant", 1), else_=0)).label("vacant"),
            func.sum(case((Unit.status.in_(["occupied", "reserved"]), 1), else_=0)).label("completed"),
            func.coalesce(func.sum(Unit.gross_area), 0).label("total_area"),
            func.coalesce(
                func.sum(case((Unit.status == "occupied", Unit.gross_area), else_=0)), 0
            ).label("leased_area"),
            func.coalesce(
                func.sum(case((Unit.status == "vacant", Unit.gross_area), else_=0)), 0
            ).label("vacant_area"),
        ).where(Unit.floor_id.in_(floor_ids))
    )
    ua = unit_agg.one()

    total_units = int(ua.total or 0)
    occupied_units = int(ua.occupied or 0)
    vacant_units = int(ua.vacant or 0)
    completed_units = int(ua.completed or 0)
    total_area = float(ua.total_area or 0)
    leased_area = float(ua.leased_area or 0)
    vacant_area_val = float(ua.vacant_area or 0)

    occupancy_rate = round(occupied_units / total_units * 100, 2) if total_units > 0 else 0.0
    leasing_completion = round(completed_units / total_units * 100, 2) if total_units > 0 else 0.0

    # --- Query 2: Active contract revenue ---
    rev_result = await db.execute(
        select(func.coalesce(func.sum(Contract.monthly_rent.cast(Float)), 0))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    )
    monthly_revenue = float(rev_result.scalar() or 0)

    # --- Query 3: Expiring contracts count ---
    expiring_result = await db.execute(
        select(func.count(Contract.id))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Contract.lease_end >= today,
            Contract.lease_end <= today_plus_30,
        )
    )
    expiring_count = expiring_result.scalar() or 0

    # --- Query 4: Lianfa ratio ---
    active_tenant_subq = (
        select(Contract.tenant_id_ref.distinct().label("tid"))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    ).subquery()

    total_active = (
        await db.execute(select(func.count()).select_from(active_tenant_subq))
    ).scalar() or 0

    if total_active > 0:
        lianfa_count = (
            await db.execute(
                select(func.count(Tenant.id))
                .join(active_tenant_subq, Tenant.id == active_tenant_subq.c.tid)
                .where(Tenant.brand_tier == "lianfa")
            )
        ).scalar() or 0
        lianfa_ratio = round(lianfa_count / total_active * 100, 2)
    else:
        lianfa_ratio = 0.0

    # --- Query 5: Summary - distinct tenants and active contract count ---
    tenant_count = (
        await db.execute(select(func.count()).select_from(active_tenant_subq))
    ).scalar() or 0

    active_contract_count = (
        await db.execute(
            select(func.count(Contract.id))
            .join(Unit, Contract.unit_id == Unit.id)
            .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
        )
    ).scalar() or 0

    return DashboardStatsResponse(
        mall_id=mall_id,
        mall_name=mall.name,
        period="today",
        kpis=DashboardKPIs(
            occupancy_rate=KPIMetric(value=occupancy_rate, unit="%"),
            vacant_area=KPIMetric(value=vacant_area_val, unit="sqm"),
            monthly_revenue=KPIMetric(value=monthly_revenue, unit="CNY"),
            expiring_count=KPIMetric(value=float(expiring_count), unit="个"),
            leasing_completion=KPIMetric(value=leasing_completion, unit="%"),
            lianfa_ratio=KPIMetric(value=lianfa_ratio, unit="%"),
        ),
        summary=DashboardSummary(
            total_units=total_units,
            occupied_units=occupied_units,
            vacant_units=vacant_units,
            total_area=total_area,
            leased_area=leased_area,
            total_tenants=tenant_count,
            active_contracts=active_contract_count,
        ),
    )


# ---------------------------------------------------------------------------
# 2. GET /dashboard/kanban?mall_id=&floor_id=&status=
# ---------------------------------------------------------------------------


@router.get("/kanban", response_model=KanbanDataResponse)
async def get_kanban_data(
    mall_id: int = Query(..., description="Mall ID"),
    floor_id: int | None = Query(None, description="Filter by floor ID"),
    status: str | None = Query(None, description="Filter by unit status"),
    db: AsyncSession = Depends(get_db),
):
    """Return kanban board data with units grouped by status.

    Each card includes unit info, tenant name (via active contract),
    and per-column aggregates.
    """
    await _validate_mall(db, mall_id)

    base_conditions = [Unit.floor_id.in_(select(Floor.id).join(Building, Floor.building_id == Building.id).where(Building.mall_id == mall_id))]
    if floor_id is not None:
        base_conditions.append(Unit.floor_id == floor_id)
    if status is not None and status in VALID_STATUSES:
        base_conditions.append(Unit.status == status)

    # Single query with LEFT JOINs to avoid N+1
    stmt = (
        select(
            Unit,
            Floor.name.label("floor_name"),
            Tenant.name.label("tenant_name"),
            Tenant.brand_tier.label("brand_tier"),
            Contract.monthly_rent.label("monthly_rent"),
        )
        .join(Floor, Unit.floor_id == Floor.id)
        .outerjoin(
            Contract,
            and_(Unit.id == Contract.unit_id, Contract.status == "active"),
        )
        .outerjoin(Tenant, Contract.tenant_id_ref == Tenant.id)
        .where(and_(*base_conditions))
        .order_by(Floor.sort_order, Unit.code)
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Group by status into columns
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

    # Build ordered column list
    columns: list[KanbanColumnSchema] = []
    for status_key in ("vacant", "reserved", "occupied", "maintenance", "blocked"):
        cards = columns_map.get(status_key, [])
        total_area = sum(c.area for c in cards if c.area is not None)
        columns.append(KanbanColumnSchema(
            id=status_key,
            title=KANBAN_STATUS_MAP[status_key],
            unit_count=len(cards),
            total_area=round(total_area, 2),
            cards=cards,
        ))

    return KanbanDataResponse(columns=columns)


# ---------------------------------------------------------------------------
# 3. PUT /dashboard/kanban/move
# ---------------------------------------------------------------------------


@router.put("/kanban/move", response_model=KanbanMoveResponse)
async def move_kanban_card(
    body: KanbanMoveRequest,
    db: AsyncSession = Depends(get_db),
):
    """Move a unit to a new kanban status column."""
    if body.new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )

    result = await db.execute(select(Unit).where(Unit.id == body.unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    old_status = unit.status.value
    unit.status = body.new_status

    # Auto-manage vacancy_days on status transition
    if body.new_status == "occupied":
        unit.vacancy_days = None
    elif body.new_status == "vacant":
        unit.vacancy_days = 0

    await db.flush()
    await db.refresh(unit)

    return KanbanMoveResponse(
        unit_id=unit.id,
        old_status=old_status,
        new_status=unit.status.value,
    )


# ---------------------------------------------------------------------------
# 4. GET /dashboard/vacancy?mall_id=
# ---------------------------------------------------------------------------


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

    # Fetch all vacant units with their vacancy days and area
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

    total_vacant_area = sum(b.value for b in buckets)
    total_vacant_count = sum(b.count for b in buckets)

    return VacancyAnalysisResponse(
        buckets=buckets,
        total_vacant_area=round(total_vacant_area, 2),
        total_vacant_count=total_vacant_count,
    )


# ---------------------------------------------------------------------------
# 5. GET /dashboard/lease-term?mall_id=
# ---------------------------------------------------------------------------


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

    # Fetch active contracts with lease dates and unit area
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


# ---------------------------------------------------------------------------
# 6. GET /dashboard/brand-tier?mall_id=
# ---------------------------------------------------------------------------


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

    # Find distinct tenants that have active contracts via units in this mall
    subq = (
        select(Contract.tenant_id_ref.distinct().label("tid"))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    ).subquery()

    result = await db.execute(
        select(
            Tenant.brand_tier.label("tier"),
            func.count().label("cnt"),
        )
        .join(subq, Tenant.id == subq.c.tid)
        .group_by(Tenant.brand_tier)
    )
    rows = result.all()

    total = sum(r[1] for r in rows)

    buckets = []
    for r in rows:
        tier_val = r[0]
        # Convert NULL brand_tier to "unknown" string, enum to its value
        if tier_val is None:
            tier_key = "unknown"
        elif hasattr(tier_val, "value"):
            tier_key = tier_val.value
        else:
            tier_key = str(tier_val)
        buckets.append(BrandTierBucketSchema(
            name=tier_key,
            value=r[1],
            color=BRAND_TIER_COLORS.get(tier_key, BRAND_TIER_COLORS["unknown"]),
            percentage=round(r[1] / total * 100, 1) if total > 0 else 0.0,
        ))

    # Ensure all known tiers appear even if count is 0
    existing_tiers = {str(b.name).lower() for b in buckets}
    for tier_key, color in BRAND_TIER_COLORS.items():
        if tier_key not in existing_tiers:
            buckets.append(BrandTierBucketSchema(
                name=tier_key,
                value=0,
                color=color,
                percentage=0.0,
            ))

    return BrandTierResponse(buckets=buckets, total=total)


# ---------------------------------------------------------------------------
# 7. GET /dashboard/expiring?mall_id=&days=30
# ---------------------------------------------------------------------------


@router.get("/expiring", response_model=ExpiringContractsResponse)
async def get_expiring_contracts(
    mall_id: int = Query(..., description="Mall ID"),
    days: int = Query(30, ge=1, le=365, description="Days threshold"),
    db: AsyncSession = Depends(get_db),
):
    """List contracts expiring within N days, ordered by soonest first."""
    await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)
    today = date.today()
    end_date = today + timedelta(days=days)

    if not floor_ids:
        return ExpiringContractsResponse(items=[], total=0)

    result = await db.execute(
        select(
            Contract.id,
            Contract.contract_number,
            Unit.code,
            Tenant.name,
            Contract.lease_end,
            Contract.monthly_rent,
            Contract.status,
        )
        .join(Unit, Contract.unit_id == Unit.id)
        .outerjoin(Tenant, Contract.tenant_id_ref == Tenant.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Contract.lease_end >= today,
            Contract.lease_end <= end_date,
        )
        .order_by(Contract.lease_end.asc())
        .limit(10)
    )
    rows = result.all()

    items = [
        ExpiringContractItem(
            contract_id=r[0],
            contract_number=r[1],
            unit_code=r[2],
            tenant_name=r[3],
            lease_end=r[4],
            days_remaining=(r[4] - today).days,
            monthly_rent=float(r[5]) if r[5] else None,
            status=r[6].value if hasattr(r[6], "value") else str(r[6]),
        )
        for r in rows
    ]

    # Get total count (without limit)
    count_result = await db.execute(
        select(func.count(Contract.id))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(
            Unit.floor_id.in_(floor_ids),
            Contract.lease_end >= today,
            Contract.lease_end <= end_date,
        )
    )
    total = count_result.scalar() or 0

    return ExpiringContractsResponse(items=items, total=total)


# ---------------------------------------------------------------------------
# 8. GET /dashboard/tools/units?mall_id=&building_id=&floor_id=&status=
# ---------------------------------------------------------------------------


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
    db: AsyncSession = Depends(get_db),
):
    """Rich unit query with building/floor/tenant joins for the units tool page."""
    await _validate_mall(db, mall_id)

    # Determine floor scope
    if floor_id is not None:
        floor_filter = Unit.floor_id == floor_id
    elif building_id is not None:
        floor_filter = Unit.floor_id.in_(select(Floor.id).where(Floor.building_id == building_id))
    else:
        floor_filter = Unit.floor_id.in_(
            select(Floor.id)
            .join(Building, Floor.building_id == Building.id)
            .where(Building.mall_id == mall_id)
        )

    base_conditions = [floor_filter]
    if status is not None and status in VALID_STATUSES:
        base_conditions.append(Unit.status == status)

    stmt = (
        select(
            Unit,
            Floor.floor_number,
            Floor.name.label("floor_name"),
            Building.id.label("bid"),
            Building.name.label("building_name"),
            Tenant.name.label("tenant_name"),
            Contract.monthly_rent.label("monthly_rent"),
        )
        .join(Floor, Unit.floor_id == Floor.id)
        .join(Building, Floor.building_id == Building.id)
        .outerjoin(
            Contract,
            and_(Unit.id == Contract.unit_id, Contract.status == "active"),
        )
        .outerjoin(Tenant, Contract.tenant_id_ref == Tenant.id)
        .where(and_(*base_conditions))
        .order_by(Building.name, Floor.floor_number, Unit.code)
    )

    # Apply area filters
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

    items = [
        ToolUnitRow(
            id=row[0].id,
            unit_code=row[0].code,
            floor_id=row[0].floor_id,
            floor_number=int(row[1] or 0),
            floor_name=row[2] or "",
            building_id=int(row[3] or 0),
            building_name=row[4] or "",
            area=float(row[0].gross_area or 0),
            layout_type=row[0].layout_type.value if row[0].layout_type else "",
            status=row[0].status.value,
            tenant_name=row[5],
            monthly_rent=float(row[6]) if row[6] else None,
            mall_id=mall_id,
        )
        for row in rows
    ]

    # Total count (without limit for now - all results returned)
    return ToolUnitsResponse(data=items, total=len(items))


# ---------------------------------------------------------------------------
# 9. GET /dashboard/tools/brands?search=&tier=&status=&skip=&limit=
# ---------------------------------------------------------------------------


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
    """Brand/tenant query with tier and contract aggregation."""
    from app.models.tenant import BrandTier

    await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)

    if not floor_ids:
        return ToolBrandsResponse(data=[], total=0)

    # Base subquery: tenants with active contracts in this mall
    tenant_subq = (
        select(Contract.tenant_id_ref.distinct().label("tid"))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    ).subquery()

    # Build conditions
    conds = []
    if search:
        conds.append(Tenant.name.ilike(f"%{search}%"))
    if tier:
        try:
            conds.append(Tenant.brand_tier == BrandTier(tier))
        except ValueError:
            pass  # Invalid tier, ignore filter
    if status:
        conds.append(Tenant.status == status)

    # Count query
    count_stmt = select(func.count()).select_from(Tenant).join(tenant_subq, Tenant.id == tenant_subq.c.tid)
    if conds:
        count_stmt = count_stmt.where(and_(*conds))
    total = (await db.execute(count_stmt)).scalar() or 0

    # Data query with contract aggregations
    data_stmt = (
        select(
            Tenant.id,
            Tenant.name,
            Tenant.brand_tier,
            Tenant.type,
            Tenant.status,
            func.count(Contract.id).label("contract_count"),
            func.coalesce(func.sum(Unit.gross_area), 0).label("total_area"),
            func.coalesce(func.sum(Contract.monthly_rent.cast(Float)), 0).label("total_rent"),
        )
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

    items = [
        ToolBrandRow(
            id=r[0],
            tenant_name=r[1],
            brand_tier=r[2].value if r[2] else None,
            type=r[3] or "",
            contract_count=int(r[5] or 0),
            total_area=float(r[6] or 0),
            monthly_rent=float(r[7] or 0),
            status=r[4].value if hasattr(r[4], "value") else str(r[4] or ""),
        )
        for r in rows
    ]

    return ToolBrandsResponse(data=items, total=total)


# ---------------------------------------------------------------------------
# 10. GET /dashboard/floor-summary?mall_id=
# ---------------------------------------------------------------------------


@router.get("/floor-summary", response_model=FloorSummaryResponse)
async def get_floor_summary(
    mall_id: int = Query(..., description="Mall ID"),
    db: AsyncSession = Depends(get_db),
):
    """Per-floor occupied/vacant unit counts for project overview page."""
    await _validate_mall(db, mall_id)

    result = await db.execute(
        select(
            Floor.name.label("floor_name"),
            func.sum(case((Unit.status == "occupied", 1), else_=0)).label("occupied"),
            func.sum(case((Unit.status == "vacant", 1), else_=0)).label("vacant"),
        )
        .join(Building, Floor.building_id == Building.id)
        .outerjoin(Unit, Unit.floor_id == Floor.id)
        .where(Building.mall_id == mall_id)
        .group_by(Floor.id, Floor.name)
        .order_by(Floor.sort_order, Floor.floor_number)
    )
    rows = result.all()

    floors = [
        FloorSummaryRow(
            floor_name=r[0] or "-",
            occupied=int(r[1] or 0),
            vacant=int(r[2] or 0),
        )
        for r in rows
    ]

    return FloorSummaryResponse(floors=floors)
