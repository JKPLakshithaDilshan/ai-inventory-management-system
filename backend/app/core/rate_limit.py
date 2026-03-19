"""In-memory rate limiting dependencies for FastAPI routes."""

from __future__ import annotations

import asyncio
import time
from collections import deque
from typing import Deque

from fastapi import HTTPException, Request, status

from app.core.config import settings


class InMemoryRateLimiter:
    """A lightweight in-memory fixed-window limiter.

    This is process-local and suitable for single-instance deployments or dev.
    For distributed deployments, replace with Redis-based coordination.
    """

    def __init__(self) -> None:
        self._buckets: dict[str, Deque[float]] = {}
        self._lock = asyncio.Lock()

    async def hit(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        """Register a request and return (allowed, retry_after_seconds)."""
        now = time.time()
        window_start = now - window_seconds

        async with self._lock:
            bucket = self._buckets.setdefault(key, deque())

            while bucket and bucket[0] < window_start:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = max(1, int(window_seconds - (now - bucket[0])))
                return False, retry_after

            bucket.append(now)
            return True, 0


_limiter = InMemoryRateLimiter()


def _client_identifier(request: Request) -> str:
    """Get best-effort request identifier using proxy-aware headers."""
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()

    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()

    return request.client.host if request.client else "unknown"


def build_rate_limit_dependency(limit: int, window_seconds: int, scope: str):
    """Create a FastAPI dependency that applies request rate limiting."""

    async def dependency(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return

        identifier = _client_identifier(request)
        key = f"{scope}:{identifier}"
        allowed, retry_after = await _limiter.hit(key, limit=limit, window_seconds=window_seconds)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )

    return dependency


default_rate_limit = build_rate_limit_dependency(
    settings.RATE_LIMIT_DEFAULT_REQUESTS,
    settings.RATE_LIMIT_DEFAULT_WINDOW_SECONDS,
    "default",
)

login_rate_limit = build_rate_limit_dependency(
    settings.RATE_LIMIT_AUTH_LOGIN_REQUESTS,
    settings.RATE_LIMIT_AUTH_LOGIN_WINDOW_SECONDS,
    "auth-login",
)

refresh_rate_limit = build_rate_limit_dependency(
    settings.RATE_LIMIT_AUTH_REFRESH_REQUESTS,
    settings.RATE_LIMIT_AUTH_REFRESH_WINDOW_SECONDS,
    "auth-refresh",
)

ai_rate_limit = build_rate_limit_dependency(
    settings.RATE_LIMIT_AI_REQUESTS,
    settings.RATE_LIMIT_AI_WINDOW_SECONDS,
    "ai",
)

alerts_rate_limit = build_rate_limit_dependency(
    settings.RATE_LIMIT_ALERTS_REQUESTS,
    settings.RATE_LIMIT_ALERTS_WINDOW_SECONDS,
    "alerts",
)
