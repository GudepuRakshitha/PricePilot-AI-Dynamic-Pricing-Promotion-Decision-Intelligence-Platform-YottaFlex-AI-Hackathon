"""API router registry."""

from __future__ import annotations

from fastapi import APIRouter

from app.api import (
    router_analytics,
    router_audit,
    router_auth,
    router_competitors,
    router_costs,
    router_decisions,
    router_exceptions,
    router_health,
    router_inventory,
    router_prices,
    router_pricing,
    router_products,
    router_promotions,
    router_synthetic,
    router_users,
)

api_router = APIRouter(prefix="/api/v1")

for module in (
    router_auth,
    router_products,
    router_costs,
    router_prices,
    router_competitors,
    router_inventory,
    router_promotions,
    router_pricing,
    router_decisions,
    router_exceptions,
    router_analytics,
    router_audit,
    router_synthetic,
    router_users,
    router_health,
):
    api_router.include_router(module.router)

__all__ = ["api_router"]
