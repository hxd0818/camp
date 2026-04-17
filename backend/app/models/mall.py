"""Mall, Building, Floor models for asset hierarchy."""

import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class MallStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNDER_CONSTRUCTION = "under_construction"


class Mall(Base):
    """Shopping center / mall entity."""

    __tablename__ = "malls"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    total_area: Mapped[float | None] = mapped_column(nullable=True)
    status: Mapped[MallStatus] = mapped_column(Enum(MallStatus), default=MallStatus.ACTIVE)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    buildings: Mapped[list["Building"]] = relationship(back_populates="mall", lazy="selectin")


class Building(Base):
    """Building within a mall."""

    __tablename__ = "buildings"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    mall_id: Mapped[int] = mapped_column(ForeignKey("malls.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    total_floors: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    mall: Mapped["Mall"] = relationship(back_populates="buildings")
    floors: Mapped[list["Floor"]] = relationship(back_populates="building", lazy="selectin")


class Floor(Base):
    """Floor within a building."""

    __tablename__ = "floors"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), nullable=False)
    floor_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    plan_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    total_area: Mapped[float | None] = mapped_column(nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    building: Mapped["Building"] = relationship(back_populates="floors")
    units: Mapped[list["Unit"]] = relationship(back_populates="floor", lazy="selectin")
    floor_plans: Mapped[list["FloorPlan"]] = relationship(back_populates="floor", lazy="selectin")
