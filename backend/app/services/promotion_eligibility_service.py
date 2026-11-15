"""Promotion eligibility and stacking validation."""

from __future__ import annotations

import json
from datetime import date
from typing import Any, Optional

from app.core.config import settings
from app.core.errors import ValidationError
from app.models.product import Product
from app.models.promotion import Promotion, PromotionProduct
from sqlalchemy.orm import Session


def analysis_date() -> date:
    try:
        year, month, day = (int(part) for part in settings.AS_OF_DATE.split("-"))
        return date(year, month, day)
    except (ValueError, AttributeError):
        return date.today()


def _as_list(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(v) for v in value]
    if isinstance(value, str):
        parsed = json.loads(value)
        return [str(v) for v in parsed] if isinstance(parsed, list) else []
    return [str(value)]


def _covers(promo: Promotion, product: Optional[Product]) -> bool:
    if product is None:
        return True
    categories = {c.upper() for c in _as_list(promo.applicable_categories)}
    brands = {b.upper() for b in _as_list(promo.applicable_brands)}
    if categories and product.category.upper() not in categories:
        return False
    if brands and product.brand.upper() not in brands:
        return False
    return True


def check_promotion_eligibility(
    db: Session,
    *,
    sku: str,
    promotion: Promotion,
    product: Optional[Product] = None,
    quantity: int = 1,
    customer_total_value: float = 0.0,
) -> dict[str, Any]:
    """Evaluate promotion eligibility and return computed discount context."""
    today = analysis_date()
    reasons: list[str] = []
    applicable = promotion.start_date <= today <= promotion.end_date
    if not applicable:
        reasons.append("Promotion is not active on the evaluation date")
    if not _covers(promo=promotion, product=product):
        reasons.append("Promotion does not cover the product category or brand")
    if quantity < 1:
        reasons.append("Quantity must be positive")

    coupon_exclusions = {c.upper() for c in _as_list(promotion.coupon_exclusions)}
    if "*" in coupon_exclusions:
        reasons.append("Coupon exclusion wildcard blocks all coupons")

    min_purchase_ok = customer_total_value >= promotion.min_purchase_value
    if customer_total_value < promotion.min_purchase_value:
        reasons.append("Minimum purchase value not met")

    stacking_conflicts: list[str] = []
    if promotion.stacking_allowed:
        rows = (
            db.query(Promotion, PromotionProduct)
            .join(Promotion, Promotion.promotion_id == PromotionProduct.promotion_id)
            .filter(
                PromotionProduct.sku == sku,
                Promotion.status == "ACTIVE",
                Promotion.promotion_id != promotion.promotion_id,
                Promotion.start_date <= today,
                Promotion.end_date >= today,
            )
            .all()
        )
        for other, _row in rows:
            if _covers(promo=other, product=product):
                stacking_conflicts.append(f"Stacking conflict with {other.promotion_id}")
    if stacking_conflicts:
        reasons.append("Promotion stacking conflict detected")

    eligible = not reasons
    discount_percent = 0.0
    discount_amount = 0.0
    final_price = 0.0
    if eligible:
        discount_percent = round(min(float(promotion.discount_value), float(promotion.max_discount_percent)), 2)
        discount_amount = round(discount_percent * quantity, 2)

    return {
        "promotion_id": promotion.promotion_id,
        "sku": sku,
        "eligible": eligible,
        "reason": "; ".join(reasons) if reasons else "Eligible",
        "discount_percent": discount_percent if eligible else 0.0,
        "discount_amount": discount_amount if eligible else 0.0,
        "final_price": final_price,
        "min_purchase_value": float(promotion.min_purchase_value),
        "stacking_conflicts": stacking_conflicts,
    }
