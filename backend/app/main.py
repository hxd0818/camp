"""CAMP Backend - FastAPI application entry point."""

import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import init_db

logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - startup and shutdown events."""
    # Startup: initialize database with retry logic
    max_retries = 10
    retry_delay = 3

    for attempt in range(1, max_retries + 1):
        try:
            await init_db()
            logger.info("Database initialized successfully")
            break
        except Exception as e:
            if attempt == max_retries:
                logger.error(f"Failed to initialize database after {max_retries} attempts: {e}")
                raise
            logger.warning(
                f"Database not ready (attempt {attempt}/{max_retries}), "
                f"retrying in {retry_delay}s... ({e})"
            )
            await asyncio.sleep(retry_delay)

    yield

    # Shutdown
    pass


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title=settings.app_name,
        description="Commercial Asset Management Platform API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    from app.api.v1 import router as v1_router  # noqa: F401

    app.include_router(v1_router, prefix="/api/v1")

    # Serve uploaded files (floor plan images, etc.)
    import os
    upload_dir = settings.upload_dir
    os.makedirs(upload_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "ok", "service": "camp-api"}

    return app


app = create_app()
