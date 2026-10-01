from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException

from ..auth import Admin, require_writer
from ..config import Settings, get_settings
from ..repo import Repo, get_repo

router = APIRouter(prefix="/site", tags=["site"])


@router.post("/revalidate")
def revalidate(admin: Admin = Depends(require_writer), settings: Settings = Depends(get_settings), repo: Repo = Depends(get_repo)):
    """Tell the public website to refresh its cached content (secret sent as a header, never in the URL)."""
    if not settings.site_revalidate_url or not settings.revalidate_secret:
        raise HTTPException(503, "Site revalidation is not configured")
    try:
        r = httpx.post(settings.site_revalidate_url, headers={"x-revalidate-secret": settings.revalidate_secret}, json={"paths": ["/"]}, timeout=10)
    except httpx.HTTPError:
        raise HTTPException(502, "Website did not respond") from None
    if r.status_code != 200:
        raise HTTPException(502, f"Website rejected the request ({r.status_code})")
    repo.audit(user=admin.row, action="publish", meta={"via": "api"}, ip=admin.ip, user_agent=admin.user_agent)
    return {"ok": True}
