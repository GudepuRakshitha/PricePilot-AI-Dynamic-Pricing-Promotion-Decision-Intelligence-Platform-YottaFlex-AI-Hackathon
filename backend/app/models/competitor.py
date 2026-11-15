"""Competitor observation model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, utcnow


class CompetitorObservation(Base):
    """Competitor price observation with source timestamp."""

    __tablename__ = "competitor_observations"

    observation_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    sku: Mapped[str] = mapped_column(
        String(32), ForeignKey("products.sku", ondelete="CASCADE"), nullable=False
    )
    competitor: Mapped[str] = mapped_column(String(128), nullable=False)
    competitor_sku: Mapped[str | None] = mapped_column(String(64), nullable=True)
    observed_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="SCRAPING")
    is_stale: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    stale_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    __table_args__ = (
        CheckConstraint("observed_price > 0", name="ck_competitor_positive_price"),
        Index("ix_competitor_sku_observed", "sku", "observed_at"),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<CompetitorObservation {self.observation_id}>"
