"""Analytics and reporting API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.analytics import AnalyticsSummaryResponse
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics and Reporting"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_summary(
    period: str = Query("30d", pattern="^(7d|30d|90d|180d)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AnalyticsSummaryResponse:
    summary = analytics_service.compute_analytics_summary(db, period=period)
    return AnalyticsSummaryResponse(**summary)  # type: ignore[arg-type]


@router.get("/categories", response_model=list[dict])
def category_performance(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[dict]:
    return analytics_service.category_performance(db)


@router.get("/top-products", response_model=list[dict])
def top_products(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    return analytics_service.top_products(db, limit=limit)


@router.get("/inventory-risk", response_model=dict)
def inventory_risk(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    return analytics_service.inventory_risk(db)


@router.get("/validation", response_model=dict)
def validation_report(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    return analytics_service.validation_report(db)


@router.get("/orders", response_model=list[dict])
def order_samples(
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    return analytics_service.order_samples(db, limit=limit)
