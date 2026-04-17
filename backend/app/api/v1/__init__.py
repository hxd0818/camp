"""API v1 router - aggregates all v1 endpoints."""

from fastapi import APIRouter

from app.api.v1 import malls, units, tenants, contracts, floor_plans, finance, operations, auth

router = APIRouter()

router.include_router(malls.router, prefix="/malls", tags=["Malls"])
router.include_router(units.router, prefix="/units", tags=["Units"])
router.include_router(tenants.router, prefix="/tenants", tags=["Tenants"])
router.include_router(contracts.router, prefix="/contracts", tags=["Contracts"])
router.include_router(floor_plans.router, prefix="/floor-plans", tags=["Floor Plans"])
router.include_router(finance.router, prefix="/finance", tags=["Finance"])
router.include_router(operations.router, prefix="/operations", tags=["Operations"])
router.include_router(auth.router, prefix="/auth", tags=["Auth"])
