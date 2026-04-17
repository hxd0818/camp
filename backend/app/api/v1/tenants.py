"""Tenant (merchant) API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse

router = APIRouter()


@router.get("", response_model=list[TenantResponse])
async def list_tenants(
    status: str | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List tenants with optional filters."""
    query = select(Tenant)
    if status:
        query = query.where(Tenant.status == status)
    if search:
        query = query.where(Tenant.name.ilike(f"%{search}%"))

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.post("", response_model=TenantResponse, status_code=201)
async def create_tenant(tenant: TenantCreate, db: AsyncSession = Depends(get_db)):
    """Create a new tenant."""
    db_tenant = Tenant(**tenant.model_dump())
    db.add(db_tenant)
    await db.flush()
    await db.refresh(db_tenant)
    return db_tenant


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: int, db: AsyncSession = Depends(get_db)):
    """Get tenant by ID."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(tenant_id: int, update: TenantUpdate, db: AsyncSession = Depends(get_db)):
    """Update tenant details."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(tenant, field, value)

    await db.flush()
    await db.refresh(tenant)
    return tenant
