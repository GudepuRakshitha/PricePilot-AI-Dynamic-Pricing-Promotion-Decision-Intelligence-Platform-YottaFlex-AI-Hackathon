"""Competitor observation service."""

from __future__ import annotations

from datetime import date, datetime, time

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.competitor import CompetitorObservation
from app.models.price_history import PriceHistory


def analysis_datetime() -> datetime:
    """Reference timestamp used for freshness checks during the demo dataset window."""
    try:
        year, month, day = (int(part) for part in settings.AS_OF_DATE.split("-"))
        return datetime.combine(date(year, month, day), time(12, 0))
    except (ValueError, AttributeError):
        return datetime.now()


def is_observation_stale(observed_at: datetime, now: datetime | None = None) -> bool:
    """An observation is stale when older than the configured freshness window."""
    reference = now or analysis_datetime()
    reference = reference.replace(tzinfo=None)
    observed = observed_at.replace(tzinfo=None) if observed_at.tzinfo else observed_at
    return (reference - observed).total_seconds() > (settings.COMPETITOR_FRESHNESS_DAYS * 24 * 3600)


def list_observations(
    db: Session,
    sku: str | None = None,
    skip: int = 0,
    limit: int = 100,
    *,
    competitor: str | None = None,
    stale_only: bool = False,
) -> tuple[list[CompetitorObservation], int]:
    query = db.query(CompetitorObservation)
    if sku:
        query = query.filter(CompetitorObservation.sku == sku)
    if competitor:
        query = query.filter(CompetitorObservation.competitor == competitor)
    if stale_only:
        query = query.filter(CompetitorObservation.is_stale.is_(True))
    total = query.count()
    items = (
        query.order_by(CompetitorObservation.observed_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return items, total


def get_latest_observation(db: Session, sku: str) -> CompetitorObservation | None:
    return (
        db.query(CompetitorObservation)
        .filter(CompetitorObservation.sku == sku)
        .order_by(CompetitorObservation.observed_at.desc())
        .first()
    )


def create_observation(db: Session, payload) -> CompetitorObservation:
    from app.models.product import Product

    if not db.query(Product).filter_by(sku=payload.sku).first():
        from app.core.errors import NotFoundError

        raise NotFoundError(f"Product {payload.sku} not found")
    observation = CompetitorObservation(
        observation_id=f"OBS-{payload.sku}-{payload.observed_at.strftime('%Y%m%d%H%M')}",
        sku=payload.sku,
        competitor=payload.competitor,
        competitor_sku=payload.competitor_sku,
        observed_price=payload.observed_price,
        observed_at=payload.observed_at,
        source=payload.source,
        is_stale=is_observation_stale(payload.observed_at),
        stale_reason=(
            f"Observation older than {settings.COMPETITOR_FRESHNESS_DAYS}-day freshness window"
            if is_observation_stale(payload.observed_at)
            else None
        ),
    )
    db.add(observation)
    db.flush()
    return observation


def list_competitors(db: Session) -> list[str]:
    return [row[0] for row in db.query(CompetitorObservation.competitor).distinct().order_by(CompetitorObservation.competitor).all()]


def positions(db: Session, limit: int = 100) -> list[dict]:
    """Market positioning rows: latest observation against our latest selling price."""
    latest_obs_dates = (
        db.query(
            CompetitorObservation.sku.label("sku"),
            func.max(CompetitorObservation.observed_at).label("observed_at"),
        )
        .group_by(CompetitorObservation.sku)
        .subquery()
    )
    observations = (
        db.query(CompetitorObservation)
        .join(
            latest_obs_dates,
            (CompetitorObservation.sku == latest_obs_dates.c.sku)
            & (CompetitorObservation.observed_at == latest_obs_dates.c.observed_at),
        )
        .order_by(CompetitorObservation.sku.asc())
        .limit(limit)
        .all()
    )
    latest_prices: dict[str, float] = {}
    for price in db.query(PriceHistory).order_by(PriceHistory.effective_date.asc()).all():
        latest_prices[price.sku] = float(price.selling_price)

    rows: list[dict] = []
    for obs in observations:
        our_price = latest_prices.get(obs.sku)
        observed_price = float(obs.observed_price)
        stale = bool(obs.is_stale) or is_observation_stale(obs.observed_at)
        deviation_pct = (
            round((our_price - observed_price) / observed_price * 100.0, 4) if our_price else None
        )
        rows.append(
            {
                "sku": obs.sku,
                "competitor": obs.competitor,
                "observed_price": observed_price,
                "observed_at": obs.observed_at,
                "our_price": our_price,
                "deviation_pct": deviation_pct,
                "is_stale": stale,
                "stale_reason": obs.stale_reason,
                "position": (
                    "BELOW_MARKET"
                    if deviation_pct is not None and deviation_pct < -2
                    else "ABOVE_MARKET"
                    if deviation_pct is not None and deviation_pct > 2
                    else "AT_MARKET"
                ),
            }
        )
    return rows
