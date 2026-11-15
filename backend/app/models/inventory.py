"""Inventory snapshot model."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, utcnow


class InventorySnapshot(Base):
    """Daily inventory snapshot per SKU."""

    __tablename__ = "inventory_snapshots"

    snapshot_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    sku: Mapped[str] = mapped_column(
        String(32), ForeignKey("products.sku", ondelete="CASCADE"), nullable=False
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    quantity_available: Mapped[int] = mapped_column(Integer, nullable=False)
    reserved_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reorder_point: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stockout_risk: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("sku", "snapshot_date", name="uq_inventory_sku_date"),
        CheckConstraint("quantity_available >= 0", name="ck_inventory_non_negative_qty"),
        CheckConstraint("reserved_quantity >= 0", name="ck_inventory_non_negative_reserved"),
        Index("ix_inventory_sku_snapshot", "sku", "snapshot_date"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<InventorySnapshot {self.snapshot_id}>"
