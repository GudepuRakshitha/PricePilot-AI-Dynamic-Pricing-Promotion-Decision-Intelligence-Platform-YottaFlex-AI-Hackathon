"""Cost history service."""

from __future__ import annotations

from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models.cost_history import CostHistory
from app.schemas.cost import CostCreate


def _latest_cost_subquery(db: Session):
    """Latest effective cost row per SKU."""
    latest_dates = (
        db.query(
            CostHistory.sku.label("sku"),
            func.max(CostHistory.effective_date).label("effective_date"),
        )
        .group_by(CostHistory.sku)
        .subquery()
    )
    return latest_dates


def current_cost_map(db: Session) -> dict[str, float]:
    latest_dates = _latest_cost_subquery(db)
    rows = (
        db.query(CostHistory)
        .join(
            latest_dates,
            (CostHistory.sku == latest_dates.c.sku)
            & (CostHistory.effective_date == latest_dates.c.effective_date),
        )
        .all()
    )
    return {row.sku: float(row.cost_amount) for row in rows}


def list_costs(
    db: Session,
    sku: str | None = None,
    skip: int = 0,
    limit: int = 100,
    *,
    search: str | None = None,
    source: str | None = None,
) -> tuple[list[CostHistory], int, dict[str, float]]:
    query = db.query(CostHistory)
    if sku:
        query = query.filter(CostHistory.sku == sku)
    if search:
        query = query.filter(CostHistory.sku.ilike(f"%{search.strip()}%"))
    if source:
        query = query.filter(CostHistory.source == source)
    total = query.count()
    items = (
        query.order_by(CostHistory.sku.asc(), CostHistory.effective_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return items, total, current_cost_map(db)


def get_cost(db: Session, cost_id: str) -> CostHistory:
    cost = db.query(CostHistory).filter_by(cost_id=cost_id).first()
    if not cost:
        raise NotFoundError(f"Cost record {cost_id} not found")
    return cost


def create_cost(db: Session, payload: CostCreate) -> CostHistory:
    from app.models.product import Product

    if not db.query(Product).filter_by(sku=payload.sku).first():
        raise NotFoundError(f"Product {payload.sku} not found")
    existing = (
        db.query(CostHistory)
        .filter_by(sku=payload.sku, effective_date=payload.effective_date)
        .first()
    )
    if existing:
        raise ConflictError(
            f"A cost record already exists for {payload.sku} on {payload.effective_date}"
        )
    cost = CostHistory(
        cost_id=f"COST-{payload.sku}-{payload.effective_date.strftime('%Y%m')}",
        sku=payload.sku,
        effective_date=payload.effective_date,
        cost_amount=payload.cost_amount,
        source=payload.source,
        change_reason=payload.change_reason,
    )
    db.add(cost)
    db.flush()
    return cost


def latest_cost_for_sku(db: Session, sku: str, as_of: date | None = None) -> float | None:
    query = db.query(CostHistory).filter(CostHistory.sku == sku)
    if as_of:
        query = query.filter(CostHistory.effective_date <= as_of)
    record = query.order_by(CostHistory.effective_date.desc()).first()
    return float(record.cost_amount) if record else None
