"""Audit history API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.audit_order import AuditLog
from app.models.user import User
from app.schemas.common import AuditListResponse, AuditLogResponse
from app.services import audit_service

router = APIRouter(prefix="/audit", tags=["Audit History"])


@router.get("", response_model=AuditListResponse)
def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    entity_type: str | None = None,
    action: str | None = None,
    actor: str | None = None,
    search: str | None = Query(None, max_length=128),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AuditListResponse:
    items, total = audit_service.list_audit_logs(
        db,
        skip=skip,
        limit=limit,
        entity_type=entity_type,
        action=action,
        actor=actor,
        search=search,
    )
    return AuditListResponse(
        items=[_to_response(a) for a in items], total=total, skip=skip, limit=limit
    )


@router.get("/facets", response_model=dict)
def audit_facets(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    return audit_service.facets(db)


def _to_response(a: AuditLog) -> AuditLogResponse:
    return AuditLogResponse(
        id=a.id,
        entity_type=a.entity_type,
        entity_id=a.entity_id,
        action=a.action,
        actor=a.actor,
        details=a.details or {},
        created_at=a.created_at,
    )
