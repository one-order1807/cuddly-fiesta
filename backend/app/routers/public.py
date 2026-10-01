"""Unauthenticated, read-only endpoints for the client apps."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from .. import ratelimit
from ..repo import Repo, get_repo

router = APIRouter(prefix="/public", tags=["public"])
_SEMVER = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)")


def parse(v: str | None) -> tuple[int, int, int] | None:
    m = _SEMVER.match(v or "")
    return (int(m[1]), int(m[2]), int(m[3])) if m else None


@router.get("/latest-version")
def latest_version(
    request: Request,
    app: str = Query(min_length=1, max_length=60, pattern=r"^[a-z0-9-]+$"),
    platform: str = Query(default="android", pattern=r"^[a-z]+$"),
    channel: str = Query(default="stable", pattern=r"^(stable|beta)$"),
    current: str | None = Query(default=None, max_length=30),
    repo: Repo = Depends(get_repo),
):
    ratelimit.hit(f"latest:{request.client.host if request.client else 'x'}", limit=60, window_s=60)
    row = repo.latest_version(app, platform, channel)
    if not row:
        raise HTTPException(404, "No released version for that app/platform")
    cur, latest, floor = parse(current), parse(row["version"]), parse(row.get("min_supported_version"))
    update_available = bool(cur and latest and cur < latest)
    # force the update if the admin flagged it, or the installed build is older than the supported floor
    force = bool(update_available and (row.get("force_update") or (floor and cur < floor)))
    return {
        "app": app, "platform": platform, "channel": channel, "version": row["version"], "build_number": row.get("build_number"),
        "release_notes": row.get("release_notes"), "download_url": row.get("download_url"), "store_url": row.get("store_url"),
        "min_supported_version": row.get("min_supported_version"), "update_available": update_available, "force_update": force,
    }
