"""Promotion model."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime as SADateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, utcnow


class Promotion(Base):
    """Promotion with eligibility and constraint rules."""

    __tablename__ = "promotions"

    promotion_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    discount_type: Mapped[str] = mapped_column(String(32), nullable=False, default="PERCENTAGE")
    discount_value: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    min_purchase_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    applicable_categories: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    applicable_brands: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    coupon_exclusions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    stacking_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    max_discount_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=90.0)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="SCHEDULED")

    created_at: Mapped[datetime] = mapped_column(SADateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        SADateTime, default=utcnow, onupdate=utcnow, nullable=False
    )

    __table_args__ = (
        CheckConstraint("discount_value > 0", name="ck_promotions_positive_discount"),
        CheckConstraint("end_date >= start_date", name="ck_promotions_valid_window"),
        CheckConstraint(
            "status IN ('ACTIVE', 'INACTIVE', 'SCHEDULED', 'EXPIRED')",
            name="ck_promotions_status",
        ),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Promotion {self.promotion_id}>"


class PromotionProduct(Base):
    """Promotion to product applicability mapping."""

    __tablename__ = "promotion_products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    promotion_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("promotions.promotion_id", ondelete="CASCADE"), nullable=False
    )
    sku: Mapped[str] = mapped_column(
        String(32), ForeignKey("products.sku", ondelete="CASCADE"), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("promotion_id", "sku", name="uq_promotion_product"),
    )
