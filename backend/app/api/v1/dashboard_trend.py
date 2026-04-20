"""Dashboard brand tier trend endpoint."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.unit import Unit
from app.models.contract import Contract
from app.models.tenant import Tenant, BrandTier
from app.schemas.dashboard import BrandTierTrendResponse, BrandTierTrendItem

from .dashboard_helpers import (
    _validate_mall,
    _get_mall_floor_ids,
    _calc_mom,
    BRAND_TIER_COLORS,
    BRAND_TIER_NAMES,
)

router = APIRouter()


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

    contract_tenant_subq = (
        select(Contract.tenant_id_ref.label("tid"), Contract.created_at.label("created"))
        .join(Unit, Contract.unit_id == Unit.id)
        .where(Unit.floor_id.in_(floor_ids), Contract.status == "active")
    ).subquery()

    current_data = await db.execute(
        select(Tenant.brand_tier, func.count().label("cnt"))
        .join(contract_tenant_subq, Tenant.id == contract_tenant_subq.c.tid)
        .where(contract_tenant_subq.c.created >= current_month_start)
        .group_by(Tenant.brand_tier)
    )
    current_map = {r[0]: int(r[1]) for r in current_data.all()}

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
