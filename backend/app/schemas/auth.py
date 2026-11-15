"""Authentication schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class TokenPair(BaseModel):
    """Access and refresh token pair."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    """Login credentials."""

    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    """Token issuance response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in_minutes: int = 60 * 24 * 7


class MeResponse(BaseModel):
    """Current authenticated user."""

    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
