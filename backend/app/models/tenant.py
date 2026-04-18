"""Tenant (merchant) model."""

import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class TenantType(str, enum.Enum):
    INDIVIDUAL = "individual"
    COMPANY = "company"


class TenantStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PROSPECT = "prospect"
    BLACKLISTED = "blacklisted"


class BrandTier(str, enum.Enum):
    S = "s"
    A = "a"
    B = "b"
    C = "c"
    LIANFA = "lianfa"
    UNKNOWN = "unknown"


class Tenant(Base):
    """Merchant/tenant entity."""

    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[TenantType] = mapped_column(Enum(TenantType), default=TenantType.COMPANY)

    # Contact info
    contact_person: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Business info
    business_license: Mapped[str | None] = mapped_column(String(100), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)

    status: Mapped[TenantStatus] = mapped_column(Enum(TenantStatus), default=TenantStatus.PROSPECT)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Brand classification
    brand_tier: Mapped[BrandTier | None] = mapped_column(
        Enum(BrandTier), nullable=True, default=None,
        comment="Brand tier: S/A/B/C/lianfa"
    )
    is_flagship: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, default=False,
        comment="Is flagship store"
    )
    is_first_entry: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, default=False,
        comment="Is first entry brand"
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    contracts: Mapped[list["Contract"]] = relationship(back_populates="tenant", lazy="noload")
