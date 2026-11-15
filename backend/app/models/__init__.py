"""SQLAlchemy model registry."""

from __future__ import annotations

from app.models import (  # noqa: F401
    audit_order,
    competitor,
    exception,
    inventory,
    order,
    price_history,
    product,
    promotion,
    system_metric,
    user,
)

from app.models.base import Base

__all__ = ["Base"]
