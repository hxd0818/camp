"""Dashboard tool endpoints: units query, brands query, expiring contracts."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Float

from app.database import get_db
from app.models.unit import Unit, UnitLayoutType
from app.models.contract import Contract
from app.models.tenant import Tenant, BrandTier
from app.schemas.dashboard import (
    ExpiringContractsResponse,
    ExpiringContractItem,
    ToolUnitsResponse,
    ToolUnitRow,
    ToolBrandsResponse,
    ToolBrandRow,
)

from .dashboard_helpers import _validate_mall, _get_mall_floor_ids, VALID_STATUSES

router = APIRouter()


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
            status=r[6].value if hasattr(r[6], "value") else str(r[6] or ""),
        ) for r in rows
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
            id=unit.id, unit_code=unit.code, floor_id=unit.floor_id,
            floor_number=int(row[1] or 0), floor_name=row[2] or "",
            building_id=int(row[3] or 0), building_name=row[4] or "",
            area=float(unit.gross_area or 0),
            layout_type=unit.layout_type.value if unit.layout_type else "",
            status=unit.status.value, tenant_name=row[5],
            monthly_rent=float(row[6]) if row[6] else None,
            mall_id=mall_id,
            leasing_type=unit.leasing_type,
            lease_end=row[7].isoformat() if row[7] else None,
            vacancy_days=unit.vacancy_days, previous_rent=None,
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

    tenant_ids = [r[0] for r in rows]

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
            id=tenant_id, tenant_name=r[1], brand_tier=r[2].value if r[2] else None,
            type=r[3] or "", contract_count=int(r[5] or 0),
            total_area=float(r[6] or 0), monthly_rent=monthly_rent_val,
            status=r[4].value if hasattr(r[4], "value") else str(r[4] or ""),
            avg_daily_traffic=biz.get("avg_traffic"),
            avg_daily_sales=biz.get("avg_daily_sales"),
            avg_monthly_sales_per_sqm=biz.get("avg_sales_per_sqm"),
            avg_rent_to_sales_ratio=biz.get("avg_ratio"),
            annual_rent_income=round(monthly_rent_val * 12, 2) if monthly_rent_val > 0 else None,
        ))

    return ToolBrandsResponse(data=items, total=total)
