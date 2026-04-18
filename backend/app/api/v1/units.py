"""Unit (store/lease unit) API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.unit import Unit
from app.schemas.unit import UnitCreate, UnitUpdate, UnitResponse, UnitWithContract

router = APIRouter()


@router.get("", response_model=list[UnitResponse])
async def list_units(
    floor_id: int | None = Query(None),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List units with optional filters."""
    query = select(Unit)
    if floor_id:
        query = query.where(Unit.floor_id == floor_id)
    if status:
        query = query.where(Unit.status == status)

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.post("", response_model=UnitResponse, status_code=201)
async def create_unit(unit: UnitCreate, db: AsyncSession = Depends(get_db)):
    """Create a new unit."""
    db_unit = Unit(**unit.model_dump())
    db.add(db_unit)
    await db.flush()
    await db.refresh(db_unit)
    return db_unit


@router.get("/{unit_id}", response_model=UnitWithContract)
async def get_unit(unit_id: int, db: AsyncSession = Depends(get_db)):
    """Get unit details with current contract info."""
    result = await db.execute(select(Unit).where(Unit.id == unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    # Build response with contract summary
    response_data = {
        **{c.name: getattr(unit, c.name) for c in Unit.__table__.columns},
        "tenant_name": None,
        "contract_status": None,
        "lease_end": None,
    }

    if unit.current_contract:
        response_data["tenant_name"] = unit.current_contract.tenant.name
        response_data["contract_status"] = unit.current_contract.status.value
        response_data["lease_end"] = unit.current_contract.lease_end.isoformat()

    return response_data


@router.put("/{unit_id}", response_model=UnitResponse)
async def update_unit(unit_id: int, update: UnitUpdate, db: AsyncSession = Depends(get_db)):
    """Update unit details including hotspot data."""
    result = await db.execute(select(Unit).where(Unit.id == unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(unit, field, value)

    await db.flush()
    await db.refresh(unit)
    return unit


@router.put("/{unit_id}/hotspot")
async def update_unit_hotspot(
    unit_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """Update a unit's hotspot coordinates (position and size on floor plan)."""
    result = await db.execute(select(Unit).where(Unit.id == unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    unit.hotspot_data = data
    await db.flush()

    # Also update active floor plan hotspot for this unit
    from app.models.unit import FloorPlan
    from sqlalchemy import update as sql_update

    fp_result = await db.execute(
        select(FloorPlan)
        .where(FloorPlan.floor_id == unit.floor_id, FloorPlan.is_active == True)
    )
    active_plan = fp_result.scalar_one_or_none()
    if active_plan and active_plan.hotspots:
        updated = False
        new_hotspots = []
        for hs in active_plan.hotspots:
            if hs.get("unit_id") == unit_id:
                new_hotspots.append({
                    **hs,
                    "x": data.get("x", hs.get("x", 0)),
                    "y": data.get("y", hs.get("y", 0)),
                    "w": data.get("width", hs.get("w", 100)),
                    "h": data.get("height", hs.get("h", 80)),
                })
                updated = True
            else:
                new_hotspots.append(hs)
        if updated:
            active_plan.hotspots = new_hotspots

    await db.commit()
    await db.refresh(unit)
    return {"id": unit.id, "hotspot_data": unit.hotspot_data}


@router.delete("/{unit_id}", status_code=204)
async def delete_unit(unit_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a unit and its dependent records (contracts, work orders, hotspots)."""
    result = await db.execute(select(Unit).where(Unit.id == unit_id))
    unit = result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    # Delete dependent records first (FK constraints)
    from sqlalchemy import delete as sql_delete
    from app.models.contract import Contract
    from app.models.operations import WorkOrder

    # Delete work orders referencing this unit
    await db.execute(sql_delete(WorkOrder).where(WorkOrder.unit_id == unit_id))
    # Delete contracts referencing this unit
    await db.execute(sql_delete(Contract).where(Contract.unit_id == unit_id))

    await db.delete(unit)


@router.get("/floor/{floor_id}/with-hotspots")
async def get_units_with_hotspots(floor_id: int, db: AsyncSession = Depends(get_db)):
    """Get all units for a floor with hotspot data for floor plan rendering.

    Returns units enriched with contract/tenant info for color coding.
    """
    result = await db.execute(
        select(Unit).where(Unit.floor_id == floor_id).order_by(Unit.code)
    )
    units = result.scalars().all()

    units_data = []
    for u in units:
        unit_dict = {
            "id": u.id,
            "code": u.code,
            "name": u.name,
            "layout_type": u.layout_type.value,
            "status": u.status.value,
            "gross_area": u.gross_area,
            "hotspot_data": u.hotspot_data,
        }
        # Add tenant/contract info for display
        if u.current_contract:
            unit_dict["tenant_name"] = u.current_contract.tenant.name
            unit_dict["contract_status"] = u.current_contract.status.value
            unit_dict["lease_end"] = u.current_contract.lease_end.isoformat()
        else:
            unit_dict["tenant_name"] = None
            unit_dict["contract_status"] = None
            unit_dict["lease_end"] = None

        units_data.append(unit_dict)

    return {"floor_id": floor_id, "units": units_data}
