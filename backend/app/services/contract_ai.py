"""AI-powered contract data extraction and unit matching service.

This service uses LLM API to extract structured information from
contract documents (PDF/images) and auto-match to floor plan units.
"""

import json
import base64
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import get_settings
from app.models.unit import Unit
from app.models.mall import Floor
from app.models.tenant import Tenant
from app.schemas.contract import ContractAIExtractedData


# Prompt template for contract extraction
CONTRACT_EXTRACTION_PROMPT = """You are a commercial real estate lease contract parser.
Extract the following structured information from the provided contract document.
Respond ONLY with valid JSON, no markdown or explanation.

Required fields:
- tenant_name: Full legal name of the tenant/lessee company
- unit_code: Store/Unit number or identifier (e.g., "A-101", "F2-015", "Shop 23")
- area: Leasable area in square meters (number only)
- monthly_rent: Monthly rent amount (number only)
- deposit: Security deposit amount (number only)
- lease_start: Lease start date in YYYY-MM-DD format
- lease_end: Lease end date in YYYY-MM-DD format
- payment_terms: Payment frequency description (e.g., "monthly", "quarterly")
- confidence_score: Your confidence in this extraction (0.0 to 1.0)

If a field cannot be found, use null.
The unit_code is critical - look for store number, shop number, unit number, or location reference."""


async def extract_contract_data(
    file_content_b64: str,
    file_name: str,
    content_type: str,
) -> ContractAIExtractedData:
    """Extract structured data from a contract file using LLM.

    Args:
        file_content_b64: Base64-encoded file content
        file_name: Original file name
        content_type: MIME type (application/pdf, image/*)

    Returns:
        ContractAIExtractedData with parsed fields
    """
    settings = get_settings()

    # Build LLM request payload
    # For PDF, we'd use a vision-capable model; for now we handle text extraction
    # This can be extended with OCR + LLM pipeline

    messages = [
        {
            "role": "system",
            "content": CONTRACT_EXTRACTION_PROMPT,
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f"Extract lease information from this contract file: {file_name}",
                },
                {
                    "type": "image_url" if content_type.startswith("image") else "text",
                    "image_url": {"url": f"data:{content_type};base64,{file_content_b64}"}
                    if content_type.startswith("image")
                    else f"Base64 encoded {content_type} content (length: {len(file_content_b64)})",
                },
            ],
        },
    ]

    try:
        import httpx

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.llm_api_url}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "messages": messages,
                    "temperature": 0.1,  # Low temperature for consistent extraction
                    "max_tokens": 1000,
                },
            )
            response.raise_for_status()
            result = response.json()

        # Parse LLM response
        content = result["choices"][0]["message"]["content"]

        # Extract JSON from response (handle potential markdown wrapping)
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        data = json.loads(content)

        return ContractAIExtractedData(
            tenant_name=data.get("tenant_name", ""),
            unit_code=data.get("unit_code"),
            area=data.get("area"),
            monthly_rent=Decimal(str(data["monthly_rent"])) if data.get("monthly_rent") else None,
            deposit=Decimal(str(data["deposit"])) if data.get("deposit") else None,
            lease_end=date.fromisoformat(data["lease_end"]) if data.get("lease_end") else None,
            lease_start=date.fromisoformat(data["lease_start"]) if data.get("lease_start") else None,
            payment_terms=data.get("payment_terms"),
            confidence_score=float(data.get("confidence_score", 0.7)),
        )

    except Exception as e:
        # Return low-confidence empty result on error
        return ContractAIExtractedData(
            tenant_name="",
            confidence_score=0.0,
        )


async def match_unit(
    db: AsyncSession,
    unit_code: Optional[str],
    mall_id: int,
) -> tuple[Optional[int], Optional[str], Optional[float]]:
    """Try to match extracted unit code to an existing unit in the mall.

    Uses fuzzy matching on unit code/name.

    Args:
        db: Database session
        unit_code: Extracted unit code from contract
        mall_id: Mall ID to search within

    Returns:
        Tuple of (matched_unit_id, matched_unit_code, match_confidence)
    """
    if not unit_code:
        return None, None, None

    # Get all floors in this mall's buildings
    from app.models.mall import Building

    buildings_result = await db.execute(
        select(Building).where(Building.mall_id == mall_id)
    )
    building_ids = [b.id for b in buildings_result.scalars().all()]

    if not building_ids:
        return None, None, None

    floors_result = await db.execute(
        select(Floor).where(Floor.building_id.in_(building_ids))
    )
    floor_ids = [f.id for f in floors_result.scalars().all()]

    if not floor_ids:
        return None, None, None

    # Search for exact or fuzzy match on unit code
    units_result = await db.execute(
        select(Unit).where(Unit.floor_id.in_(floor_ids))
    )
    all_units = units_result.scalars().all()

    # Exact match first
    normalized_query = unit_code.strip().upper().replace(" ", "").replace("-", "")
    for u in all_units:
        normalized_code = u.code.upper().replace(" ", "").replace("-", "")
        if normalized_query == normalized_code:
            return u.id, u.code, 1.0

    # Fuzzy match - contains check
    best_match = None
    best_score = 0.0
    for u in all_units:
        normalized_code = u.code.upper().replace(" ", "").replace("-", "")
        normalized_name = u.name.upper().replace(" ", "")

        # Check if query contains unit code or vice versa
        if normalized_query in normalized_code or normalized_code in normalized_query:
            score = min(len(normalized_query), len(normalized_code)) / max(len(normalized_query), len(normalized_code))
            if score > best_score:
                best_score = score
                best_match = u

        # Also check name
        if normalized_query in normalized_name:
            score = len(normalized_query) / len(normalized_name)
            if score > best_score:
                best_score = score
                best_match = u

    if best_match and best_score >= 0.5:
        return best_match.id, best_match.code, round(best_score, 2)

    return None, None, None
