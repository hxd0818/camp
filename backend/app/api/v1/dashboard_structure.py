"""Dashboard structure endpoints: signing structure, vacancy analysis, lease term, brand tier breakdown."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.unit import Unit
from app.models.contract import Contract
from app.models.tenant import Tenant, BrandTier
from app.schemas.dashboard import (
    SigningStructureResponse,
    SigningStructureBucket,
    VacancyAnalysisResponse,
    VacancyBucketSchema,
    LeaseTermResponse,
    LeaseTermBucketSchema,
    BrandTierResponse,
    BrandTierBucketSchema,
)

from .dashboard_helpers import (
    _validate_mall,
    _get_mall_floor_ids,
    _calc_ratio,
    BRAND_TIER_COLORS,
    BRAND_TIER_NAMES,
)

router = APIRouter()


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

    renewal_area = sum(float(r.area or 0) for r in rows if r.is_renewal is True)
    renewal_count = sum(int(r.count or 0) for r in rows if r.is_renewal is True)
    new_area = sum(float(r.area or 0) for r in rows if r.is_renewal is not True)
    new_count = sum(int(r.count or 0) for r in rows if r.is_renewal is not True)

    buckets = [
        SigningStructureBucket(type="new", name="新签", area=new_area, count=new_count,
                               ratio=_calc_ratio(new_area, total_area) if total_area > 0 else 0.0),
        SigningStructureBucket(type="renewal", name="续签", area=renewal_area, count=renewal_count,
                               ratio=_calc_ratio(renewal_area, total_area) if total_area > 0 else 0.0),
    ]

    return SigningStructureResponse(buckets=buckets, total_area=total_area, total_count=total_count)


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
            name=tier_key, value=r[1],
            color=BRAND_TIER_COLORS.get(tier_key, BRAND_TIER_COLORS["unknown"]),
            percentage=round(r[1] / total * 100, 1) if total > 0 else 0.0,
        ))

    existing_tiers = {str(b.name).lower() for b in buckets}
    for tier_key, color in BRAND_TIER_COLORS.items():
        if tier_key not in existing_tiers:
            buckets.append(BrandTierBucketSchema(name=tier_key, value=0, color=color, percentage=0.0))

    return BrandTierResponse(buckets=buckets, total=total)
