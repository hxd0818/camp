"""Contract API endpoints including AI-powered import."""

import base64
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.contract import Contract
from app.models.unit import Unit
from app.models.tenant import Tenant
from app.schemas.contract import (
    ContractCreate,
    ContractUpdate,
    ContractResponse,
    ContractAIImportRequest,
    ContractAIImportResponse,
    ContractAIExtractedData,
)
from app.services.contract_ai import extract_contract_data, match_unit

router = APIRouter()


@router.get("", response_model=list[ContractResponse])
async def list_contracts(
    unit_id: int | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List contracts with optional filters."""
    query = select(Contract)
    if unit_id:
        query = query.where(Contract.unit_id == unit_id)
    if status:
        query = query.where(Contract.status == status)

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.post("", response_model=ContractResponse, status_code=201)
async def create_contract(contract: ContractCreate, db: AsyncSession = Depends(get_db)):
    """Create a new contract manually."""
    # Validate references exist
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == contract.tenant_ref_id))
    if not tenant_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Tenant not found")

    unit_result = await db.execute(select(Unit).where(Unit.id == contract.unit_id))
    if not unit_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Unit not found")

    db_contract = Contract(
        tenant_id_ref=contract.tenant_ref_id,
        unit_id=contract.unit_id,
        **contract.model_dump(exclude={"tenant_id", "unit_id"}, by_alias=True),
    )
    db.add(db_contract)
    await db.flush()
    await db.refresh(db_contract)
    return db_contract


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(contract_id: int, db: AsyncSession = Depends(get_db)):
    """Get contract by ID."""
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract


@router.put("/{contract_id}", response_model=ContractResponse)
async def update_contract(
    contract_id: int, update: ContractUpdate, db: AsyncSession = Depends(get_db)
):
    """Update contract details."""
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(contract, field, value)

    await db.flush()
    await db.refresh(contract)
    return contract


@router.post("/import/ai", response_model=ContractAIImportResponse)
async def ai_import_contract(
    file: UploadFile = File(...),
    mall_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """AI-powered contract import: extract data from uploaded file and auto-match to unit.

    1. Extract structured data from contract PDF/image using LLM
    2. Auto-match to existing unit by unit code
    3. Return extracted data + match result for user confirmation
    """
    # Read and encode file content
    content = await file.read()
    file_content_b64 = base64.b64encode(content).decode("utf-8")

    # Step 1: AI extraction
    extracted = await extract_contract_data(file_content_b64, file.filename, file.content_type)

    # Step 2: Auto-match to unit
    matched_unit_id, matched_code, match_confidence = await match_unit(
        db, extracted.unit_code, mall_id
    )

    return ContractAIImportResponse(
        extracted_data=extracted,
        matched_unit_id=matched_unit_id,
        matched_unit_code=matched_code,
        match_confidence=match_confidence,
    )


@router.post("/import/ai/confirm", response_model=ContractResponse, status_code=201)
async def confirm_ai_import(
    tenant_id: int = Form(...),
    unit_id: int = Form(...),
    contract_number: str = Form(...),
    lease_start: str = Form(...),
    lease_end: str = Form(...),
    monthly_rent: float | None = Form(None),
    deposit: float | None = Form(None),
    confidence_score: float | None = Form(None),
    source_file_name: str | None = Form(None),
    raw_data: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """Confirm AI-imported contract and create the record."""
    from datetime import date as date_type
    import json

    db_contract = Contract(
        tenant_id_ref=tenant_id,
        unit_id=unit_id,
        contract_number=contract_number,
        lease_start=date_type.fromisoformat(lease_start),
        lease_end=date_type.fromisoformat(lease_end),
        monthly_rent=monthly_rent,
        deposit=deposit,
        ai_imported=True,
        ai_confidence_score=confidence_score,
        source_file_name=source_file_name,
        raw_extracted_data=json.loads(raw_data) if raw_data else None,
        status="draft",
    )
    db.add(db_contract)
    await db.flush()
    await db.refresh(db_contract)
    return db_contract
