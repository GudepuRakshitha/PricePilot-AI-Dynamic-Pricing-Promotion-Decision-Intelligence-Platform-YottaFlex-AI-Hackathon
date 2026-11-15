"""Historical cost records with effective dating."""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, utcnow


class CostHistory(Base):
    """Historical cost records with effective dating."""

    __tablename__ = "cost_history"

    cost_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    sku: Mapped[str] = mapped_column(
        String(32), ForeignKey("products.sku", ondelete="CASCADE"), nullable=False
    )
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    cost_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="BASELINE")
    change_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("sku", "effective_date", name="uq_cost_sku_effective_date"),
        CheckConstraint("cost_amount >= 0", name="ck_cost_history_non_negative"),
        Index("ix_cost_history_sku_effective", "sku", "effective_date"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<CostHistory {self.cost_id}>"
