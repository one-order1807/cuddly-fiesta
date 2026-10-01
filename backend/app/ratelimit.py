"""Tiny in-memory sliding-window limiter. Per-process: put a shared limiter (Redis) in front if you run several replicas."""

import time
from collections import defaultdict, deque

from fastapi import HTTPException, status

_hits: dict[str, deque[float]] = defaultdict(deque)


def hit(key: str, limit: int, window_s: int) -> None:
    now = time.monotonic()
    q = _hits[key]
    while q and now - q[0] > window_s:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests — slow down", headers={"Retry-After": str(window_s)})
    q.append(now)


def reset() -> None:
    _hits.clear()
