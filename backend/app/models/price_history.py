"""Price history and pricing decision models."""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, utcnow


class PriceHistory(Base):
    """Immutable historical selling price records."""

    __tablename__ = "price_history"

    price_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    sku: Mapped[str] = mapped_column(
        String(32), ForeignKey("products.sku", ondelete="CASCADE"), nullable=False
    )
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    selling_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="BASELINE")
    change_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    decision_id: Mapped[Optional[str]] = mapped_column(
        String(64), ForeignKey("pricing_decisions.decision_id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    __table_args__ = (
        CheckConstraint("selling_price > 0", name="ck_price_history_positive_price"),
        Index("ix_price_history_sku_effective", "sku", "effective_date"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<PriceHistory {self.price_id}>"


class PricingDecision(Base):
    """An auditable pricing decision with full explainability context."""

    __tablename__ = "pricing_decisions"

    decision_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    sku: Mapped[str] = mapped_column(
        String(32), ForeignKey("products.sku", ondelete="CASCADE"), nullable=False
    )
    previous_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    recommended_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    applied_discount: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0.0)
    cost_basis: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    expected_margin: Mapped[float] = mapped_column(Numeric(8, 4), nullable=False)
    competitor_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    inventory_signal: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    demand_signal: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    applicable_rules: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    reason: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    exception_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    __table_args__ = (
        CheckConstraint("recommended_price > 0", name="ck_decisions_positive_price"),
        CheckConstraint("cost_basis >= 0", name="ck_decisions_non_negative_cost"),
        CheckConstraint(
            "applied_discount >= 0 AND applied_discount <= 100",
            name="ck_decisions_discount_range",
        ),
        Index("ix_pricing_decisions_sku_created", "sku", "created_at"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<PricingDecision {self.decision_id}>"
