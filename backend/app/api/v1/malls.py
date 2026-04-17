"""Mall API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.mall import Mall, Building
from app.schemas.mall import (
    MallCreate,
    MallUpdate,
    MallResponse,
    BuildingCreate,
    BuildingUpdate,
    BuildingResponse,
)

router = APIRouter()


# --- Mall Endpoints ---

@router.get("", response_model=list[MallResponse])
async def list_malls(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all malls with pagination."""
    result = await db.execute(select(Mall).offset(skip).limit(limit))
    return result.scalars().all()


@router.post("", response_model=MallResponse, status_code=201)
async def create_mall(mall: MallCreate, db: AsyncSession = Depends(get_db)):
    """Create a new mall."""
    db_mall = Mall(**mall.model_dump())
    db.add(db_mall)
    await db.flush()
    await db.refresh(db_mall)
    return db_mall


@router.get("/{mall_id}", response_model=MallResponse)
async def get_mall(mall_id: int, db: AsyncSession = Depends(get_db)):
    """Get mall by ID."""
    result = await db.execute(select(Mall).where(Mall.id == mall_id))
    mall = result.scalar_one_or_none()
    if not mall:
        raise HTTPException(status_code=404, detail="Mall not found")
    return mall


@router.put("/{mall_id}", response_model=MallResponse)
async def update_mall(mall_id: int, update: MallUpdate, db: AsyncSession = Depends(get_db)):
    """Update mall details."""
    result = await db.execute(select(Mall).where(Mall.id == mall_id))
    mall = result.scalar_one_or_none()
    if not mall:
        raise HTTPException(status_code=404, detail="Mall not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(mall, field, value)

    await db.flush()
    await db.refresh(mall)
    return mall


# --- Building Endpoints ---

@router.get("/{mall_id}/buildings", response_model=list[BuildingResponse])
async def list_buildings(mall_id: int, db: AsyncSession = Depends(get_db)):
    """List all buildings in a mall."""
    # Verify mall exists
    mall_result = await db.execute(select(Mall).where(Mall.id == mall_id))
    if not mall_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Mall not found")

    result = await db.execute(
        select(Building).where(Building.mall_id == mall_id).order_by(Building.id)
    )
    return result.scalars().all()


@router.post("/{mall_id}/buildings", response_model=BuildingResponse, status_code=201)
async def create_building(
    mall_id: int, building: BuildingCreate, db: AsyncSession = Depends(get_db)
):
    """Create a new building in a mall."""
    mall_result = await db.execute(select(Mall).where(Mall.id == mall_id))
    if not mall_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Mall not found")

    db_building = Building(mall_id=mall_id, **building.model_dump(exclude={"mall_id"}))
    db.add(db_building)
    await db.flush()
    await db.refresh(db_building)
    return db_building
