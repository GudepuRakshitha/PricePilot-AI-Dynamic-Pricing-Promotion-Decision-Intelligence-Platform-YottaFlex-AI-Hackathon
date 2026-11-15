"""Competitor observation API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import MANAGER_ROLES, get_current_user, get_db, require_roles
from app.core import security
from app.models.competitor import CompetitorObservation
from app.models.user import User
from app.schemas.competitor import (
    CompetitorListResponse,
    CompetitorObservationCreate,
    CompetitorObservationResponse,
    CompetitorPositionResponse,
)
from app.services import competitor_service

router = APIRouter(prefix="/competitors", tags=["Competitor Intelligence"])


@router.get("", response_model=CompetitorListResponse)
def list_observations(
    sku: str | None = None,
    competitor: str | None = None,
    stale_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CompetitorListResponse:
    items, total = competitor_service.list_observations(
        db, sku=sku, skip=skip, limit=limit, competitor=competitor, stale_only=stale_only
    )
    return CompetitorListResponse(
        items=[_to_response(o) for o in items],
        total=total,
        skip=skip,
        limit=limit,
        competitors=competitor_service.list_competitors(db),
    )


@router.get("/positions", response_model=CompetitorPositionResponse)
def competitor_positions(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CompetitorPositionResponse:
    rows = competitor_service.positions(db, limit=limit)
    return CompetitorPositionResponse(items=rows, total=len(rows))


@router.post(
    "/observations",
    response_model=CompetitorObservationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_observation(
    payload: CompetitorObservationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(*MANAGER_ROLES)),
) -> CompetitorObservationResponse:
    obs = competitor_service.create_observation(db, payload)
    security.write_audit(
        db,
        entity_type="competitor_observation",
        entity_id=obs.observation_id,
        action="COMPETITOR_OBSERVATION_CREATED",
        actor=user.email,
        details={
            "sku": payload.sku,
            "competitor": payload.competitor,
            "observed_price": payload.observed_price,
        },
    )
    db.commit()
    db.refresh(obs)
    return _to_response(obs)


def _to_response(o: CompetitorObservation) -> CompetitorObservationResponse:
    return CompetitorObservationResponse(
        observation_id=o.observation_id,
        sku=o.sku,
        competitor=o.competitor,
        competitor_sku=o.competitor_sku,
        observed_price=float(o.observed_price),
        observed_at=o.observed_at,
        source=o.source,
        is_stale=o.is_stale,
        stale_reason=o.stale_reason,
    )
