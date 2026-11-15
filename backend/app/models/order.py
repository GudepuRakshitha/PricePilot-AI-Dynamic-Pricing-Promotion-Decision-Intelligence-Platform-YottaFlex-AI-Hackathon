"""Customer order model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, utcnow


class CustomerOrder(Base):
    """Customer orders used for revenue, gross profit and margin analytics."""

    __tablename__ = "customer_orders"

    order_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    sku: Mapped[str] = mapped_column(
        String(32), ForeignKey("products.sku", ondelete="CASCADE"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    discount_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    revenue: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    order_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_orders_positive_quantity"),
        CheckConstraint("unit_price >= 0 AND revenue >= 0", name="ck_orders_non_negative_amounts"),
        Index("ix_orders_sku_order_date", "sku", "order_date"),
    )
