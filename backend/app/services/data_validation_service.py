"""Data validation service for dataset quality checks."""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.competitor import CompetitorObservation
from app.models.cost_history import CostHistory
from app.models.exception import ExceptionRecord
from app.models.inventory import InventorySnapshot
from app.models.order import CustomerOrder
from app.models.price_history import PriceHistory, PricingDecision
from app.models.product import Product
from app.models.promotion import Promotion
from app.services import synthetic_data_service

ALLOWED_LIFECYCLE_STATES = {"ACTIVE", "RETIRED", "PLANNED"}
ALLOWED_PROMOTION_STATUSES = {"ACTIVE", "INACTIVE", "SCHEDULED", "EXPIRED"}
ALLOWED_DECISION_STATUSES = {"APPROVED", "BLOCKED", "PENDING", "FLAGGED"}


def _check(name: str, passed: bool, details: str) -> dict[str, Any]:
    return {"check": name, "passed": bool(passed), "details": details}


def _pk_uniqueness(db: Session, model, pk_column) -> dict[str, Any]:
    total = db.query(model).count()
    distinct = db.query(func.count(func.distinct(pk_column))).scalar() or 0
    return _check(
        f"primary_key_uniqueness::{model.__tablename__}",
        total == distinct,
        f"{distinct}/{total} distinct primary keys",
    )


def validate_dataset(db: Session) -> dict[str, Any]:
    """Run the full data validation suite against stored records."""
    checks: list[dict[str, Any]] = []

    # 1. Primary key uniqueness.
    for model, pk in (
        (Product, Product.sku),
        (CostHistory, CostHistory.cost_id),
        (PriceHistory, PriceHistory.price_id),
        (CompetitorObservation, CompetitorObservation.observation_id),
        (InventorySnapshot, InventorySnapshot.snapshot_id),
        (Promotion, Promotion.promotion_id),
        (PricingDecision, PricingDecision.decision_id),
        (ExceptionRecord, ExceptionRecord.exception_id),
        (CustomerOrder, CustomerOrder.order_id),
    ):
        checks.append(_pk_uniqueness(db, model, pk))

    # 2. Foreign key integrity.
    product_skus = {row[0] for row in db.query(Product.sku).all()}
    dependent_skus = {
        "cost_history": {row[0] for row in db.query(CostHistory.sku).all()},
        "price_history": {row[0] for row in db.query(PriceHistory.sku).all()},
        "competitor_observations": {row[0] for row in db.query(CompetitorObservation.sku).all()},
        "inventory_snapshots": {row[0] for row in db.query(InventorySnapshot.sku).all()},
        "pricing_decisions": {row[0] for row in db.query(PricingDecision.sku).all()},
        "exceptions": {row[0] for row in db.query(ExceptionRecord.sku).all()},
    }
    for table, skus in dependent_skus.items():
        orphaned = skus - product_skus
        checks.append(_check(f"foreign_key_integrity::{table}", not orphaned, f"{len(orphaned)} orphaned references"))

    # 3. Duplicate record rate.
    price_dupes = (
        db.query(PriceHistory.sku, PriceHistory.effective_date, func.count())
        .group_by(PriceHistory.sku, PriceHistory.effective_date)
        .having(func.count() > 1)
        .count()
    )
    checks.append(_check("duplicate_record_rate", price_dupes == 0, f"{price_dupes} duplicate (sku, effective_date) price groups"))

    # 4. Missing required field rate.
    missing_products = db.query(Product).filter(
        (Product.name.is_(None)) | (Product.category.is_(None)) | (Product.brand.is_(None))
    ).count()
    missing_costs = db.query(CostHistory).filter(CostHistory.cost_amount.is_(None)).count()
    checks.append(_check("missing_required_field_rate", missing_products == 0 and missing_costs == 0, f"{missing_products + missing_costs} missing required fields"))

    # 5. Arithmetic reconciliation accuracy for orders.
    orders = db.query(CustomerOrder).all()
    mismatches = 0
    for o in orders:
        expected = round((float(o.unit_price) - float(o.discount_amount)) * int(o.quantity), 2)
        if abs(expected - float(o.revenue)) > 0.01:
            mismatches += 1
    checks.append(_check("arithmetic_reconciliation_accuracy", mismatches == 0, f"{mismatches} of {len(orders)} orders failed revenue reconciliation"))

    # 6. Lifecycle validation.
    bad_lifecycle = db.query(Product).filter(~Product.lifecycle_state.in_(ALLOWED_LIFECYCLE_STATES)).count()
    bad_promo_status = db.query(Promotion).filter(~Promotion.status.in_(ALLOWED_PROMOTION_STATUSES)).count()
    bad_decision_status = db.query(PricingDecision).filter(~PricingDecision.status.in_(ALLOWED_DECISION_STATUSES)).count()
    checks.append(_check("lifecycle_validation_rate", bad_lifecycle + bad_promo_status + bad_decision_status == 0, f"{bad_lifecycle + bad_promo_status + bad_decision_status} invalid lifecycle states"))

    # 7. Date ordering: cost and price effective dates within dataset range.
    costs = db.query(CostHistory).all()
    bad_cost_dates = sum(1 for c in costs if c.effective_date is None)
    checks.append(_check("date_ordering::cost_effective_dates", bad_cost_dates == 0, f"{bad_cost_dates} cost records with missing effective dates"))

    products = db.query(Product).all()
    bad_promo_dates = sum(1 for p in db.query(Promotion).all() if p.end_date < p.start_date)
    checks.append(_check("date_ordering::promotion_windows", bad_promo_dates == 0, f"{bad_promo_dates} promotions end before start"))

    # 8. Promotion stacking validity: no two non-stackable active promotions applied to same SKU.
    from app.models.promotion import PromotionProduct

    mapping = db.query(PromotionProduct).all()
    pairs: dict[str, int] = {}
    for row in mapping:
        pairs[row.sku] = pairs.get(row.sku, 0) + 1
    over_stacked = sum(1 for sku, count in pairs.items() if count > 2)
    checks.append(_check("promotion_stacking_validity", over_stacked == 0, f"{over_stacked} SKUs mapped to more than two promotions"))

    # 9. Determinism: regenerate record metadata twice and compare checksums.
    records_a = synthetic_data_service._build_records("starter")
    records_b = synthetic_data_service._build_records("starter")
    checksum_a = synthetic_data_service._checksum(
        [{"products": records_a["products"], "prices": records_a["prices"]}]
    )
    checksum_b = synthetic_data_service._checksum(
        [{"products": records_b["products"], "prices": records_b["prices"]}]
    )
    checks.append(_check("reproducibility_checksum_match", checksum_a == checksum_b, f"{checksum_a[:16]}… vs {checksum_b[:16]}…"))

    # 10. Ground-truth separation: labels live only in exceptions with issue_type, never product features.
    ground_truth_types = {row[0] for row in db.query(ExceptionRecord.issue_type).distinct().all()}
    known = {
        "PRICE_BELOW_FLOOR",
        "PROMOTION_STACK_VIOLATION",
        "STALE_COMPETITOR_OBSERVATION",
        "INCORRECT_MARGIN_CALCULATION",
        "MISSING_PRICE_CHANGE_REASON",
    }
    checks.append(_check("ground_truth_separation", ground_truth_types.issubset(known | {"OTHER"}), f"issue types: {sorted(ground_truth_types)}"))

    failed = [c for c in checks if not c["passed"]]
    return {
        "dataset_mode": "starter",
        "checks": checks,
        "passed": len(failed) == 0,
        "total_checks": len(checks),
        "failed_checks": len(failed),
    }
