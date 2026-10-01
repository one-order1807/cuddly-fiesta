from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import backups, export, github, public, site, vault

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    s = get_settings()
    scheduler = None
    if s.enable_scheduler and s.supabase_service_role_key:
        from apscheduler.schedulers.background import BackgroundScheduler
        from .jobs import run_daily
        from .repo import get_repo

        scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
        scheduler.add_job(lambda: run_daily(get_repo()), "cron", hour=6, minute=0, id="daily-reminders", replace_existing=True)
        scheduler.start()
    yield
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(title="One-Order Admin API", version="0.1.0", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().origins,  # admin + website only — never "*"
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["authorization", "content-type", "x-webhook-secret"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    resp.headers.setdefault("Cache-Control", "no-store")
    return resp


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    # Log the type only: exception text can contain request data. Never log bodies, passwords or secrets.
    log.error("unhandled error: %s", type(exc).__name__)
    return JSONResponse({"detail": "Internal server error"}, status_code=500)


@app.get("/health")
def health():
    return {"ok": True}


for r in (vault.router, github.router, backups.router, public.router, site.router, export.router):
    app.include_router(r)
