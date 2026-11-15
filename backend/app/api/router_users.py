"""User management and settings API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_admin
from app.core import security
from app.models.user import User
from app.schemas.common import (
    MessageResponse,
    UserCreateRequest,
    UserListResponse,
    UserResponse,
)
from app.services import user_service

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("", response_model=UserListResponse)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> UserListResponse:
    items, total = user_service.list_users(db, skip=skip, limit=limit)
    return UserListResponse(items=[_to_response(u) for u in items], total=total)


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> MessageResponse:
    created = user_service.create_user(
        db,
        email=str(payload.email),
        password=payload.password,
        full_name=payload.full_name,
        role=payload.role,
    )
    security.write_audit(
        db,
        entity_type="user",
        entity_id=created.id,
        action="USER_CREATED",
        actor=user.email,
        details={"email": created.email, "role": created.role},
    )
    db.commit()
    return MessageResponse(message=f"User {created.email} created", entity_id=created.id)


@router.patch("/{user_id}/active", response_model=MessageResponse)
def set_user_active(
    user_id: str,
    is_active: bool = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
) -> MessageResponse:
    target = user_service.set_active(db, user_id, is_active)
    security.write_audit(
        db,
        entity_type="user",
        entity_id=target.id,
        action="USER_STATUS_CHANGED",
        actor=user.email,
        details={"is_active": is_active},
    )
    db.commit()
    return MessageResponse(
        message=f"User {target.email} {'activated' if is_active else 'deactivated'}",
        entity_id=target.id,
    )


def _to_response(u: User) -> UserResponse:
    return UserResponse(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        role=u.role,
        is_active=u.is_active,
        created_at=u.created_at,
        updated_at=u.updated_at,
    )
