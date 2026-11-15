"""Deterministic, explainable pricing engine."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from app.core.config import settings
from app.core.errors import ValidationError

DEMAND_LEVELS = ("HIGH", "MEDIUM", "LOW", "STABLE")


class ConstraintResult:
    """Outcome of a single pricing constraint check."""

    def __init__(self, rule_code: str, passed: bool, detail: str, severity: str = "HIGH"):
        self.rule_code = rule_code
        self.passed = passed
        self.detail = detail
        self.severity = severity


class PricingEngineResult:
    """Result of a pricing evaluation including decision context."""

    def __init__(
        self,
        *,
        sku: str,
        cost: float,
        current_price: float,
        recommended_price: float,
        applied_discount: float,
        expected_margin: float,
        status: str,
        reason: Optional[str] = None,
        constraints: Optional[list[ConstraintResult]] = None,
        demand_signal: Optional[dict] = None,
        inventory_signal: Optional[dict] = None,
        competitor_signal: Optional[dict] = None,
        applicable_rules: Optional[dict] = None,
        exception_issue: Optional[str] = None,
        exception_detail: Optional[str] = None,
    ):
        self.sku = sku
        self.cost = cost
        self.current_price = current_price
        self.recommended_price = recommended_price
        self.applied_discount = applied_discount
        self.expected_margin = expected_margin
        self.status = status
        self.reason = reason
        self.constraints = constraints or []
        self.demand_signal = demand_signal or {}
        self.inventory_signal = inventory_signal or {}
        self.competitor_signal = competitor_signal or {}
        self.applicable_rules = applicable_rules or {}
        self.exception_issue = exception_issue
        self.exception_detail = exception_detail


def compute_price_floor(cost: float, min_margin_pct: float) -> float:
    """Minimum permitted selling price = Cost / (1 - Minimum Margin)."""
    if min_margin_pct >= 100:
        raise ValidationError("Minimum margin must be less than 100 percent")
    return round(cost / (1 - min_margin_pct / 100.0), 2)


def compute_price_ceiling(cost: float, max_margin_pct: float) -> float:
    """Maximum permitted selling price = Cost / (1 - Maximum Margin)."""
    if max_margin_pct >= 100:
        return round(cost * 10.0, 2)
    return round(cost / (1 - max_margin_pct / 100.0), 2)


def compute_actual_margin(cost: float, selling_price: float) -> float:
    """Actual margin = (Final Price - Cost) / Final Price * 100."""
    if selling_price <= 0:
        raise ValidationError("Selling price must be positive")
    return round((selling_price - cost) / selling_price * 100.0, 4)


def compute_margin_after_discount(
    cost: float, candidate_price: float, discount_percent: float
) -> tuple[float, float]:
    """Return (actual margin, final discounted price) using post-discount margin."""
    final_price = round(candidate_price * (1 - discount_percent / 100.0), 2)
    return compute_actual_margin(cost, final_price), final_price


def _demand_multiplier(demand_level: str) -> float:
    mapping = {
        "HIGH": settings.DEMAND_HIGH_MULTIPLIER,
        "MEDIUM": settings.DEMAND_MEDIUM_MULTIPLIER,
        "LOW": settings.DEMAND_LOW_MULTIPLIER,
        "STABLE": settings.DEMAND_MEDIUM_MULTIPLIER,
    }
    return float(mapping.get(demand_level, mapping["STABLE"]))


def evaluate_pricing(
    *,
    sku: str,
    cost: float,
    current_price: float,
    min_margin_pct: float = 20.0,
    max_margin_pct: float = 60.0,
    demand_level: str = "STABLE",
    available_stock: int = 0,
    reserved_quantity: int = 0,
    reorder_point: int = 0,
    competitor_price: Optional[float] = None,
    competitor_observed_at: Optional[datetime] = None,
    competitor_is_stale: bool = False,
    promotion=None,
    price_floor: Optional[float] = None,
    price_ceiling: Optional[float] = None,
) -> PricingEngineResult:
    """Run the deterministic pricing decision pipeline."""

    constraints: list[ConstraintResult] = []
    floor = price_floor if price_floor is not None else compute_price_floor(cost, min_margin_pct)
    ceiling = price_ceiling if price_ceiling is not None else compute_price_ceiling(cost, max_margin_pct)

    if current_price < floor - 1e-9:
        constraints.append(
            ConstraintResult(
                "PRICE_BELOW_FLOOR",
                False,
                f"Current price {current_price} is below minimum floor {floor}",
                severity="HIGH",
            )
        )
    if current_price > ceiling + 1e-9:
        constraints.append(
            ConstraintResult(
                "PRICE_ABOVE_CEILING",
                False,
                f"Current price {current_price} is above maximum ceiling {ceiling}",
                severity="HIGH",
            )
        )

    demand_mult = _demand_multiplier(demand_level)
    demand_signal: dict[str, Any] = {
        "demand_level": demand_level,
        "multiplier": round(demand_mult, 4),
        "source": "simulated",
    }

    effective_stock = max(int(available_stock) - int(reserved_quantity), 0)
    stockout_risk = effective_stock <= reorder_point
    excess_stock = effective_stock > max(reorder_point * 2, reorder_point + int(settings.INVENTORY_OVERSTOCK_MULTIPLIER * max(reorder_point, 1)))
    inventory_signal: dict[str, Any] = {
        "available_stock": effective_stock,
        "reserved_quantity": reserved_quantity,
        "reorder_point": reorder_point,
        "stockout_risk": stockout_risk,
        "excess_stock": bool(excess_stock),
        "quantity": effective_stock,
    }

    competitor_signal: dict[str, Any] = {
        "competitor_price": competitor_price,
        "observed_at": competitor_observed_at.isoformat() if competitor_observed_at else None,
        "is_stale": competitor_is_stale,
        "used": False,
    }

    stale_warning = False
    if competitor_is_stale:
        stale_warning = True
        competitor_price = None
        constraints.append(
            ConstraintResult(
                "STALE_COMPETITOR_OBSERVATION",
                False,
                "Competitor observation is older than the freshness window and was excluded",
                severity="MEDIUM",
            )
        )

    candidate_price = round(current_price * demand_mult, 2)
    if excess_stock and demand_level == "LOW" and settings.INVENTORY_DISCOUNT_MAX_PCT > 0:
        candidate_price = round(candidate_price * (1 - settings.INVENTORY_DISCOUNT_MAX_PCT / 100.0), 2)

    # Never let an intermediate candidate breach the protected floor/ceiling.
    candidate_price = min(max(candidate_price, floor), ceiling)

    competitor_applied = False
    if competitor_price is not None and not competitor_is_stale:
        deviation_pct = abs(current_price - competitor_price) / competitor_price * 100.0
        competitor_applied = True
        competitor_signal["used"] = True
        competitor_signal["deviation_pct"] = round(deviation_pct, 4)
        competitor_signal["competitor_price"] = competitor_price
        competitor_signal["deviation"] = round(abs(current_price - competitor_price), 2)
        if deviation_pct > settings.STALE_DEVIATION_THRESHOLD_PCT and competitor_price < current_price:
            # Match a cheaper competitor only down to the protected price floor.
            competitor_floor = max(floor, competitor_price)
            candidate_price = round(min(candidate_price, competitor_floor), 2)

    discount_percent = 0.0
    if promotion is not None and promotion.status == "ACTIVE":
        discount_percent = round(min(float(promotion.discount_value), float(promotion.max_discount_percent)), 2)

    final_price = round(candidate_price * (1 - discount_percent / 100.0), 2)
    expected_margin = compute_actual_margin(cost, final_price)

    status = "APPROVED"
    exception_issue: Optional[str] = None
    exception_detail: Optional[str] = None

    if final_price < floor - 1e-9:
        status = "BLOCKED"
        exception_issue = "PRICE_BELOW_FLOOR"
        exception_detail = f"Final price {final_price} fell below minimum permitted price {floor}"
    elif expected_margin < min_margin_pct - 1e-9:
        status = "BLOCKED"
        exception_issue = "INCORRECT_MARGIN_CALCULATION"
        exception_detail = (
            f"Discount of {discount_percent}% produced margin {round(expected_margin, 4)}% "
            f"below required {min_margin_pct}% on final price {final_price}"
        )
    elif stale_warning:
        status = "FLAGGED"
        exception_issue = "STALE_COMPETITOR_OBSERVATION"
        exception_detail = "Competitor observation is stale and was excluded from the recommendation"

    if status == "BLOCKED":
        final_price = current_price
        discount_percent = 0.0

    return PricingEngineResult(
        sku=sku,
        cost=cost,
        current_price=current_price,
        recommended_price=final_price,
        applied_discount=discount_percent if status != "BLOCKED" else 0.0,
        expected_margin=expected_margin if status != "BLOCKED" else compute_actual_margin(cost, current_price),
        status=status,
        reason=(
            "Demand and inventory signals support repricing"
            if status == "APPROVED"
            else exception_detail
        ),
        constraints=constraints,
        demand_signal=demand_signal,
        inventory_signal=inventory_signal,
        competitor_signal=competitor_signal,
        applicable_rules={
            "min_margin_pct": min_margin_pct,
            "price_floor": floor,
            "price_ceiling": ceiling,
            "discount_applied": discount_percent > 0,
            "demand_multiplier": demand_mult,
            "competitor_applied": competitor_applied,
        },
        exception_issue=exception_issue,
        exception_detail=exception_detail,
    )
