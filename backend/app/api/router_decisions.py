"""Pricing decision history API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.deps import get_current_user, get_db
from app.models.price_history import PricingDecision
from app.models.user import User
from app.schemas.pricing import DecisionListResponse, PricingDecisionResponse
from app.services import decision_service

router = APIRouter(prefix="/decisions", tags=["Pricing Decisions"])


@router.get("", response_model=DecisionListResponse)
def list_decisions(
    sku: str | None = None,
    status_filter: str | None = Query(
        None, alias="status", pattern="^(APPROVED|BLOCKED|PENDING|FLAGGED)$"
    ),
    search: str | None = Query(None, max_length=128),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DecisionListResponse:
    items, total = decision_service.list_decisions(
        db, skip=skip, limit=limit, sku=sku, status=status_filter, search=search
    )
    return DecisionListResponse(
        items=[_to_response(d) for d in items],
        total=total,
        skip=skip,
        limit=limit,
        counts=decision_service.status_counts(db),
    )


@router.get("/summary", response_model=dict)
def decisions_summary(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    return decision_service.status_counts(db)


@router.get("/{decision_id}", response_model=PricingDecisionResponse)
def get_decision(
    decision_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> PricingDecisionResponse:
    return _to_response(decision_service.get_decision(db, decision_id))


def _to_response(d: PricingDecision) -> PricingDecisionResponse:
    return PricingDecisionResponse(
        decision_id=d.decision_id,
        sku=d.sku,
        previous_price=float(d.previous_price),
        recommended_price=float(d.recommended_price),
        applied_discount=float(d.applied_discount),
        cost_basis=float(d.cost_basis),
        expected_margin=float(d.expected_margin),
        competitor_reference=d.competitor_reference,
        inventory_signal=d.inventory_signal or {},
        demand_signal=d.demand_signal or {},
        applicable_rules=d.applicable_rules or {},
        status=d.status,
        reason=d.reason,
        exception_id=d.exception_id,
        created_by=d.created_by,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )