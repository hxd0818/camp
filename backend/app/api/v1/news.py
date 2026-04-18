"""Market News API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timezone

from app.database import get_db
from app.models.market_news import MarketNews
from app.schemas.news import NewsCreate, NewsUpdate, NewsResponse

router = APIRouter()


@router.get("", response_model=list[NewsResponse])
async def list_news(
    mall_id: int | None = Query(None),
    category: str | None = Query(None),
    is_published: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List market news with optional filters."""
    query = select(MarketNews).order_by(desc(MarketNews.created_at))
    if mall_id is not None:
        query = query.where(MarketNews.mall_id == mall_id)
    if category is not None:
        query = query.where(MarketNews.category == category)
    if is_published is not None:
        query = query.where(MarketNews.is_published == is_published)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=NewsResponse, status_code=201)
async def create_news(news: NewsCreate, db: AsyncSession = Depends(get_db)):
    """Create a new market news article."""
    db_news = MarketNews(
        mall_id=news.mall_id,
        title=news.title,
        content=news.content,
        source=news.source,
        category=news.category,
        cover_image_url=news.cover_image_url,
        is_published=news.is_published,
        published_at=datetime.now(timezone.utc) if news.is_published else None,
    )
    db.add(db_news)
    await db.flush()
    await db.refresh(db_news)
    return db_news


@router.get("/{news_id}", response_model=NewsResponse)
async def get_news(news_id: int, db: AsyncSession = Depends(get_db)):
    """Get news article by ID."""
    result = await db.execute(select(MarketNews).where(MarketNews.id == news_id))
    news = result.scalar_one_or_none()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    return news


@router.put("/{news_id}", response_model=NewsResponse)
async def update_news(news_id: int, update: NewsUpdate, db: AsyncSession = Depends(get_db)):
    """Update news article."""
    result = await db.execute(select(MarketNews).where(MarketNews.id == news_id))
    news = result.scalar_one_or_none()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(news, field, value)

    await db.flush()
    await db.refresh(news)
    return news


@router.delete("/{news_id}", status_code=204)
async def delete_news(news_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a news article."""
    result = await db.execute(select(MarketNews).where(MarketNews.id == news_id))
    news = result.scalar_one_or_none()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")
    await db.delete(news)
    await db.flush()
    return None


@router.put("/{news_id}/publish", response_model=NewsResponse)
async def toggle_publish(news_id: int, is_published: bool, db: AsyncSession = Depends(get_db)):
    """Toggle publish status of a news article."""
    result = await db.execute(select(MarketNews).where(MarketNews.id == news_id))
    news = result.scalar_one_or_none()
    if not news:
        raise HTTPException(status_code=404, detail="News not found")

    news.is_published = is_published
    if is_published:
        news.published_at = datetime.now(timezone.utc)
    else:
        news.published_at = None

    await db.flush()
    await db.refresh(news)
    return news
