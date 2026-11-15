"""Lightweight in-process request metrics."""

from __future__ import annotations

import statistics
from collections import deque

_MAX_SAMPLES = 2000
_durations_ms: deque[float] = deque(maxlen=_MAX_SAMPLES)
_statuses: deque[int] = deque(maxlen=_MAX_SAMPLES)


def record_request(duration_ms: float, status_code: int) -> None:
    _durations_ms.append(float(duration_ms))
    _statuses.append(int(status_code))


def snapshot() -> dict[str, float]:
    if not _durations_ms:
        return {
            "api_response_time_p50_ms": 0.0,
            "api_response_time_p95_ms": 0.0,
            "api_error_rate": 0.0,
            "request_count": 0,
        }
    ordered = sorted(_durations_ms)
    p50 = statistics.median(ordered)
    index = min(int(len(ordered) * 0.95), len(ordered) - 1)
    p95 = ordered[index]
    errors = sum(1 for status in _statuses if status >= 500)
    return {
        "api_response_time_p50_ms": round(p50, 2),
        "api_response_time_p95_ms": round(p95, 2),
        "api_error_rate": round(errors / len(_statuses) * 100.0, 4),
        "request_count": len(_statuses),
    }
