"""Application settings loaded from environment variables / .env file."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    """Centralised, typed application configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    # --- Project metadata ---
    PROJECT_NAME: str = "SentinelVision API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Backend API for the SentinelVision surveillance platform."
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
   # --- Database ---
    DATABASE_URL: str = (
        "sqlite+aiosqlite:///./sentinelvision.db"
    )
    DB_ECHO: bool = False
    # --- Security / JWT ---
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_use_a_long_random_string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    # --- Logging ---
    LOG_LEVEL: str = "INFO"
    LOG_JSON: bool = False
    # --- CORS ---
    CORS_ORIGINS: list[str] = ["*"]
    # --- Bootstrap admin (created on startup if it does not exist) ---
    FIRST_ADMIN_USERNAME: str = "admin"
    FIRST_ADMIN_PASSWORD: str = "admin123"
    AUTO_CREATE_TABLES: bool = True
    SEED_ADMIN: bool = True
@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


settings = get_settings()
