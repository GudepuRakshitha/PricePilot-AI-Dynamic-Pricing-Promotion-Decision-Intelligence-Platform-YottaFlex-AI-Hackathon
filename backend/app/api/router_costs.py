"""Cost history API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import MANAGER_ROLES, get_current_user, get_db, require_roles
from app.core import security
from app.models.cost_history import CostHistory
from app.models.user import User
from app.schemas.cost import CostCreate, CostListResponse, CostResponse
from app.services import cost_service

router = APIRouter(prefix="/costs", tags=["Cost Management"])


@router.get("", response_model=CostListResponse)
def list_costs(
    sku: str | None = None,
    search: str | None = Query(None, max_length=128),
    source: str | None = Query(None, pattern="^(BASELINE|MANUAL|MARKUP_CHANGE)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CostListResponse:
    items, total, current_by_sku = cost_service.list_costs(
        db, sku=sku, skip=skip, limit=limit, search=search, source=source
    )
    return CostListResponse(
        items=[_to_response(c) for c in items],
        total=total,
        current_cost_by_sku=current_by_sku,
    )


@router.post("", response_model=CostResponse, status_code=status.HTTP_201_CREATED)
def create_cost(
    payload: CostCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES)),
) -> CostResponse:
    cost = cost_service.create_cost(db, payload)
    security.write_audit(
        db,
        entity_type="cost_record",
        entity_id=cost.cost_id,
        action="COST_RECORDED",
        actor=user.email,
        details={"sku": payload.sku, "cost_amount": payload.cost_amount},
    )
    db.commit()
    db.refresh(cost)
    return _to_response(cost)


def _to_response(c: CostHistory) -> CostResponse:
    return CostResponse(
        cost_id=c.cost_id,
        sku=c.sku,
        effective_date=c.effective_date,
        cost_amount=float(c.cost_amount),
        source=c.source,
        change_reason=c.change_reason,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )
