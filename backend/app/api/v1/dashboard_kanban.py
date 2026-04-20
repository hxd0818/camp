"""Dashboard kanban board endpoints: data and move operations."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.unit import Unit
from app.models.contract import Contract
from app.models.tenant import Tenant
from app.schemas.dashboard import (
    KanbanDataResponse,
    KanbanColumnSchema,
    KanbanCardSchema,
    KanbanMoveRequest,
    KanbanMoveResponse,
)

from .dashboard_helpers import (
    _validate_mall,
    KANBAN_STATUS_MAP,
    VALID_STATUSES,
)

router = APIRouter()


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
            unit_id=unit.id, unit_code=unit.code, area=unit.gross_area,
            floor_name=row.floor_name or "",
            layout_type=unit.layout_type.value if unit.layout_type else "",
            tenant_name=row.tenant_name, brand_tier=row.brand_tier.value if row.brand_tier else None,
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
