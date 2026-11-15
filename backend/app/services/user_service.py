"""User and role service."""

from __future__ import annotations

import hashlib

from sqlalchemy.orm import Session

from app.core import security
from app.core.errors import ConflictError, NotFoundError
from app.models.user import User


def authenticate(db: Session, *, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user or not user.is_active:
        return None
    if not security.verify_password(password, user.hashed_password):
        return None
    return user


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter_by(email=email.lower().strip()).first()


def list_users(db: Session, skip: int = 0, limit: int = 100) -> tuple[list[User], int]:
    query = db.query(User).order_by(User.email.asc())
    total = query.count()
    return query.offset(skip).limit(limit).all(), total


def create_user(db: Session, *, email: str, password: str, full_name: str, role: str) -> User:
    email = email.lower().strip()
    if get_user_by_email(db, email):
        raise ConflictError("User already exists")
    digest = hashlib.sha256(email.encode("utf-8")).hexdigest()[:8].upper()
    user = User(
        id=f"USR-{digest}",
        email=email,
        hashed_password=security.hash_password(password),
        full_name=full_name,
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def get_user(db: Session, user_id: str) -> User:
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise NotFoundError(f"User {user_id} not found")
    return user


def set_active(db: Session, user_id: str, is_active: bool) -> User:
    user = get_user(db, user_id)
    user.is_active = is_active
    db.add(user)
    db.flush()
    return user
