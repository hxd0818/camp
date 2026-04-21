"""Dashboard alert/warning aggregation endpoint.

Aggregates 4 categories of alerts into a unified warning panel:
  1. Overdue leasing plans (due_date passed, not completed)
  2. Due-soon plans (within 3/14 days)
  3. Long-vacant units (vacancy_days >= 90)
  4. Urgent expiring contracts (lease_end <= 7 days)
"""

from datetime import date, timedelta, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.unit import Unit
from app.models.contract import Contract
from app.models.tenant import Tenant
from app.models.leasing_plan import LeasingPlan, PlanStatus
from app.schemas.dashboard import AlertItem, AlertsResponse

from .dashboard_helpers import _validate_mall, _get_mall_floor_ids

router = APIRouter()

# Severity order for sorting: critical first, then warning, then info
_SEVERITY_ORDER = {"critical": 0, "warning": 1, "info": 2}


@router.get("/alerts", response_model=AlertsResponse)
async def get_dashboard_alerts(
    mall_id: int = Query(..., description="Mall ID"),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate alert/warning items across leasing plans, vacancies, and contracts.

    Returns items sorted by severity (critical -> warning -> info),
    then by urgency (most overdue / soonest first).
    """
    await _validate_mall(db, mall_id)
    floor_ids = await _get_mall_floor_ids(db, mall_id)

    today = date.today()
    items: list[AlertItem] = []

    # --- Category 1: Overdue leasing plans ---
    if floor_ids:
        overdue_plans = await db.execute(
            select(LeasingPlan).where(
                LeasingPlan.mall_id == mall_id,
                LeasingPlan.due_date < today,
                LeasingPlan.status.notin_([PlanStatus.COMPLETED, PlanStatus.CANCELLED]),
            ).order_by(LeasingPlan.due_date.asc())
        )
        for plan in overdue_plans.scalars().all():
            days_late = (today - plan.due_date).days
            items.append(AlertItem(
                alert_type="overdue_plan",
                severity="critical",
                title=f"招商计划已逾期: {plan.name}",
                description=f"计划截止日 {plan.due_date.isoformat()}，当前状态 {plan.status.value}",
                entity_id=plan.id,
                entity_name=plan.name,
                days_overdue=days_late,
                metric_value=float(days_late),
                unit="天",
            ))

        # --- Category 2: Due-soon plans (within 14 days) ---
        due_soon_plans = await db.execute(
            select(LeasingPlan).where(
                LeasingPlan.mall_id == mall_id,
                LeasingPlan.due_date > today,
                LeasingPlan.due_date <= today + timedelta(days=14),
                LeasingPlan.status.in_([PlanStatus.DRAFT, PlanStatus.ACTIVE, PlanStatus.IN_PROGRESS]),
            ).order_by(LeasingPlan.due_date.asc())
        )
        for plan in due_soon_plans.scalars().all():
            days_left = (plan.due_date - today).days
            severity = "critical" if days_left <= 3 else "warning"
            items.append(AlertItem(
                alert_type="due_soon_plan",
                severity=severity,
                title=f"计划即将到期: {plan.name}",
                description=f"截止日 {plan.due_date.isoformat()}，剩余 {days_left} 天",
                entity_id=plan.id,
                entity_name=plan.name,
                days_overdue=-days_left,
                metric_value=float(days_left),
                unit="天",
            ))

        # --- Category 3: Long-vacant units ---
        long_vacant = await db.execute(
            select(Unit.id, Unit.code, Unit.gross_area, Unit.vacancy_days)
            .where(
                Unit.floor_id.in_(floor_ids),
                Unit.status == "vacant",
                Unit.vacancy_days >= 90,
            )
            .order_by(Unit.vacancy_days.desc())
            .limit(10)
        )
        for uid, ucode, uarea, vdays in long_vacant.all():
            sev = "critical" if vdays >= 180 else "warning"
            items.append(AlertItem(
                alert_type="long_vacant",
                severity=sev,
                title=f"长期空置铺位: {ucode}",
                description=f"已空置 {vdays} 天，面积 {uarea or 0}m²",
                entity_id=uid,
                entity_name=ucode,
                days_overdue=vdays,
                metric_value=float(vdays),
                unit="天",
            ))

        # --- Category 4: Urgent expiring contracts (<=7 days) ---
        urgent_expiring = await db.execute(
            select(Contract.id, Contract.contract_number, Unit.code,
                   Tenant.name, Contract.lease_end)
            .join(Unit, Contract.unit_id == Unit.id)
            .outerjoin(Tenant, Contract.tenant_id_ref == Tenant.id)
            .where(
                Unit.floor_id.in_(floor_ids),
                Contract.lease_end >= today,
                Contract.lease_end <= today + timedelta(days=7),
                Contract.status == "active",
            )
            .order_by(Contract.lease_end.asc())
        )
        for cid, cnum, ucode, tname, lend in urgent_expiring.all():
            days_left = (lend - today).days
            items.append(AlertItem(
                alert_type="expiring_contract",
                severity="critical",
                title=f"即将到期合同: {cnum} ({ucode})",
                description=f"租户: {tname or 'N/A'}，到期日 {lend.isoformat()}" ,
                entity_id=cid,
                entity_name=cnum,
                days_overdue=-days_left,
                metric_value=float(days_left),
                unit="天",
            ))

    # Sort by severity order, then by absolute days_over descending (most urgent first)
    items.sort(key=lambda x: (_SEVERITY_ORDER.get(x.severity, 99), -abs(x.days_overdue or 0)))

    # Count per severity
    critical_count = sum(1 for i in items if i.severity == "critical")
    warning_count = sum(1 for i in items if i.severity == "warning")
    info_count = sum(1 for i in items if i.severity == "info")

    return AlertsResponse(
        total_count=len(items),
        critical_count=critical_count,
        warning_count=warning_count,
        info_count=info_count,
        items=items,
        generated_at=datetime.now(),
    )
