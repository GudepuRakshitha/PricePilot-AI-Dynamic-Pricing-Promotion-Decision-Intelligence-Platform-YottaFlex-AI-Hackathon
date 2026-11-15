"""PricePilot AI FastAPI application."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api import api_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.errors import PricePilotError
from app.core.metrics import record_request, snapshot as metrics_snapshot


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Prepare the schema and seed demo data on first startup."""
    import app.models  # noqa: F401  ensure all models register on Base.metadata

    # Alembic owns production schema changes; create_all is a safe idempotent
    # fallback for fresh SQLite databases used by lightweight local runs.
    Base.metadata.create_all(bind=engine)

    if settings.AUTO_SEED:
        from app.services import seed_service

        db = SessionLocal()
        try:
            seed_service.seed_users(db)
            from app.models.product import Product

            if db.query(Product).count() == 0:
                seed_service.seed_demo_data(db, mode="starter")
        finally:
            db.close()

    yield
    engine.dispose()


app = FastAPI(
    title="PricePilot AI",
    description=(
        "Dynamic Pricing & Promotion Decision Intelligence Platform. "
        "Deterministic, explainable pricing with margin protection, promotion validation, "
        "exception management and full decision traceability."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_metrics_middleware(request: Request, call_next):
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        record_request((time.perf_counter() - started) * 1000.0, 500)
        raise
    record_request((time.perf_counter() - started) * 1000.0, response.status_code)
    return response


@app.exception_handler(PricePilotError)
async def pricepilot_error_handler(request: Request, exc: PricePilotError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.error_code, "code": exc.error_code, "message": exc.message},
    )


app.include_router(api_router)


@app.get("/health", tags=["System"])
async def health() -> dict:
    return {"status": "ok", "environment": settings.ENVIRONMENT, "version": settings.APP_VERSION}


@app.get("/", tags=["System"])
async def root() -> dict:
    return {"service": "PricePilot AI", "docs": "/docs", "api": "/api/v1"}


@app.get("/api/v1/system/metrics", tags=["System"])
async def system_metrics() -> dict:
    """Live in-process API latency and error metrics."""
    return metrics_snapshot()


@app.get("/api/v1/system/database", tags=["System"])
async def database_health() -> dict:
    """Database connectivity and table row counts for operational checks."""
    from app.models.competitor import CompetitorObservation
    from app.models.cost_history import CostHistory
    from app.models.exception import ExceptionRecord
    from app.models.inventory import InventorySnapshot
    from app.models.order import CustomerOrder
    from app.models.price_history import PriceHistory, PricingDecision
    from app.models.product import Product
    from app.models.promotion import Promotion

    db = SessionLocal()
    try:
        db.execute(text("select 1"))
        counts = {
            "products": db.query(Product).count(),
            "cost_history": db.query(CostHistory).count(),
            "price_history": db.query(PriceHistory).count(),
            "competitor_observations": db.query(CompetitorObservation).count(),
            "inventory_snapshots": db.query(InventorySnapshot).count(),
            "promotions": db.query(Promotion).count(),
            "pricing_decisions": db.query(PricingDecision).count(),
            "exceptions": db.query(ExceptionRecord).count(),
            "customer_orders": db.query(CustomerOrder).count(),
        }
        version = db.execute(text("select version()")).scalar_one()
    finally:
        db.close()
    return {
        "status": "connected",
        "dialect": engine.dialect.name,
        "server_version": version.split(" on ")[0],
        "tables": counts,
    }
