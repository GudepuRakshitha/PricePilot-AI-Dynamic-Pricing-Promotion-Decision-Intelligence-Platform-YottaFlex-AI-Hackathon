"""Authentication API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, create_refresh_token, decode_token, get_user_from_token
from app.models.user import User
from app.schemas.auth import LoginRequest, MeResponse, TokenPair, TokenResponse
from app.services import user_service
from app.api.deps import get_current_user, get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse, summary="Authenticate and issue JWT tokens")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = user_service.authenticate(db, email=payload.email, password=payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(
        access_token=create_access_token(user.email),
        refresh_token=create_refresh_token(user.email),
        expires_in_minutes=60 * 24 * 7,
    )


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/refresh", response_model=TokenPair)
def refresh(token: str, db: Session = Depends(get_db)) -> TokenPair:
    payload = decode_token(token)
    user = user_service.get_user_by_email(db, payload.get("sub", ""))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return TokenPair(access_token=create_access_token(user.email), refresh_token=create_refresh_token(user.email))


__all__ = ["router", "get_current_user", "get_db"]
