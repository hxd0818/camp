"""Pydantic schemas for Market News."""

from datetime import datetime
from pydantic import BaseModel, Field


class NewsBase(BaseModel):
    title: str = Field(..., max_length=300)
    content: str | None = None
    source: str | None = Field(None, max_length=200)
    category: str = "industry"
    cover_image_url: str | None = None


class NewsCreate(NewsBase):
    mall_id: int | None = None
    is_published: bool = False


class NewsUpdate(BaseModel):
    title: str | None = Field(None, max_length=300)
    content: str | None = None
    source: str | None = Field(None, max_length=200)
    category: str | None = None
    cover_image_url: str | None = None
    is_published: bool | None = None


class NewsResponse(NewsBase):
    id: int
    mall_id: int | None = None
    is_published: bool
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
