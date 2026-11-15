"""Price history API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.price_history import PriceHistory
from app.models.user import User
from app.schemas.pricing import PriceHistoryResponse
from app.services import decision_service

router = APIRouter(prefix="/prices", tags=["Price History"])


@router.get("", response_model=list[PriceHistoryResponse])
def list_price_history(
    sku: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PriceHistoryResponse]:
    query = db.query(PriceHistory)
    if sku:
        query = query.filter(PriceHistory.sku == sku)
    rows = (
        query.order_by(PriceHistory.sku.asc(), PriceHistory.effective_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        PriceHistoryResponse(
            price_id=r.price_id,
            sku=r.sku,
            effective_date=r.effective_date,
            selling_price=float(r.selling_price),
            source=r.source,
            change_reason=r.change_reason,
            decision_id=r.decision_id,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/{sku}/latest", response_model=PriceHistoryResponse | None)
def latest_price(
    sku: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    row = (
        db.query(PriceHistory)
        .filter(PriceHistory.sku == sku)
        .order_by(PriceHistory.effective_date.desc())
        .first()
    )
    if not row:
        return None
    return PriceHistoryResponse(
        price_id=row.price_id,
        sku=row.sku,
        effective_date=row.effective_date,
        selling_price=float(row.selling_price),
        source=row.source,
        change_reason=row.change_reason,
        decision_id=row.decision_id,
        created_at=row.created_at,
    )
