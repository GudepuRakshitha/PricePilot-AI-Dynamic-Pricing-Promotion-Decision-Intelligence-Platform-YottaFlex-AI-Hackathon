"""Demand signal computation from historical sales."""

from __future__ import annotations

from datetime import date
from typing import Any, Optional

from app.core.config import settings

HIGH_RATIO = 1.25
LOW_RATIO = 0.8


def compute_demand_level(
    daily_units: list[tuple[date, float]],
) -> dict[str, Any]:
    """Derive a demand level from recent daily sales units.

    `daily_units` must be ordered by ascending date.
    """
    if not daily_units:
        return {
            "demand_level": "STABLE",
            "score": 0.5,
            "source": "insufficient_history",
            "description": "No historical sales data available",
        }

    values = [float(u) for _, u in daily_units]
    if len(values) < 2:
        return {
            "demand_level": "STABLE",
            "score": 0.5,
            "source": "insufficient_history",
            "description": "Insufficient history for demand estimation",
        }

    window = 7
    recent_total = sum(values[-window:])
    prior_total = sum(values[-(2 * window):]) - recent_total
    baseline = prior_total if prior_total > 0 else sum(values) / len(values)
    ratio = recent_total / baseline if baseline > 0 else 1.0
    score = min(max(ratio, 0.0), 2.0)

    if score > HIGH_RATIO:
        level = "HIGH"
    elif score < LOW_RATIO:
        level = "LOW"
    else:
        level = "MEDIUM"

    return {
        "demand_level": level,
        "score": round(score, 4),
        "source": "historical_sales",
        "description": f"Recent demand ratio {round(ratio, 3)} vs baseline",
        "recommended_multiplier": {
            "HIGH": settings.DEMAND_HIGH_MULTIPLIER,
            "MEDIUM": settings.DEMAND_MEDIUM_MULTIPLIER,
            "LOW": settings.DEMAND_LOW_MULTIPLIER,
            "STABLE": settings.DEMAND_MEDIUM_MULTIPLIER,
        }[level],
    }
