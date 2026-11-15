"""Application configuration for PricePilot AI.

Values are loaded from environment variables, falling back to ``backend/.env``.
Database credentials live only in the backend environment - never in the frontend.
"""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Environment driven application settings."""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "PricePilot AI"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # PostgreSQL by default. SQLite remains available for throwaway unit tests.
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/pricepilot_ai"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_ECHO: bool = False
    AUTO_SEED: bool = True

    SECRET_KEY: str = "pricepilot-dev-secret-key-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30
    JWT_ALGORITHM: str = "HS256"
    BCRYPT_ROUNDS: int = 12

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    COMPETITOR_FRESHNESS_DAYS: int = 7
    AS_OF_DATE: str = "2026-01-31"
    MIN_PROFIT_MARGIN_PCT: float = 20.0
    MAX_PROFIT_MARGIN_PCT: float = 60.0
    PRICE_FLOOR_BUFFER_PCT: float = 0.0
    PRICE_CEILING_BUFFER_PCT: float = 0.0
    STALE_DEVIATION_THRESHOLD_PCT: float = 10.0

    DEMAND_HIGH_MULTIPLIER: float = 1.08
    DEMAND_MEDIUM_MULTIPLIER: float = 1.0
    DEMAND_LOW_MULTIPLIER: float = 0.95
    INVENTORY_DISCOUNT_MAX_PCT: float = 15.0
    INVENTORY_OVERSTOCK_MULTIPLIER: float = 0.9

    LOG_LEVEL: str = "INFO"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_postgres(self) -> bool:
        return self.DATABASE_URL.startswith("postgresql")


settings = Settings()
