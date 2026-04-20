"""Shared helpers and constants for dashboard API modules."""

from datetime import date, timedelta, datetime

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mall import Mall, Floor, Building
from app.models.unit import Unit
from app.models.contract import Contract
from app.models.tenant import Tenant, BrandTier
from app.models.leasing_plan import LeasingPlan, PlanStatus
from app.schemas.dashboard import KPIMetric

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
