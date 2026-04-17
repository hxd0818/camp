"""Operations / maintenance models."""

import enum
from datetime import datetime, date
from sqlalchemy import String, Text, DateTime, Date, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class WorkOrderPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class WorkOrderStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    PENDING_PARTS = "pending_parts"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    CLOSED = "closed"


class WorkOrderCategory(str, enum.Enum):
    HVAC = "hvac"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    ELEVATOR = "elevator"
    FIRE_SAFETY = "fire_safety"
    CLEANING = "cleaning"
    SECURITY = "security"
    GENERAL = "general"
    OTHER = "other"


class WorkOrder(Base):
    """Maintenance / operations work order."""

    __tablename__ = "work_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"), nullable=True)
    mall_id: Mapped[int] = mapped_column(ForeignKey("malls.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    category: Mapped[WorkOrderCategory] = mapped_column(
        Enum(WorkOrderCategory), default=WorkOrderCategory.GENERAL
    )
    priority: Mapped[WorkOrderPriority] = mapped_column(
        Enum(WorkOrderPriority), default=WorkOrderPriority.MEDIUM
    )
    status: Mapped[WorkOrderStatus] = mapped_column(
        Enum(WorkOrderStatus), default=WorkOrderStatus.OPEN
    )

    requested_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(100), nullable=True)

    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    unit: Mapped["Unit | None"] = relationship(back_populates="work_orders")
