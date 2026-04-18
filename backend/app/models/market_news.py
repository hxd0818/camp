"""Market News model for industry news and updates."""

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models import Base


class NewsCategory(str, enum.Enum):
    """News category enumeration."""
    INDUSTRY = "industry"
    POLICY = "policy"
    GROUP = "group"


class MarketNews(Base):
    """Market news model for industry news and updates."""

    __tablename__ = "market_news"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    mall_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("malls.id"), nullable=True, index=True
    )

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(200), nullable=True)
    category: Mapped[NewsCategory] = mapped_column(String(20), default=NewsCategory.INDUSTRY)
    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_published: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    mall = relationship("Mall", lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<MarketNews(id={self.id}, title='{self.title}', "
            f"category={self.category}, is_published={self.is_published})>"
        )
