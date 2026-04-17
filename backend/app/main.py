"""CAMP Backend - FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - startup and shutdown events."""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

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

    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "ok", "service": "camp-api"}

    return app


app = create_app()
