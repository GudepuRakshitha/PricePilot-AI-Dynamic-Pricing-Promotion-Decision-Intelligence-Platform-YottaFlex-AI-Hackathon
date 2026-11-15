"""Database seeding: default users, synthetic dataset and labelled edge cases."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.core import security
from app.models.audit_order import AuditLog
from app.models.audit_order import AuditLog
from app.models.competitor import CompetitorObservation
from app.models.exception import ExceptionRecord
from app.models.price_history import PricingDecision
from app.models.product import Product
from app.models.promotion import Promotion
from app.models.user import User
from app.services import competitor_service, decision_service, exception_service, pricing_engine, synthetic_data_service

DEFAULT_USERS = [
    ("admin@pricepilot.ai", "Admin@12345", "Gudepu Rakshitha Reddy", "ADMIN"),
    ("manager@pricepilot.ai", "Manager@12345", "Srinivas", "PRICING_MANAGER"),
    ("analyst@pricepilot.ai", "Analyst@12345", "Chaithanya", "ANALYST"),
]


def seed_users(db: Session) -> None:
    for email, password, full_name, role in DEFAULT_USERS:
        if db.query(User).filter_by(email=email).first():
            continue
        db.add(
            User(
                id=f"USR-{email.split('@')[0].upper()}",
                email=email,
                hashed_password=security.hash_password(password),
                full_name=full_name,
                role=role,
                is_active=True,
            )
        )
    db.commit()


def seed_demo_data(db: Session, mode: str = "starter") -> dict:
    """Generate baseline synthetic data and inject the five labelled edge cases."""
    summary = synthetic_data_service.generate_and_persist(db, mode=mode)
    summary.update(inject_edge_cases(db))
    return summary


def _get_cost(db: Session, sku: str) -> float:
    from app.models.cost_history import CostHistory

    record = (
        db.query(CostHistory)
        .filter(CostHistory.sku == sku)
        .order_by(CostHistory.effective_date.desc())
        .first()
    )
    return float(record.cost_amount) if record else 1000.0


def _get_price(db: Session, sku: str) -> float:
    from app.models.price_history import PriceHistory

    record = (
        db.query(PriceHistory)
        .filter(PriceHistory.sku == sku)
        .order_by(PriceHistory.effective_date.desc())
        .first()
    )
    return float(record.selling_price) if record else 1500.0


def inject_edge_cases(db: Session) -> dict:
    """Create the five required anomaly scenarios with ground-truth labels."""
    from app.models.inventory import InventorySnapshot
    from app.models.promotion import PromotionProduct

    products = db.query(Product).order_by(Product.sku.asc()).limit(5).all()
    if len(products) < 5:
        return {"decisions_created": 0, "exceptions_created": 0}

    created_decisions = 0
    created_exceptions = 0
    labels = []

    def latest_inventory(sku: str):
        return (
            db.query(InventorySnapshot)
            .filter(InventorySnapshot.sku == sku)
            .order_by(InventorySnapshot.snapshot_date.desc())
            .first()
        )

    def new_decision(decision: dict) -> PricingDecision:
        obj = PricingDecision(**decision)
        db.add(obj)
        db.flush()
        return obj

    def new_exception(exc: dict) -> ExceptionRecord:
        obj = ExceptionRecord(**exc)
        db.add(obj)
        db.flush()
        return obj

    # 1. PRICE_BELOW_FLOOR -------------------------------------------------
    p1 = products[0]
    cost1 = _get_cost(db, p1.sku)
    price1 = _get_price(db, p1.sku)
    floor1 = pricing_engine.compute_price_floor(cost1, 20.0)
    below_floor = round(floor1 * 0.8, 2)
    d1 = new_decision(
        {
            "decision_id": "DEC-2026-900001",
            "sku": p1.sku,
            "previous_price": price1,
            "recommended_price": below_floor,
            "applied_discount": 2.0,
            "cost_basis": cost1,
            "expected_margin": round((below_floor - cost1) / below_floor * 100.0, 4),
            "competitor_reference": None,
            "inventory_signal": {"available_stock": 10, "stockout_risk": False},
            "demand_signal": {"demand_level": "LOW"},
            "applicable_rules": {"min_margin_pct": 20.0, "price_floor": floor1},
            "status": "BLOCKED",
            "reason": f"Proposed price {below_floor} is below minimum price floor {floor1}",
            "created_by": "pricing-engine",
        }
    )
    e1 = new_exception(
        {
            "exception_id": "EXC-2026-900001",
            "decision_id": d1.decision_id,
            "issue_type": "PRICE_BELOW_FLOOR",
            "severity": "HIGH",
            "sku": p1.sku,
            "description": "Discount proposal pushed selling price below the minimum permitted price",
            "expected_behavior": "Blocked with a PRICE_BELOW_FLOOR exception",
            "actual_behavior": "Proposed price was rejected and the current price preserved",
            "resolution_status": "OPEN",
        }
    )
    d1.exception_id = e1.exception_id
    created_decisions += 1
    created_exceptions += 1
    labels.append({"sku": p1.sku, "issue_type": "PRICE_BELOW_FLOOR", "expected_status": "BLOCKED", "decision_id": d1.decision_id, "exception_id": e1.exception_id})

    # 2. PROMOTION_STACK_VIOLATION ----------------------------------------
    p2 = products[1]
    cost2 = _get_cost(db, p2.sku)
    price2 = _get_price(db, p2.sku)
    promos = db.query(Promotion).limit(2).all()
    if len(promos) >= 2:
        for promo in promos:
            db.add(PromotionProduct(promotion_id=promo.promotion_id, sku=p2.sku))
        db.flush()
        d2 = new_decision(
            {
                "decision_id": "DEC-2026-900002",
                "sku": p2.sku,
                "previous_price": price2,
                "recommended_price": price2,
                "applied_discount": 0.0,
                "cost_basis": cost2,
                "expected_margin": round((price2 - cost2) / price2 * 100.0, 4),
                "competitor_reference": None,
                "inventory_signal": {"available_stock": 40},
                "demand_signal": {"demand_level": "STABLE"},
                "applicable_rules": {"promotions": [promos[0].promotion_id, promos[1].promotion_id]},
                "status": "BLOCKED",
                "reason": "Two incompatible coupons cannot be stacked for this product",
                "created_by": "promotion-engine",
            }
        )
        e2 = new_exception(
            {
                "exception_id": "EXC-2026-900002",
                "decision_id": d2.decision_id,
                "issue_type": "PROMOTION_STACK_VIOLATION",
                "severity": "HIGH",
                "sku": p2.sku,
                "description": "Two incompatible coupons were applied together",
                "expected_behavior": "Reject the invalid promotion combination",
                "actual_behavior": "Stacking rule violation detected and promotion application blocked",
                "resolution_status": "OPEN",
            }
        )
        d2.exception_id = e2.exception_id
        created_decisions += 1
        created_exceptions += 1
        labels.append({"sku": p2.sku, "issue_type": "PROMOTION_STACK_VIOLATION", "expected_status": "BLOCKED", "decision_id": d2.decision_id, "exception_id": e2.exception_id})

    # 3. STALE_COMPETITOR_OBSERVATION -------------------------------------
    p3 = products[2]
    cost3 = _get_cost(db, p3.sku)
    price3 = _get_price(db, p3.sku)
    stale_at = competitor_service.analysis_datetime() - timedelta(days=45)
    db.add(
        CompetitorObservation(
            observation_id=f"OBS-{p3.sku}-STALE",
            sku=p3.sku,
            competitor="Atlas",
            competitor_sku=f"ATLAS-{p3.sku}",
            observed_price=round(price3 * 0.8, 2),
            observed_at=stale_at,
            source="SCRAPING",
            is_stale=True,
            stale_reason="Observation older than 7 day freshness window",
        )
    )
    db.flush()
    d3 = new_decision(
        {
            "decision_id": "DEC-2026-900003",
            "sku": p3.sku,
            "previous_price": price3,
            "recommended_price": price3,
            "applied_discount": 0.0,
            "cost_basis": cost3,
            "expected_margin": round((price3 - cost3) / price3 * 100.0, 4),
            "competitor_reference": "Atlas",
            "inventory_signal": {"available_stock": 25},
            "demand_signal": {"demand_level": "STABLE"},
            "applicable_rules": {"freshness_window_days": 7, "competitor_signal_used": False},
            "status": "BLOCKED",
            "reason": "Stale competitor observation excluded from pricing decision",
            "created_by": "pricing-engine",
        }
    )
    e3 = new_exception(
        {
            "exception_id": "EXC-2026-900003",
            "decision_id": d3.decision_id,
            "issue_type": "STALE_COMPETITOR_OBSERVATION",
            "severity": "MEDIUM",
            "sku": p3.sku,
            "description": "Competitor observation is older than the freshness window",
            "expected_behavior": "Flag stale data and prevent its use as a trusted current signal",
            "actual_behavior": "Competitor signal excluded; decision blocked pending fresh observation",
            "resolution_status": "ACKNOWLEDGED",
        }
    )
    d3.exception_id = e3.exception_id
    created_decisions += 1
    created_exceptions += 1
    labels.append({"sku": p3.sku, "issue_type": "STALE_COMPETITOR_OBSERVATION", "expected_status": "BLOCKED", "decision_id": d3.decision_id, "exception_id": e3.exception_id})

    # 4. INCORRECT_MARGIN_CALCULATION -------------------------------------
    p4 = products[3]
    cost4 = _get_cost(db, p4.sku)
    price4 = _get_price(db, p4.sku)
    discount = 45.0
    final4 = round(price4 * (1 - discount / 100.0), 2)
    d4 = new_decision(
        {
            "decision_id": "DEC-2026-900004",
            "sku": p4.sku,
            "previous_price": price4,
            "recommended_price": price4,
            "applied_discount": 0.0,
            "cost_basis": cost4,
            "expected_margin": round((price4 - cost4) / price4 * 100.0, 4),
            "competitor_reference": None,
            "inventory_signal": {"available_stock": 60},
            "demand_signal": {"demand_level": "LOW"},
            "applicable_rules": {"min_margin_pct": 20.0, "requested_discount_pct": discount, "final_price": final4},
            "status": "BLOCKED",
            "reason": "Margin calculated before discount would have passed; post-discount margin failed",
            "created_by": "pricing-engine",
        }
    )
    e4 = new_exception(
        {
            "exception_id": "EXC-2026-900004",
            "decision_id": d4.decision_id,
            "issue_type": "INCORRECT_MARGIN_CALCULATION",
            "severity": "HIGH",
            "sku": p4.sku,
            "description": "Margin was calculated before applying the discount",
            "expected_behavior": "Recalculate margin using the final discounted selling price and block the invalid recommendation",
            "actual_behavior": "Final price recalculated; margin below 20% so the decision was blocked",
            "resolution_status": "RESOLVED",
        }
    )
    d4.exception_id = e4.exception_id
    created_decisions += 1
    created_exceptions += 1
    labels.append({"sku": p4.sku, "issue_type": "INCORRECT_MARGIN_CALCULATION", "expected_status": "BLOCKED", "decision_id": d4.decision_id, "exception_id": e4.exception_id})

    # 5. MISSING_PRICE_CHANGE_REASON --------------------------------------
    p5 = products[4]
    cost5 = _get_cost(db, p5.sku)
    price5 = _get_price(db, p5.sku)
    new_price5 = round(price5 * 0.97, 2)
    d5 = new_decision(
        {
            "decision_id": "DEC-2026-900005",
            "sku": p5.sku,
            "previous_price": price5,
            "recommended_price": new_price5,
            "applied_discount": 0.0,
            "cost_basis": cost5,
            "expected_margin": round((new_price5 - cost5) / new_price5 * 100.0, 4),
            "competitor_reference": None,
            "inventory_signal": {"available_stock": 15},
            "demand_signal": {"demand_level": "STABLE"},
            "applicable_rules": {"requires_change_reason": True},
            "status": "FLAGGED",
            "reason": None,
            "created_by": "system",
        }
    )
    e5 = new_exception(
        {
            "exception_id": "EXC-2026-900005",
            "decision_id": d5.decision_id,
            "issue_type": "MISSING_PRICE_CHANGE_REASON",
            "severity": "MEDIUM",
            "sku": p5.sku,
            "description": "Price change was submitted without a documented reason",
            "expected_behavior": "Reject or flag the change and preserve an audit event",
            "actual_behavior": "Change flagged; audit event recorded for review",
            "resolution_status": "OPEN",
        }
    )
    d5.exception_id = e5.exception_id
    db.add(
        AuditLog(
            entity_type="pricing_decision",
            entity_id=d5.decision_id,
            action="PRICE_CHANGE_MISSING_REASON",
            actor="system",
            details={"sku": p5.sku, "previous_price": price5, "new_price": new_price5, "reason": None},
        )
    )
    created_decisions += 1
    created_exceptions += 1
    labels.append({"sku": p5.sku, "issue_type": "MISSING_PRICE_CHANGE_REASON", "expected_status": "FLAGGED", "decision_id": d5.decision_id, "exception_id": e5.exception_id})

    db.commit()
    return {
        "decisions_created": created_decisions,
        "exceptions_created": created_exceptions,
        "ground_truth": labels,
    }
