"""Unit (store/lease unit) model - core entity of CAMP."""

import enum
from datetime import datetime
from sqlalchemy import String, Float, Integer, Enum, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class UnitStatus(str, enum.Enum):
    VACANT = "vacant"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    MAINTENANCE = "maintenance"
    BLOCKED = "blocked"


class UnitLayoutType(str, enum.Enum):
    RETAIL = "retail"           # Standard retail store
    KIOSK = "kiosk"             # Kiosk / cart
    FOOD_COURT = "food_court"   # Food court stall
    ANCHOR = "anchor"           # Anchor tenant (large space)
    COMMON_AREA = "common_area" # Common area (not leasable)
    OTHER = "other"


class Unit(Base):
    """Store/lease unit on a floor plan - the CORE entity of CAMP."""

    __tablename__ = "units"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    floor_id: Mapped[int] = mapped_column(ForeignKey("floors.id"), nullable=False)

    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # e.g., "A-101"
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # e.g., "Starbucks"
    layout_type: Mapped[UnitLayoutType] = mapped_column(
        Enum(UnitLayoutType), default=UnitLayoutType.RETAIL
    )
    status: Mapped[UnitStatus] = mapped_column(Enum(UnitStatus), default=UnitStatus.VACANT)

    # Physical attributes
    gross_area: Mapped[float | None] = mapped_column(Float, nullable=True)  # sqm
    net_leasable_area: Mapped[float | None] = mapped_column(Float, nullable=True)  # sqm
    ceiling_height: Mapped[float | None] = mapped_column(Float, nullable=True)  # meters

    # Floor plan hotspot data (JSON coordinates on the floor plan image)
    hotspot_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Example: {"x": 120, "y": 80, "width": 150, "height": 100, "shape": "rect",
    #           "points": [[120,80],[270,80],[270,180],[120,180]]}  # for polygon

    # Additional info
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    floor: Mapped["Floor"] = relationship(back_populates="units")
    current_contract: Mapped["Contract | None"] = relationship(
        back_populates="unit", uselist=False, lazy="selectin"
    )
    work_orders: Mapped[list["WorkOrder"]] = relationship(back_populates="unit", lazy="noload")


class FloorPlan(Base):
    """Floor plan blueprint with hotspot definitions."""

    __tablename__ = "floor_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    floor_id: Mapped[int] = mapped_column(ForeignKey("floors.id"), nullable=False)

    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    image_width: Mapped[int | None] = mapped_column(Integer, nullable=True)  # original px width
    image_height: Mapped[int | None] = mapped_column(Integer, nullable=True)  # original px height

    # All hotspots for this floor plan
    hotspots: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Example: [
    #   {"unit_id": 1, "unit_code": "A-101", "x": 100, "y": 50, "w": 120, "h": 80,
    #    "shape": "rect", "status_color": "#22c55e"},
    #   ...
    # ]

    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    floor: Mapped["Floor"] = relationship(back_populates="floor_plans")
