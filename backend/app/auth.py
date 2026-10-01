"""Verifies the Supabase access token on EVERY request and resolves the caller's role from `admin_users`."""

from __future__ import annotations

import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, Request, status
from jwt import PyJWKClient

from .config import Settings, get_settings
from .repo import Repo, get_repo

WRITE_ROLES = {"owner", "manager"}


@dataclass(frozen=True)
class Admin:
    id: str
    email: str
    role: str
    ip: str | None
    user_agent: str | None

    @property
    def row(self) -> dict:
        return {"id": self.id, "email": self.email}

    @property
    def can_reveal(self) -> bool:
        return self.role in WRITE_ROLES

    @property
    def can_write(self) -> bool:
        return self.role in WRITE_ROLES


@lru_cache
def _jwks(url: str) -> PyJWKClient:
    return PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json", cache_keys=True, lifespan=3600)


def decode_token(token: str, s: Settings) -> dict:
    try:
        if s.supabase_jwt_secret:  # legacy HS256 projects
            return jwt.decode(token, s.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")
        key = _jwks(s.supabase_url).get_signing_key_from_jwt(token).key
        return jwt.decode(token, key, algorithms=["RS256", "ES256"], audience="authenticated")
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from exc


# Short role cache so a burst of requests doesn't hit the DB each time; deactivation takes effect within TTL.
_role_cache: dict[str, tuple[float, dict | None]] = {}
_ROLE_TTL = 30.0


def _admin_row(repo: Repo, user_id: str) -> dict | None:
    hit = _role_cache.get(user_id)
    if hit and time.monotonic() - hit[0] < _ROLE_TTL:
        return hit[1]
    row = repo.get_admin(user_id)
    _role_cache[user_id] = (time.monotonic(), row)
    return row


def clear_role_cache() -> None:
    _role_cache.clear()


def current_admin(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
    repo: Repo = Depends(get_repo),
) -> Admin:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    claims = decode_token(authorization.split(" ", 1)[1], settings)
    row = _admin_row(repo, claims["sub"])
    if not row:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not an active admin")
    fwd = request.headers.get("x-forwarded-for")
    return Admin(
        id=row["id"], email=row["email"], role=row["role"],
        ip=(fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else None)),
        user_agent=(request.headers.get("user-agent") or "")[:300] or None,
    )


def require_writer(admin: Admin = Depends(current_admin)) -> Admin:
    if not admin.can_write:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role")
    return admin
