"""Floor Plan API endpoints - core of CAMP visualization feature."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.unit import FloorPlan
from app.models.mall import Floor
from app.schemas.unit import FloorPlanCreate, FloorPlanResponse

router = APIRouter()


@router.get("/floor/{floor_id}", response_model=list[FloorPlanResponse])
async def list_floor_plans(floor_id: int, db: AsyncSession = Depends(get_db)):
    """List all floor plans for a given floor."""
    result = await db.execute(select(Floor).where(Floor.id == floor_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Floor not found")

    plans_result = await db.execute(
        select(FloorPlan).where(FloorPlan.floor_id == floor_id).order_by(FloorPlan.version.desc())
    )
    return plans_result.scalars().all()


@router.post("/floor/{floor_id}/upload", response_model=FloorPlanResponse, status_code=201)
async def upload_floor_plan(
    floor_id: int,
    file: UploadFile = File(...),
    hotspots_json: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Upload a floor plan image with optional hotspot definitions.

    The image is saved and its URL stored. Hotspots can be provided as JSON
    or added later via the annotation endpoint.
    """
    from app.config import get_settings
    import uuid
    import os

    settings = get_settings()

    # Verify floor exists
    result = await db.execute(select(Floor).where(Floor.id == floor_id))
    floor = result.scalar_one_or_none()
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")

    # Save uploaded file
    ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    filename = f"floor_{floor_id}_{uuid.uuid4().hex[:8]}{ext}"
    upload_path = os.path.join(settings.upload_dir, filename)

    os.makedirs(settings.upload_dir, exist_ok=True)
    content = await file.read()
    with open(upload_path, "wb") as f:
        f.write(content)

    image_url = f"/uploads/{filename}"

    # Parse hotspots if provided
    import json
    hotspots = json.loads(hotspots_json) if hotspots_json else None

    # Deactivate previous active plans for this floor
    prev_active = await db.execute(
        select(FloorPlan).where(FloorPlan.floor_id == floor_id, FloorPlan.is_active == True)
    )
    for plan in prev_active.scalars().all():
        plan.is_active = False

    # Get latest version number
    latest = await db.execute(
        select(FloorPlan)
        .where(FloorPlan.floor_id == floor_id)
        .order_by(FloorPlan.version.desc())
        .limit(1)
    )
    latest_plan = latest.scalar_one_or_none()
    next_version = (latest_plan.version + 1) if latest_plan else 1

    # Create new floor plan record
    db_plan = FloorPlan(
        floor_id=floor_id,
        image_url=image_url,
        hotspots=hotspots,
        version=next_version,
        is_active=True,
    )
    db.add(db_plan)
    await db.flush()
    await db.refresh(db_plan)
    return db_plan


@router.put("/{plan_id}/hotspots", response_model=FloorPlanResponse)
async def update_hotspots(
    plan_id: int,
    hotspots: list[dict],
    db: AsyncSession = Depends(get_db),
):
    """Update hotspot definitions for a floor plan."""
    result = await db.execute(select(FloorPlan).where(FloorPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")

    plan.hotspots = hotspots
    await db.flush()
    await db.refresh(plan)
    return plan


@router.get("/{plan_id}/render-data")
async def get_floor_plan_render_data(plan_id: int, db: AsyncSession = Depends(get_db)):
    """Get complete render data for floor plan visualization frontend.

    Returns the image URL and all hotspots enriched with unit/contract/tenant info
    for proper color coding and click-to-detail functionality.
    """
    result = await db.execute(
        select(FloorPlan).where(FloorPlan.id == plan_id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Floor plan not found")

    # Enrich hotspots with live data
    enriched_hotspots = []
    if plan.hotspots:
        for hs in plan.hotspots:
            unit_id = hs.get("unit_id")
            enriched = dict(hs)

            if unit_id:
                from app.models.unit import Unit
                from app.models.contract import Contract
                from app.models.tenant import Tenant

                unit_result = await db.execute(select(Unit).where(Unit.id == unit_id))
                unit = unit_result.scalar_one_or_none()

                if unit:
                    enriched["unit_status"] = unit.status.value
                    enriched["unit_name"] = unit.name
                    enriched["area"] = unit.gross_area

                    # Get current contract info
                    if unit.current_contract:
                        contract = unit.current_contract
                        enriched["tenant_name"] = contract.tenant.name
                        enriched["contract_status"] = contract.status.value
                        enriched["lease_end"] = contract.lease_end.isoformat()
                        # Determine status color
                        enriched["status_color"] = _get_status_color(
                            unit.status.value, contract.status.value, contract.lease_end
                        )
                    else:
                        enriched["tenant_name"] = None
                        enriched["status_color"] = _get_status_color(unit.status.value, None, None)

            enriched_hotspots.append(enriched)

    return {
        "id": plan.id,
        "image_url": plan.image_url,
        "image_width": plan.image_width,
        "image_height": plan.image_height,
        "hotspots": enriched_hotspots,
        "version": plan.version,
    }


def _get_status_color(unit_status: str, contract_status: str | None, lease_end) -> str:
    """Determine hotspot color based on unit and contract status."""
    from datetime import date, timedelta

    if unit_status == "vacant":
        return "#ef4444"  # red
    elif unit_status == "maintenance":
        return "#6b7280"  # gray
    elif unit_status == "reserved":
        return "#f59e0b"  # amber
    elif contract_status == "active" and lease_end:
        days_left = (lease_end - date.today()).days
        if days_left < 90:
            return "#f59e0b"  # yellow - expiring soon
        return "#22c55e"  # green - healthy
    elif contract_status == "expiring":
        return "#f59e0b"  # amber
    return "#94a3b8"  # default slate
