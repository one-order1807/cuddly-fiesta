from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from ..auth import Admin, current_admin
from ..repo import Repo, get_repo

router = APIRouter(prefix="/export", tags=["export"])
COLS = ["business_name", "owner_name", "phone", "whatsapp", "email", "business_type", "city", "status", "onboarding_stage", "created_at"]


def safe_cell(v: object) -> str:
    """Neutralise spreadsheet formula injection: cells starting with = + - @ are prefixed with a quote."""
    s = "" if v is None else str(v)
    return "'" + s if s[:1] in ("=", "+", "-", "@", "\t", "\r") else s


@router.get("/clients.csv")
def clients_csv(_: Admin = Depends(current_admin), repo: Repo = Depends(get_repo)):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(COLS)
    for r in repo.export_clients():
        w.writerow([safe_cell(r.get(c)) for c in COLS])
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="clients.csv"', "Cache-Control": "no-store"})
