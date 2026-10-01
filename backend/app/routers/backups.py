"""Backup scripts report here:  curl -X POST $API/backups/webhook -H "x-webhook-secret: …" -d '{"client_id":"…","ok":true,"size_mb":12.5}'"""

from __future__ import annotations

import hmac
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field

from .. import ratelimit
from ..config import Settings, get_settings
from ..repo import Repo, get_repo

router = APIRouter(prefix="/backups", tags=["backups"])
_EVERY = {"hourly": timedelta(hours=1), "daily": timedelta(days=1), "weekly": timedelta(weeks=1), "monthly": timedelta(days=30)}


class BackupReport(BaseModel):
    client_id: uuid.UUID
    ok: bool = True
    size_mb: float | None = Field(default=None, ge=0)
    note: str | None = Field(default=None, max_length=500)


@router.post("/webhook")
def webhook(
    body: BackupReport, request: Request, x_webhook_secret: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings), repo: Repo = Depends(get_repo),
):
    ratelimit.hit(f"bk:{request.client.host if request.client else 'x'}", limit=30, window_s=60)
    expected = settings.backup_webhook_secret or ""
    if not expected or not x_webhook_secret or not hmac.compare_digest(x_webhook_secret.encode(), expected.encode()):
        raise HTTPException(401, "Invalid webhook secret")
    backup = repo.backup_for_client(str(body.client_id))
    if not backup:
        raise HTTPException(404, "No backup plan configured for that client")
    step = _EVERY.get(backup.get("frequency", "daily"), timedelta(days=1))
    next_at = (datetime.now(timezone.utc) + step).isoformat()
    repo.record_backup(backup, body.ok, body.size_mb, body.note, next_at)
    repo.audit(user=None, action="backup_reported", entity="backups", entity_id=backup["id"], meta={"ok": body.ok}, ip=request.client.host if request.client else None)
    return {"ok": True, "next_backup_at": next_at}
