"""Product management API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import MANAGER_ROLES, get_current_user, get_db, require_roles
from app.core import security
from app.models.product import Product
from app.models.user import User
from app.schemas.product import (
    ProductCreate,
    ProductFacets,
    ProductListResponse,
    ProductOverviewResponse,
    ProductResponse,
    ProductUpdate,
)
from app.services import (
    competitor_service,
    cost_service,
    decision_service,
    inventory_service,
    pricing_engine,
    product_service,
    promotion_service,
)

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=ProductListResponse)
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = Query(None, max_length=128),
    category: str | None = None,
    brand: str | None = None,
    lifecycle_state: str | None = Query(None, pattern="^(ACTIVE|RETIRED|PLANNED)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProductListResponse:
    items, total = product_service.list_products(
        db,
        skip=skip,
        limit=limit,
        search=search,
        category=category,
        brand=brand,
        lifecycle_state=lifecycle_state,
    )
    return ProductListResponse(
        items=[_to_response(p) for p in items], total=total, skip=skip, limit=limit
    )


@router.get("/facets", response_model=ProductFacets)
def product_facets(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ProductFacets:
    return ProductFacets(**product_service.list_facets(db))


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES)),
) -> ProductResponse:
    product = product_service.create_product(db, payload)
    security.write_audit(
        db,
        entity_type="product",
        entity_id=payload.sku,
        action="PRODUCT_CREATED",
        actor=user.email,
        details={"name": payload.name, "category": payload.category},
    )
    db.commit()
    db.refresh(product)
    return _to_response(product)


@router.get("/{sku}", response_model=ProductResponse)
def get_product(
    sku: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ProductResponse:
    return _to_response(product_service.get_product(db, sku))


@router.get("/{sku}/overview", response_model=ProductOverviewResponse)
def product_overview(
    sku: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ProductOverviewResponse:
    from app.models.price_history import PriceHistory, PricingDecision
    from app.models.promotion import Promotion, PromotionProduct

    product = product_service.get_product(db, sku)
    cost = cost_service.latest_cost_for_sku(db, sku)
    price_row = (
        db.query(PriceHistory)
        .filter(PriceHistory.sku == sku)
        .order_by(PriceHistory.effective_date.desc(), PriceHistory.created_at.desc())
        .first()
    )
    current_price = float(price_row.selling_price) if price_row else None
    floor = pricing_engine.compute_price_floor(cost, 20.0) if cost else None
    ceiling = pricing_engine.compute_price_ceiling(cost, 60.0) if cost else None
    margin = (
        pricing_engine.compute_actual_margin(cost, current_price)
        if cost and current_price
        else None
    )

    latest_inv = inventory_service.latest_snapshot_map(db).get(sku)
    observation = competitor_service.get_latest_observation(db, sku)
    competitor_payload = None
    if observation:
        competitor_payload = {
            "competitor": observation.competitor,
            "observed_price": float(observation.observed_price),
            "observed_at": observation.observed_at,
            "is_stale": bool(observation.is_stale)
            or competitor_service.is_observation_stale(observation.observed_at),
            "stale_reason": observation.stale_reason,
        }

    promo_rows = (
        db.query(Promotion)
        .join(PromotionProduct, PromotionProduct.promotion_id == Promotion.promotion_id)
        .filter(PromotionProduct.sku == sku)
        .order_by(Promotion.start_date.desc())
        .limit(5)
        .all()
    )

    history = (
        db.query(PriceHistory)
        .filter(PriceHistory.sku == sku)
        .order_by(PriceHistory.effective_date.desc())
        .limit(10)
        .all()
    )
    decisions = (
        db.query(PricingDecision)
        .filter(PricingDecision.sku == sku)
        .order_by(PricingDecision.created_at.desc())
        .limit(10)
        .all()
    )

    return ProductOverviewResponse(
        product=_to_response(product),
        current_cost=cost,
        current_price=current_price,
        price_floor=floor,
        price_ceiling=ceiling,
        margin_pct=round(margin, 4) if margin is not None else None,
        inventory=latest_inv,
        latest_competitor=competitor_payload,
        active_promotions=[
            {
                "promotion_id": promo.promotion_id,
                "name": promo.name,
                "code": promo.code,
                "status": promo.status,
                "discount_type": promo.discount_type,
                "discount_value": float(promo.discount_value),
                "start_date": promo.start_date,
                "end_date": promo.end_date,
            }
            for promo in promo_rows
        ],
        recent_price_history=[
            {
                "price_id": row.price_id,
                "effective_date": row.effective_date,
                "selling_price": float(row.selling_price),
                "source": row.source,
                "change_reason": row.change_reason,
            }
            for row in history
        ],
        recent_decisions=[
            {
                "decision_id": row.decision_id,
                "status": row.status,
                "recommended_price": float(row.recommended_price),
                "expected_margin": float(row.expected_margin),
                "created_at": row.created_at,
            }
            for row in decisions
        ],
    )


@router.patch("/{sku}", response_model=ProductResponse)
def update_product(
    sku: str,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES)),
) -> ProductResponse:
    product = product_service.update_product(db, sku, payload)
    security.write_audit(
        db,
        entity_type="product",
        entity_id=sku,
        action="PRODUCT_UPDATED",
        actor=user.email,
        details=payload.model_dump(exclude_unset=True),
    )
    db.commit()
    db.refresh(product)
    return _to_response(product)


def _to_response(p: Product) -> ProductResponse:
    return ProductResponse(
        sku=p.sku,
        name=p.name,
        category=p.category,
        brand=p.brand,
        lifecycle_state=p.lifecycle_state,
        description=p.description,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )
