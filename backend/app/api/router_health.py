"""Health and system API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.core.database import engine
from app.models.user import User
from app.schemas.common import HealthResponse
from app.schemas.system import PricingRules, SystemSettingsResponse
from app.services import analytics_service

router = APIRouter(tags=["System"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    dialect = engine.dialect.name
    database = "postgresql" if dialect == "postgresql" else dialect
    return HealthResponse(
        status="ok",
        environment=settings.ENVIRONMENT,
        database=database,
        version=settings.APP_VERSION,
    )


@router.get("/metrics")
def metrics(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    return {"summary": analytics_service.compute_analytics_summary(db, period="30d")}


@router.get("/system/settings", response_model=SystemSettingsResponse)
def system_settings(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> SystemSettingsResponse:
    """Non-secret platform configuration and data source registry."""
    from app.models.product import Product
    from app.models.user import User as UserModel

    generated_at = None
    latest_product = db.query(Product).order_by(Product.created_at.asc()).first()
    if latest_product:
        generated_at = latest_product.created_at

    return SystemSettingsResponse(
        app_name=settings.APP_NAME,
        app_version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        as_of_date=settings.AS_OF_DATE,
        database_dialect=engine.dialect.name,
        auto_seed=settings.AUTO_SEED,
        cors_origins=settings.cors_origin_list,
        pricing_rules=PricingRules(
            min_profit_margin_pct=settings.MIN_PROFIT_MARGIN_PCT,
            max_profit_margin_pct=settings.MAX_PROFIT_MARGIN_PCT,
            price_floor_buffer_pct=settings.PRICE_FLOOR_BUFFER_PCT,
            price_ceiling_buffer_pct=settings.PRICE_CEILING_BUFFER_PCT,
            competitor_freshness_days=settings.COMPETITOR_FRESHNESS_DAYS,
            stale_deviation_threshold_pct=settings.STALE_DEVIATION_THRESHOLD_PCT,
            demand_high_multiplier=settings.DEMAND_HIGH_MULTIPLIER,
            demand_medium_multiplier=settings.DEMAND_MEDIUM_MULTIPLIER,
            demand_low_multiplier=settings.DEMAND_LOW_MULTIPLIER,
            inventory_discount_max_pct=settings.INVENTORY_DISCOUNT_MAX_PCT,
            inventory_overstock_multiplier=settings.INVENTORY_OVERSTOCK_MULTIPLIER,
        ),
        data_sources=[
            {"name": "Cost history", "table": "cost_history", "source": "ERP cost feed"},
            {"name": "Inventory", "table": "inventory_snapshots", "source": "Warehouse WMS"},
            {
                "name": "Competitor prices",
                "table": "competitor_observations",
                "source": "Web scraping",
            },
            {"name": "Orders", "table": "customer_orders", "source": "Commerce platform"},
            {"name": "Promotions", "table": "promotions", "source": "Merchandising"},
        ],
        seeded_at=generated_at,
    )
