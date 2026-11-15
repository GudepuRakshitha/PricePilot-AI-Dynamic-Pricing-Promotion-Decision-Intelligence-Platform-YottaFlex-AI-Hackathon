"""Pricing decision persistence and traceability service."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models.audit_order import AuditLog
from app.models.price_history import PriceHistory, PricingDecision
from app.models.product import Product


def _next_sequence(db: Session, column) -> int:
    """Next deterministic numeric suffix, ignoring injected high-range demo IDs."""
    sequences: list[int] = []
    for (value,) in db.query(column).all():
        try:
            suffix = int(str(value).rsplit("-", 1)[-1])
        except (ValueError, IndexError):
            continue
        if suffix < 900000:
            sequences.append(suffix)
    return (max(sequences) + 1) if sequences else 1


def _next_decision_id(db: Session) -> str:
    return f"DEC-2026-{_next_sequence(db, PricingDecision.decision_id):06d}"


def _latest_price(db: Session, sku: str) -> PriceHistory | None:
    return (
        db.query(PriceHistory)
        .filter(PriceHistory.sku == sku)
        .order_by(PriceHistory.effective_date.desc(), PriceHistory.created_at.desc())
        .first()
    )


def create_decision(
    db: Session,
    *,
    sku: str,
    recommended_price: float,
    applied_discount: float,
    expected_margin: float,
    cost_basis: float,
    status: str,
    reason: str | None,
    created_by: str | None,
    demand_signal: dict | None = None,
    inventory_signal: dict | None = None,
    competitor_signal: dict | None = None,
    applicable_rules: dict | None = None,
    exception_issue: str | None = None,
    effective_date: date | None = None,
) -> PricingDecision:
    """Persist a pricing decision with its price history, audit and exception links."""
    if not db.query(Product).filter_by(sku=sku).first():
        raise NotFoundError(f"Product {sku} not found")

    previous = _latest_price(db, sku)
    previous_price = float(previous.selling_price) if previous else float(recommended_price)

    decision = PricingDecision(
        decision_id=_next_decision_id(db),
        sku=sku,
        previous_price=previous_price,
        recommended_price=recommended_price,
        applied_discount=applied_discount,
        cost_basis=cost_basis,
        expected_margin=expected_margin,
        competitor_reference=(competitor_signal or {}).get("competitor_price"),
        inventory_signal=inventory_signal or {},
        demand_signal=demand_signal or {},
        applicable_rules=applicable_rules or {},
        status=status,
        reason=reason,
        created_by=created_by,
    )
    db.add(decision)
    db.flush()

    # Only approved decisions change the effective selling price. Blocked or
    # pending decisions remain proposals and must not overwrite market prices.
    if status == "APPROVED":
        effective = effective_date or date.today()
        price_id = f"PRC-{sku}-{decision.decision_id.rsplit('-', 1)[-1]}"
        db.add(
            PriceHistory(
                price_id=price_id,
                sku=sku,
                effective_date=effective,
                selling_price=recommended_price,
                source="DECISION",
                change_reason=reason,
                decision_id=decision.decision_id,
            )
        )

    db.add(
        AuditLog(
            entity_type="pricing_decision",
            entity_id=decision.decision_id,
            action="PRICING_DECISION_CREATED",
            actor=created_by or "system",
            details={
                "sku": sku,
                "recommended_price": recommended_price,
                "status": status,
                "exception_issue": exception_issue,
            },
        )
    )
    db.flush()
    return decision


def get_decision(db: Session, decision_id: str) -> PricingDecision:
    decision = db.query(PricingDecision).filter_by(decision_id=decision_id).first()
    if not decision:
        raise NotFoundError(f"Pricing decision {decision_id} not found")
    return decision


def list_decisions(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    *,
    sku: str | None = None,
    status: str | None = None,
    search: str | None = None,
    created_by: str | None = None,
) -> tuple[list[PricingDecision], int]:
    query = db.query(PricingDecision)
    if sku:
        query = query.filter(PricingDecision.sku == sku)
    if status:
        query = query.filter(PricingDecision.status == status)
    if created_by:
        query = query.filter(PricingDecision.created_by == created_by)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                PricingDecision.decision_id.ilike(term),
                PricingDecision.sku.ilike(term),
                PricingDecision.reason.ilike(term),
            )
        )
    query = query.order_by(PricingDecision.created_at.desc(), PricingDecision.decision_id.desc())
    total = query.count()
    return query.offset(skip).limit(limit).all(), total


def latest_decision_for_sku(db: Session, sku: str) -> PricingDecision | None:
    return (
        db.query(PricingDecision)
        .filter(PricingDecision.sku == sku, PricingDecision.status == "APPROVED")
        .order_by(PricingDecision.created_at.desc())
        .first()
    )


def status_counts(db: Session) -> dict[str, int]:
    counts = {"APPROVED": 0, "BLOCKED": 0, "PENDING": 0, "FLAGGED": 0}
    rows = (
        db.query(PricingDecision.status, func.count(PricingDecision.decision_id))
        .group_by(PricingDecision.status)
        .all()
    )
    for status_value, count in rows:
        counts[status_value] = int(count)
    counts["total"] = sum(counts.values())
    return counts
