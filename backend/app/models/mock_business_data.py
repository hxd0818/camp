"""Mock Business Data model for simulating operational metrics in Q2/Q3."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class MockBusinessData(Base):
    """Mock business data for simulating operational metrics."""

    __tablename__ = "mock_business_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mall_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("malls.id"), nullable=False, index=True
    )
    unit_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("units.id"), nullable=True, index=True
    )
    tenant_id_ref: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("tenants.id"), nullable=True, index=True
    )
    data_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    daily_traffic: Mapped[int | None] = mapped_column(Integer, nullable=True)
    daily_sales: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    monthly_sales: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    sales_per_sqm: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    rent_to_sales_ratio: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
