"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "CAMP API"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://cdata:cdata_dev_password@localhost:5432/cdata"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    algorithm: str = "HS256"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3201"]

    # File Upload
    upload_dir: str = "/app/uploads"
    max_upload_size_mb: int = 20

    # LLM (for contract AI)
    llm_api_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "qwen-plus"

    # Multi-tenant
    default_tenant_id: str | None = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
