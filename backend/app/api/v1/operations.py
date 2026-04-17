"""Operations / Work Order API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.operations import WorkOrder
from app.schemas.operations import WorkOrderCreate, WorkOrderUpdate, WorkOrderResponse

router = APIRouter()


@router.get("", response_model=list[WorkOrderResponse])
async def list_work_orders(
    mall_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    category: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List work orders with optional filters."""
    query = select(WorkOrder)
    if mall_id:
        query = query.where(WorkOrder.mall_id == mall_id)
    if status:
        query = query.where(WorkOrder.status == status)
    if priority:
        query = query.where(WorkOrder.priority == priority)
    if category:
        query = query.where(WorkOrder.category == category)

    result = await db.execute(
        query.order_by(WorkOrder.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("", response_model=WorkOrderResponse, status_code=201)
async def create_work_order(work_order: WorkOrderCreate, db: AsyncSession = Depends(get_db)):
    """Create a new work order."""
    from app.models.mall import Mall

    # Verify mall exists
    result = await db.execute(select(Mall).where(Mall.id == work_order.mall_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Mall not found")

    db_wo = WorkOrder(**work_order.model_dump())
    db.add(db_wo)
    await db.flush()
    await db.refresh(db_wo)
    return db_wo


@router.get("/{wo_id}", response_model=WorkOrderResponse)
async def get_work_order(wo_id: int, db: AsyncSession = Depends(get_db)):
    """Get work order by ID."""
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return wo


@router.put("/{wo_id}", response_model=WorkOrderResponse)
async def update_work_order(
    wo_id: int, update: WorkOrderUpdate, db: AsyncSession = Depends(get_db)
):
    """Update work order status and details."""
    result = await db.execute(select(WorkOrder).where(WorkOrder.id == wo_id))
    wo = result.scalar_one_or_none()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    from datetime import datetime

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(wo, field, value)

    # Auto-set completed_at when status changes to completed
    if update.status == "completed" and not wo.completed_at:
        wo.completed_at = datetime.utcnow()

    await db.flush()
    await db.refresh(wo)
    return wo
