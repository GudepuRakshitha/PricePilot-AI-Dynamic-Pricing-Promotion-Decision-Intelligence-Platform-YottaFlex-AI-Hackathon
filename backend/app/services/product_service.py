"""Product service."""

from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


def list_products(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    *,
    search: str | None = None,
    category: str | None = None,
    brand: str | None = None,
    lifecycle_state: str | None = None,
) -> tuple[list[Product], int]:
    query = db.query(Product)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Product.sku.ilike(term),
                Product.name.ilike(term),
                Product.category.ilike(term),
                Product.brand.ilike(term),
            )
        )
    if category:
        query = query.filter(Product.category == category)
    if brand:
        query = query.filter(Product.brand == brand)
    if lifecycle_state:
        query = query.filter(Product.lifecycle_state == lifecycle_state)
    query = query.order_by(Product.sku.asc())
    total = query.count()
    return query.offset(skip).limit(limit).all(), total


def get_product(db: Session, sku: str) -> Product:
    product = db.query(Product).filter_by(sku=sku).first()
    if not product:
        raise NotFoundError(f"Product {sku} not found")
    return product


def create_product(db: Session, payload: ProductCreate) -> Product:
    if db.query(Product).filter_by(sku=payload.sku).first():
        raise ConflictError(f"Product {payload.sku} already exists")
    product = Product(
        sku=payload.sku,
        name=payload.name,
        category=payload.category,
        brand=payload.brand,
        lifecycle_state=payload.lifecycle_state,
        description=payload.description,
    )
    db.add(product)
    db.flush()
    return product


def update_product(db: Session, sku: str, payload: ProductUpdate) -> Product:
    product = get_product(db, sku)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.add(product)
    db.flush()
    return product


def list_facets(db: Session) -> dict[str, list[str]]:
    """Distinct categories and brands used by filters."""
    categories = [row[0] for row in db.query(Product.category).distinct().order_by(Product.category).all()]
    brands = [row[0] for row in db.query(Product.brand).distinct().order_by(Product.brand).all()]
    return {"categories": categories, "brands": brands}
