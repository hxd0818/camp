"""Leasing Plan model for tracking leasing business plans."""

import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class PlanType(str, enum.Enum):
    """Type of leasing plan."""
    ADJUSTMENT = "adjustment"
    SPECIAL = "special"


class PlanStatus(str, enum.Enum):
    """Status of leasing plan."""
    DRAFT = "draft"
    ACTIVE = "active"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class LeasingPlan(Base):
    """Leasing business plan for tracking leasing goals and progress."""
    __tablename__ = "leasing_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    mall_id: Mapped[int] = mapped_column(Integer, ForeignKey("malls.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    plan_type: Mapped[PlanType] = mapped_column(String(20), default=PlanType.ADJUSTMENT)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    target_area: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_units: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completed_area: Mapped[float] = mapped_column(Float, default=0)
    completed_units: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[PlanStatus] = mapped_column(String(20), default=PlanStatus.DRAFT, index=True)
    owner: Mapped[str | None] = mapped_column(String(100), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    mall = relationship("Mall", lazy="selectin")
