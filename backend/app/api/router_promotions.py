"""Promotion management API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import MANAGER_ROLES, get_current_user, get_db, require_roles
from app.core import security
from app.models.promotion import Promotion
from app.models.user import User
from app.schemas.promotion import (
    PromotionCreate,
    PromotionEligibilityRequest,
    PromotionEligibilityResponse,
    PromotionListResponse,
    PromotionResponse,
    PromotionUpdate,
)
from app.services import promotion_eligibility_service, promotion_service

router = APIRouter(prefix="/promotions", tags=["Promotion Management"])


@router.get("", response_model=PromotionListResponse)
def list_promotions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: str | None = Query(
        None, alias="status", pattern="^(ACTIVE|INACTIVE|SCHEDULED|EXPIRED)$"
    ),
    search: str | None = Query(None, max_length=128),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PromotionListResponse:
    items, total = promotion_service.list_promotions(
        db, skip=skip, limit=limit, status=status_filter, search=search
    )
    return PromotionListResponse(
        items=[_to_response(p) for p in items],
        total=total,
        skip=skip,
        limit=limit,
        counts=promotion_service.promotion_counts_by_status(db),
    )


@router.post("", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
def create_promotion(
    payload: PromotionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES)),
) -> PromotionResponse:
    promo = promotion_service.create_promotion(db, payload)
    assigned = promotion_service.assign_promotion_by_rules(db, promo)
    security.write_audit(
        db,
        entity_type="promotion",
        entity_id=promo.promotion_id,
        action="PROMOTION_CREATED",
        actor=user.email,
        details={"code": promo.code, "discount_value": float(promo.discount_value), "skus_assigned": assigned},
    )
    db.commit()
    db.refresh(promo)
    return _to_response(promo)


@router.get("/{promotion_id}", response_model=PromotionResponse)
def get_promotion(
    promotion_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> PromotionResponse:
    return _to_response(promotion_service.get_promotion(db, promotion_id))


@router.get("/{promotion_id}/products", response_model=list[str])
def promotion_products(
    promotion_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[str]:
    promotion_service.get_promotion(db, promotion_id)
    return promotion_service.list_skus_for_promotion(db, promotion_id)


@router.patch("/{promotion_id}", response_model=PromotionResponse)
def update_promotion(
    promotion_id: str,
    payload: PromotionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES)),
) -> PromotionResponse:
    promo = promotion_service.update_promotion(db, promotion_id, payload)
    security.write_audit(
        db,
        entity_type="promotion",
        entity_id=promotion_id,
        action="PROMOTION_UPDATED",
        actor=user.email,
        details=payload.model_dump(exclude_unset=True, mode="json"),
    )
    db.commit()
    db.refresh(promo)
    return _to_response(promo)


@router.post("/{promotion_id}/status", response_model=PromotionResponse)
def set_status(
    promotion_id: str,
    status_value: str = Query(..., alias="status"),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES)),
) -> PromotionResponse:
    promo = promotion_service.set_promotion_status(db, promotion_id, status_value)
    security.write_audit(
        db,
        entity_type="promotion",
        entity_id=promotion_id,
        action="PROMOTION_STATUS_CHANGED",
        actor=user.email,
        details={"status": status_value},
    )
    db.commit()
    db.refresh(promo)
    return _to_response(promo)


@router.post("/eligibility", response_model=PromotionEligibilityResponse)
def check_eligibility(
    payload: PromotionEligibilityRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PromotionEligibilityResponse:
    promo = promotion_service.get_promotion(db, payload.promotion_id)
    from app.models.product import Product

    product = db.query(Product).filter_by(sku=payload.sku).first()
    result = promotion_eligibility_service.check_promotion_eligibility(
        db,
        sku=payload.sku,
        promotion=promo,
        product=product,
        quantity=payload.quantity,
        customer_total_value=payload.customer_total_value,
    )
    return PromotionEligibilityResponse(**result)


def _to_response(p: Promotion) -> PromotionResponse:
    return PromotionResponse(
        promotion_id=p.promotion_id,
        name=p.name,
        code=p.code,
        discount_type=p.discount_type,
        discount_value=float(p.discount_value),
        min_purchase_value=float(p.min_purchase_value),
        applicable_categories=list(p.applicable_categories or []),
        applicable_brands=list(p.applicable_brands or []),
        coupon_exclusions=list(p.coupon_exclusions or []),
        stacking_allowed=p.stacking_allowed,
        max_discount_percent=float(p.max_discount_percent),
        start_date=p.start_date,
        end_date=p.end_date,
        status=p.status,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )
