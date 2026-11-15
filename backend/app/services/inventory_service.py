"""Inventory service."""

from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models.inventory import InventorySnapshot
from app.schemas.inventory import InventoryCreate


def latest_snapshot_map(db: Session) -> dict[str, dict]:
    """Latest inventory snapshot per SKU across the whole dataset."""
    latest_dates = (
        db.query(
            InventorySnapshot.sku.label("sku"),
            func.max(InventorySnapshot.snapshot_date).label("snapshot_date"),
        )
        .group_by(InventorySnapshot.sku)
        .subquery()
    )
    rows = (
        db.query(InventorySnapshot)
        .join(
            latest_dates,
            (InventorySnapshot.sku == latest_dates.c.sku)
            & (InventorySnapshot.snapshot_date == latest_dates.c.snapshot_date),
        )
        .all()
    )
    return {
        row.sku: {
            "snapshot_id": row.snapshot_id,
            "snapshot_date": row.snapshot_date,
            "quantity_available": row.quantity_available,
            "reserved_quantity": row.reserved_quantity,
            "reorder_point": row.reorder_point,
            "stockout_risk": row.stockout_risk,
        }
        for row in rows
    }


def list_snapshots(
    db: Session,
    sku: str | None = None,
    skip: int = 0,
    limit: int = 100,
    *,
    search: str | None = None,
    stockout_only: bool = False,
) -> tuple[list[InventorySnapshot], int, dict[str, dict]]:
    query = db.query(InventorySnapshot)
    if sku:
        query = query.filter(InventorySnapshot.sku == sku)
    if search:
        query = query.filter(InventorySnapshot.sku.ilike(f"%{search.strip()}%"))
    if stockout_only:
        query = query.filter(InventorySnapshot.stockout_risk.is_(True))
    total = query.count()
    items = (
        query.order_by(InventorySnapshot.sku.asc(), InventorySnapshot.snapshot_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return items, total, latest_snapshot_map(db)


def get_snapshot(db: Session, snapshot_id: str) -> InventorySnapshot:
    snapshot = db.query(InventorySnapshot).filter_by(snapshot_id=snapshot_id).first()
    if not snapshot:
        raise NotFoundError(f"Inventory snapshot {snapshot_id} not found")
    return snapshot


def create_snapshot(db: Session, payload: InventoryCreate) -> InventorySnapshot:
    from app.models.product import Product

    if not db.query(Product).filter_by(sku=payload.sku).first():
        raise NotFoundError(f"Product {payload.sku} not found")
    existing = (
        db.query(InventorySnapshot)
        .filter_by(sku=payload.sku, snapshot_date=payload.snapshot_date)
        .first()
    )
    if existing:
        raise ConflictError(
            f"An inventory snapshot already exists for {payload.sku} on {payload.snapshot_date}"
        )
    snapshot = InventorySnapshot(
        snapshot_id=f"INV-{payload.sku}-{payload.snapshot_date.strftime('%Y%m%d')}",
        sku=payload.sku,
        snapshot_date=payload.snapshot_date,
        quantity_available=payload.quantity_available,
        reserved_quantity=payload.reserved_quantity,
        reorder_point=payload.reorder_point,
        stockout_risk=payload.quantity_available <= payload.reorder_point,
    )
    db.add(snapshot)
    db.flush()
    return snapshot
