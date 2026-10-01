"""Credentials vault.

* Secrets are encrypted here (AES-256-GCM) and only ciphertext + nonce reach the database.
* List endpoints NEVER return a secret. The only way to read one is POST /vault/{id}/reveal, which
  requires the admin's password again, is rate limited, role-gated (owner/manager) and audit-logged.
* Nothing in this module logs a secret or a password.
"""

from __future__ import annotations

import uuid
from typing import Annotated, Callable

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field, HttpUrl

from .. import ratelimit
from ..auth import Admin, current_admin, require_writer
from ..config import Settings, get_settings
from ..crypto import DecryptionError, decrypt, encrypt, from_pg, load_key, to_pg
from ..repo import Repo, get_repo, now_iso

router = APIRouter(prefix="/vault", tags=["vault"])
REVEAL_SECONDS = 20


def vault_key(s: Settings = Depends(get_settings)) -> bytes:
    return load_key(s.vault_key)


def password_verifier(s: Settings = Depends(get_settings)) -> Callable[[str, str], bool]:
    """Re-authentication: ask Supabase whether this email+password is valid. Overridden in tests."""
    def verify(email: str, password: str) -> bool:
        try:
            r = httpx.post(f"{s.supabase_url}/auth/v1/token?grant_type=password",
                           headers={"apikey": s.supabase_anon_key}, json={"email": email, "password": password}, timeout=10)
            return r.status_code == 200
        except httpx.HTTPError:
            return False
    return verify


class CredentialIn(BaseModel):
    client_id: uuid.UUID | None = None
    label: str = Field(min_length=1, max_length=120)
    username: str | None = Field(default=None, max_length=200)
    url: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=2000)
    secret: str = Field(min_length=1, max_length=4000)
    rotation_days: int = Field(default=90, ge=1, le=1825)


class CredentialPatch(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=120)
    username: str | None = Field(default=None, max_length=200)
    url: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=2000)
    secret: str | None = Field(default=None, min_length=1, max_length=4000)
    rotation_days: int | None = Field(default=None, ge=1, le=1825)


class RevealIn(BaseModel):
    password: str = Field(min_length=1, max_length=200)


def _public(row: dict) -> dict:
    # allow-list: ciphertext/nonce can never leak through this serializer
    keys = ("id", "client_id", "label", "username", "url", "notes", "rotation_days", "last_changed_at", "created_at")
    return {k: row.get(k) for k in keys}


@router.get("")
def list_credentials(client_id: uuid.UUID | None = None, _: Admin = Depends(current_admin), repo: Repo = Depends(get_repo)):
    return [_public(r) for r in repo.list_credentials(str(client_id) if client_id else None)]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_credential(body: CredentialIn, admin: Admin = Depends(require_writer), repo: Repo = Depends(get_repo), key: bytes = Depends(vault_key)):
    cred_id = str(uuid.uuid4())
    ct, nonce = encrypt(key, body.secret, cred_id.encode())
    row = repo.insert_credential({
        "id": cred_id, "client_id": str(body.client_id) if body.client_id else None, "label": body.label, "username": body.username,
        "url": body.url, "notes": body.notes, "rotation_days": body.rotation_days, "created_by": admin.id,
        "secret_ciphertext": to_pg(ct), "secret_nonce": to_pg(nonce),
    })
    repo.audit(user=admin.row, action="vault_create", entity="credentials", entity_id=cred_id, meta={"label": body.label}, ip=admin.ip, user_agent=admin.user_agent)
    return _public(row)


@router.patch("/{cred_id}")
def update_credential(cred_id: uuid.UUID, body: CredentialPatch, admin: Admin = Depends(require_writer), repo: Repo = Depends(get_repo), key: bytes = Depends(vault_key)):
    if not repo.get_credential(str(cred_id)):
        raise HTTPException(404, "Not found")
    patch = body.model_dump(exclude_none=True, exclude={"secret"})
    if body.secret is not None:
        ct, nonce = encrypt(key, body.secret, str(cred_id).encode())
        patch.update({"secret_ciphertext": to_pg(ct), "secret_nonce": to_pg(nonce), "last_changed_at": now_iso()})
    row = repo.update_credential(str(cred_id), patch)
    repo.audit(user=admin.row, action="vault_update", entity="credentials", entity_id=str(cred_id), meta={"secret_changed": body.secret is not None}, ip=admin.ip, user_agent=admin.user_agent)
    return _public(row)


@router.delete("/{cred_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credential(cred_id: uuid.UUID, admin: Admin = Depends(require_writer), repo: Repo = Depends(get_repo)):
    if not repo.get_credential(str(cred_id)):
        raise HTTPException(404, "Not found")
    repo.delete_credential(str(cred_id))
    repo.audit(user=admin.row, action="vault_delete", entity="credentials", entity_id=str(cred_id), ip=admin.ip, user_agent=admin.user_agent)
    return Response(status_code=204)


@router.post("/{cred_id}/reveal")
def reveal(
    cred_id: uuid.UUID, body: RevealIn, response: Response,
    admin: Admin = Depends(current_admin), repo: Repo = Depends(get_repo), key: bytes = Depends(vault_key),
    verify: Annotated[Callable[[str, str], bool], Depends(password_verifier)] = None,  # type: ignore[assignment]
):
    if not admin.can_reveal:
        repo.audit(user=admin.row, action="vault_reveal_denied", entity="credentials", entity_id=str(cred_id), ip=admin.ip, user_agent=admin.user_agent)
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your role cannot reveal secrets")

    ratelimit.hit(f"reveal:{admin.id}", limit=6, window_s=60)

    if not verify(admin.email, body.password):
        repo.audit(user=admin.row, action="vault_reveal_bad_password", entity="credentials", entity_id=str(cred_id), ip=admin.ip, user_agent=admin.user_agent)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Password is incorrect")

    row = repo.get_credential(str(cred_id))
    if not row:
        raise HTTPException(404, "Not found")
    try:
        secret = decrypt(key, from_pg(row["secret_ciphertext"]), from_pg(row["secret_nonce"]), str(cred_id).encode())
    except DecryptionError:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Secret could not be decrypted (wrong VAULT_KEY?)") from None

    repo.audit(user=admin.row, action="vault_reveal", entity="credentials", entity_id=str(cred_id), meta={"label": row["label"]}, ip=admin.ip, user_agent=admin.user_agent)
    response.headers["Cache-Control"] = "no-store"
    return {"secret": secret, "expires_in": REVEAL_SECONDS}
