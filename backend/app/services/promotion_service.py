"""Promotion management service."""

from __future__ import annotations

from datetime import date

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models.product import Product
from app.models.promotion import Promotion, PromotionProduct
from app.schemas.promotion import PromotionCreate, PromotionUpdate


def _next_promotion_id(db: Session) -> str:
    sequences = []
    for (promotion_id,) in db.query(Promotion.promotion_id).all():
        try:
            sequences.append(int(promotion_id.rsplit("-", 1)[-1]))
        except ValueError:
            continue
    return f"PROMO-2026-{(max(sequences) + 1) if sequences else 1:06d}"


def create_promotion(db: Session, payload: PromotionCreate) -> Promotion:
    if payload.end_date < payload.start_date:
        raise ValueError("Promotion end date must be on or after start date")
    if db.query(Promotion).filter_by(code=payload.code).first():
        raise ConflictError("Promotion code must be unique")

    promo = Promotion(
        promotion_id=_next_promotion_id(db),
        name=payload.name,
        code=payload.code,
        discount_type=payload.discount_type,
        discount_value=payload.discount_value,
        min_purchase_value=payload.min_purchase_value,
        applicable_categories=list(payload.applicable_categories or []),
        applicable_brands=list(payload.applicable_brands or []),
        coupon_exclusions=list(payload.coupon_exclusions or []),
        stacking_allowed=payload.stacking_allowed,
        max_discount_percent=payload.max_discount_percent,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=payload.status,
    )
    db.add(promo)
    db.flush()
    return promo


def update_promotion(db: Session, promotion_id: str, payload: PromotionUpdate) -> Promotion:
    promo = get_promotion(db, promotion_id)
    data = payload.model_dump(exclude_unset=True)
    new_start = data.get("start_date", promo.start_date)
    new_end = data.get("end_date", promo.end_date)
    if new_end < new_start:
        raise ValueError("Promotion end date must be on or after start date")
    for field, value in data.items():
        setattr(promo, field, value)
    db.add(promo)
    db.flush()
    return promo


def list_promotions(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    *,
    status: str | None = None,
    search: str | None = None,
) -> tuple[list[Promotion], int]:
    query = db.query(Promotion)
    if status:
        query = query.filter(Promotion.status == status)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(Promotion.name.ilike(term), Promotion.code.ilike(term)))
    query = query.order_by(Promotion.start_date.desc(), Promotion.promotion_id.desc())
    total = query.count()
    return query.offset(skip).limit(limit).all(), total


def get_promotion(db: Session, promotion_id: str) -> Promotion:
    promo = db.query(Promotion).filter_by(promotion_id=promotion_id).first()
    if not promo:
        raise NotFoundError(f"Promotion {promotion_id} not found")
    return promo


def set_promotion_status(db: Session, promotion_id: str, status: str) -> Promotion:
    if status not in {"ACTIVE", "INACTIVE", "SCHEDULED", "EXPIRED"}:
        raise ValueError(f"Unsupported promotion status: {status}")
    promo = get_promotion(db, promotion_id)
    promo.status = status
    db.add(promo)
    db.flush()
    return promo


def list_skus_for_promotion(db: Session, promotion_id: str) -> list[str]:
    return [
        row[0]
        for row in db.query(PromotionProduct.sku)
        .filter(PromotionProduct.promotion_id == promotion_id)
        .order_by(PromotionProduct.sku)
        .all()
    ]


def assign_promotion_to_skus(db: Session, promotion_id: str, skus: list[str]) -> None:
    promo = get_promotion(db, promotion_id)
    existing = {
        row[0]
        for row in db.query(PromotionProduct.sku)
        .filter(PromotionProduct.promotion_id == promo.promotion_id)
        .all()
    }
    for sku in skus:
        if sku in existing:
            continue
        db.add(PromotionProduct(promotion_id=promo.promotion_id, sku=sku))
    db.flush()


def assign_promotion_by_rules(db: Session, promo: Promotion, limit: int = 50) -> int:
    """Attach products that match the promotion's category/brand rules."""
    if not promo.applicable_categories and not promo.applicable_brands:
        return 0
    query = db.query(Product.sku)
    if promo.applicable_categories:
        query = query.filter(Product.category.in_(promo.applicable_categories))
    if promo.applicable_brands:
        query = query.filter(Product.brand.in_(promo.applicable_brands))
    skus = [row[0] for row in query.order_by(Product.sku).limit(limit).all()]
    assign_promotion_to_skus(db, promo.promotion_id, skus)
    return len(skus)


def promotion_counts_by_status(db: Session) -> dict[str, int]:
    counts = {"ACTIVE": 0, "SCHEDULED": 0, "EXPIRED": 0, "INACTIVE": 0}
    rows = (
        db.query(Promotion.status, func.count(Promotion.promotion_id))
        .group_by(Promotion.status)
        .all()
    )
    for status_value, count in rows:
        counts[status_value] = int(count)
    counts["total"] = sum(counts.values())
    return counts
