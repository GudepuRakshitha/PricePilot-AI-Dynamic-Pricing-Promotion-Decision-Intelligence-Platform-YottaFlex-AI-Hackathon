"""Exception management API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core import security
from app.models.exception import ExceptionRecord
from app.models.user import User
from app.schemas.exception import (
    ExceptionCreate,
    ExceptionListResponse,
    ExceptionResolveRequest,
    ExceptionResponse,
)
from app.services import exception_service

router = APIRouter(prefix="/exceptions", tags=["Exception Management"])


@router.get("", response_model=ExceptionListResponse)
def list_exceptions(
    status_filter: str | None = Query(
        None, alias="status", pattern="^(OPEN|ACKNOWLEDGED|RESOLVED|DISMISSED)$"
    ),
    severity: str | None = Query(None, pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$"),
    issue_type: str | None = None,
    sku: str | None = None,
    search: str | None = Query(None, max_length=128),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExceptionListResponse:
    items, total = exception_service.list_exceptions(
        db,
        skip=skip,
        limit=limit,
        status=status_filter,
        severity=severity,
        issue_type=issue_type,
        sku=sku,
        search=search,
    )
    return ExceptionListResponse(
        items=[_to_response(e) for e in items],
        total=total,
        skip=skip,
        limit=limit,
        counts=exception_service.summary(db),
    )


@router.get("/summary", response_model=dict)
def exception_summary(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> dict:
    return exception_service.summary(db)


@router.post("", response_model=ExceptionResponse, status_code=status.HTTP_201_CREATED)
def create_exception(
    payload: ExceptionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExceptionResponse:
    exception = exception_service.create_exception(db, payload)
    security.write_audit(
        db,
        entity_type="exception",
        entity_id=exception.exception_id,
        action="EXCEPTION_CREATED",
        actor=user.email,
        details={"issue_type": payload.issue_type, "sku": payload.sku},
    )
    db.commit()
    db.refresh(exception)
    return _to_response(exception)


@router.get("/{exception_id}", response_model=ExceptionResponse)
def get_exception(
    exception_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ExceptionResponse:
    return _to_response(exception_service.get_exception(db, exception_id))


@router.post("/{exception_id}/resolve", response_model=ExceptionResponse)
def resolve_exception(
    exception_id: str,
    payload: ExceptionResolveRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExceptionResponse:
    exception = exception_service.resolve_exception(
        db,
        exception_id,
        resolution_status=payload.resolution_status,
        resolved_by=payload.resolved_by or user.email,
        resolution_notes=payload.resolution_notes,
    )
    security.write_audit(
        db,
        entity_type="exception",
        entity_id=exception_id,
        action="EXCEPTION_RESOLVED",
        actor=user.email,
        details={
            "resolution_status": payload.resolution_status,
            "resolution_notes": payload.resolution_notes,
        },
    )
    db.commit()
    db.refresh(exception)
    return _to_response(exception)


def _to_response(e: ExceptionRecord) -> ExceptionResponse:
    return ExceptionResponse(
        exception_id=e.exception_id,
        decision_id=e.decision_id,
        issue_type=e.issue_type,
        severity=e.severity,
        sku=e.sku,
        description=e.description,
        expected_behavior=e.expected_behavior,
        actual_behavior=e.actual_behavior,
        resolution_status=e.resolution_status,
        detected_at=e.detected_at,
        resolved_at=e.resolved_at,
        resolved_by=e.resolved_by,
        resolution_notes=e.resolution_notes,
    )
