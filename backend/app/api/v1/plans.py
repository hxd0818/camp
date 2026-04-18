"""Leasing Plan API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.leasing_plan import LeasingPlan
from app.models.mall import Mall
from app.schemas.plan import PlanCreate, PlanUpdate, PlanResponse

router = APIRouter()


@router.get("", response_model=list[PlanResponse])
async def list_plans(
    mall_id: int | None = Query(None),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List leasing plans with optional filters."""
    query = select(LeasingPlan).order_by(LeasingPlan.due_date)
    if mall_id is not None:
        query = query.where(LeasingPlan.mall_id == mall_id)
    if status is not None:
        query = query.where(LeasingPlan.status == status)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=PlanResponse, status_code=201)
async def create_plan(plan: PlanCreate, db: AsyncSession = Depends(get_db)):
    """Create a new leasing plan."""
    # Verify mall exists
    mall_result = await db.execute(select(Mall).where(Mall.id == plan.mall_id))
    if not mall_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Mall not found")

    db_plan = LeasingPlan(
        mall_id=plan.mall_id,
        name=plan.name,
        plan_type=plan.plan_type,
        description=plan.description,
        target_area=plan.target_area,
        target_units=plan.target_units,
        owner=plan.owner,
        start_date=plan.start_date,
        due_date=plan.due_date,
        notes=plan.notes,
    )
    db.add(db_plan)
    await db.flush()
    await db.refresh(db_plan)
    return db_plan


@router.get("/{plan_id}", response_model=PlanResponse)
async def get_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    """Get plan by ID."""
    result = await db.execute(select(LeasingPlan).where(LeasingPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.put("/{plan_id}", response_model=PlanResponse)
async def update_plan(plan_id: int, update: PlanUpdate, db: AsyncSession = Depends(get_db)):
    """Update plan details."""
    result = await db.execute(select(LeasingPlan).where(LeasingPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)

    await db.flush()
    await db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a plan."""
    result = await db.execute(select(LeasingPlan).where(LeasingPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    await db.delete(plan)
    await db.flush()
    return None
