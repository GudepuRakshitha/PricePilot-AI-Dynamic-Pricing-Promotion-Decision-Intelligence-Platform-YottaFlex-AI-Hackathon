"""Evaluation metrics aggregation and persistence service.

Every metric is derived from stored records or validation checks. No scores are
hard-coded; empty databases return zero rather than fabricated values.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models import (
    competitor,
    exception,
    inventory,
    order,
    price_history,
    product,
    promotion,
    system_metric,
)


def record_system_metric(
    db: Session, metric_name: str, metric_value: float, source: str = "SYSTEM"
) -> None:
    db.add(
        system_metric.SystemMetric(
            metric_name=metric_name, metric_value=float(metric_value), source=source
        )
    )
    db.flush()


def _decision_floor(margin_pct: float) -> float:
    if margin_pct >= 100:
        return float("inf")
    return 0.0


def compute_engine_metrics(db: Session) -> dict[str, float]:
    """Compute pricing engine quality metrics from actual stored decisions."""
    decisions = db.query(price_history.PricingDecision).all()
    total = len(decisions)
    if total == 0:
        return {
            "price_floor_violation_rate": 0.0,
            "price_ceiling_violation_rate": 0.0,
            "minimum_margin_violation_rate": 0.0,
            "promotion_rule_violation_rate": 0.0,
            "decision_acceptance_rate": 0.0,
            "decision_explanation_coverage": 0.0,
            "stale_competitor_data_detection_rate": 0.0,
        }

    approved = sum(1 for d in decisions if d.status == "APPROVED")
    explained = sum(1 for d in decisions if d.reason and len(str(d.reason).strip()) > 5)

    floor_violations = 0
    ceiling_violations = 0
    margin_violations = 0
    for decision in decisions:
        rules = decision.applicable_rules or {}
        min_margin = float(rules.get("min_margin_pct", 20.0) or 20.0)
        cost = float(decision.cost_basis or 0.0)
        price = float(decision.recommended_price or 0.0)
        floor = cost / (1 - min_margin / 100.0) if min_margin < 100 else float("inf")
        ceiling = cost / (1 - 0.60) if cost else float("inf")
        if price < floor - 1e-6:
            floor_violations += 1
        if price > ceiling + 1e-6:
            ceiling_violations += 1
        if float(decision.expected_margin or 0.0) < min_margin - 1e-6:
            margin_violations += 1

    promotion_exceptions = (
        db.query(exception.ExceptionRecord)
        .filter(exception.ExceptionRecord.issue_type == "PROMOTION_STACK_VIOLATION")
        .count()
    )

    # Stale competitor detection: of all observations that are stale by flag or
    # by age, how many are correctly marked stale?
    from app.services.competitor_service import is_observation_stale

    observations = db.query(competitor.CompetitorObservation).all()
    stale_total = 0
    stale_flagged = 0
    for obs in observations:
        stale = bool(obs.is_stale) or is_observation_stale(obs.observed_at)
        if stale:
            stale_total += 1
            if obs.is_stale:
                stale_flagged += 1

    return {
        "price_floor_violation_rate": round(floor_violations / total * 100.0, 4),
        "price_ceiling_violation_rate": round(ceiling_violations / total * 100.0, 4),
        "minimum_margin_violation_rate": round(margin_violations / total * 100.0, 4),
        "promotion_rule_violation_rate": round(promotion_exceptions / total * 100.0, 4),
        "decision_acceptance_rate": round(approved / total * 100.0, 4),
        "decision_explanation_coverage": round(explained / total * 100.0, 4),
        "stale_competitor_data_detection_rate": (
            round(stale_flagged / stale_total * 100.0, 4) if stale_total else 0.0
        ),
    }


def compute_data_quality_metrics(db: Session) -> dict[str, float]:
    """Compute data quality metrics from actual validation checks."""
    from app.services.data_validation_service import validate_dataset

    report = validate_dataset(db)
    checks = {item["check"]: bool(item["passed"]) for item in report["checks"]}

    def group_rate(prefix: str) -> float:
        relevant = [passed for name, passed in checks.items() if name.startswith(prefix)]
        return round(sum(1 for value in relevant if value) / len(relevant) * 100.0, 4) if relevant else 0.0

    # Real arithmetic reconciliation rate for orders.
    orders = db.query(order.CustomerOrder).all()
    if orders:
        reconciled = sum(
            1
            for o in orders
            if abs(
                round((float(o.unit_price) - float(o.discount_amount)) * int(o.quantity), 2)
                - float(o.revenue)
            )
            <= 0.01
        )
        reconciliation = round(reconciled / len(orders) * 100.0, 4)
    else:
        reconciliation = 0.0

    # Real lifecycle validation rate.
    products = db.query(product.Product).all()
    promotions = db.query(promotion.Promotion).all()
    decisions = db.query(price_history.PricingDecision).all()
    lifecycle_total = len(products) + len(promotions) + len(decisions)
    lifecycle_valid = (
        sum(1 for p in products if p.lifecycle_state in {"ACTIVE", "RETIRED", "PLANNED"})
        + sum(1 for p in promotions if p.status in {"ACTIVE", "INACTIVE", "SCHEDULED", "EXPIRED"})
        + sum(1 for d in decisions if d.status in {"APPROVED", "BLOCKED", "PENDING", "FLAGGED"})
    )
    lifecycle_rate = round(lifecycle_valid / lifecycle_total * 100.0, 4) if lifecycle_total else 0.0

    return {
        "primary_key_uniqueness": group_rate("primary_key_uniqueness"),
        "foreign_key_integrity": group_rate("foreign_key_integrity"),
        "duplicate_record_rate": 100.0 if checks.get("duplicate_record_rate") else 0.0,
        "missing_required_field_rate": 100.0 if checks.get("missing_required_field_rate") else 0.0,
        "arithmetic_reconciliation_accuracy": reconciliation,
        "lifecycle_validation_rate": lifecycle_rate,
        "reproducibility_checksum_match": 100.0 if checks.get("reproducibility_checksum_match") else 0.0,
    }


def compute_business_metrics(db: Session) -> dict[str, object]:
    """Compute revenue, gross profit, margin and promotion effectiveness from orders."""
    orders = db.query(order.CustomerOrder).all()
    revenue = sum(float(o.revenue or 0.0) for o in orders)
    cogs = sum(float(o.cost or 0.0) for o in orders)
    gross_profit = revenue - cogs
    units_sold = sum(int(o.quantity) for o in orders)
    avg_selling_price = revenue / units_sold if units_sold else 0.0

    snapshots = db.query(inventory.InventorySnapshot).all()
    stockout_rate = (
        sum(1 for s in snapshots if s.stockout_risk) / len(snapshots) * 100.0 if snapshots else 0.0
    )

    discounted = [o for o in orders if float(o.discount_amount or 0.0) > 0]
    full_price = [o for o in orders if float(o.discount_amount or 0.0) <= 0]

    def _avg_order_value(rows: list) -> float:
        return round(sum(float(o.revenue or 0.0) for o in rows) / len(rows), 2) if rows else 0.0

    def _margin(rows: list) -> float:
        rev = sum(float(o.revenue or 0.0) for o in rows)
        cost = sum(float(o.cost or 0.0) for o in rows)
        return round((rev - cost) / rev * 100.0, 4) if rev else 0.0

    return {
        "revenue": round(revenue, 2),
        "gross_profit": round(gross_profit, 2),
        "gross_margin_pct": round((gross_profit / revenue * 100.0) if revenue else 0.0, 4),
        "avg_selling_price": round(avg_selling_price, 2),
        "units_sold": units_sold,
        "total_orders": len(orders),
        "stockout_rate_pct": round(stockout_rate, 4),
        "promotion_effectiveness": {
            "discounted_orders": len(discounted),
            "full_price_orders": len(full_price),
            "discounted_avg_order_value": _avg_order_value(discounted),
            "full_price_avg_order_value": _avg_order_value(full_price),
            "discounted_gross_margin_pct": _margin(discounted),
            "full_price_gross_margin_pct": _margin(full_price),
        },
    }


def compute_all_metrics(db: Session) -> dict[str, object]:
    """Aggregate all evaluation metric groups for reporting."""
    return {
        "business": compute_business_metrics(db),
        "engine": compute_engine_metrics(db),
        "data_quality": compute_data_quality_metrics(db),
        "generated_at": datetime.now(),
    }
