"""System configuration and operational schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class PricingRules(BaseModel):
    """Active pricing rule configuration (non-secret)."""

    min_profit_margin_pct: float
    max_profit_margin_pct: float
    price_floor_buffer_pct: float
    price_ceiling_buffer_pct: float
    competitor_freshness_days: int
    stale_deviation_threshold_pct: float
    demand_high_multiplier: float
    demand_medium_multiplier: float
    demand_low_multiplier: float
    inventory_discount_max_pct: float
    inventory_overstock_multiplier: float


class SystemSettingsResponse(BaseModel):
    """Safe, non-secret platform configuration for the Settings page."""

    app_name: str
    app_version: str
    environment: str
    as_of_date: str
    database_dialect: str
    auto_seed: bool
    cors_origins: list[str]
    pricing_rules: PricingRules
    data_sources: list[dict[str, Any]]
    seeded_at: datetime | None = None
