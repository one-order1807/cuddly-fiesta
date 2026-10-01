import base64
import os
import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app import ratelimit
from app.auth import clear_role_cache
from app.config import Settings, get_settings
from app.main import app
from app.repo import get_repo
from app.routers.vault import password_verifier

JWT_SECRET = "test-secret-test-secret-test-secret-123456"
KEY_B64 = base64.b64encode(os.urandom(32)).decode()
OWNER, MANAGER, SUPPORT, OUTSIDER = "u-owner", "u-manager", "u-support", "u-outsider"


class FakeRepo:
    def __init__(self):
        self.admins = {
            OWNER: {"id": OWNER, "email": "owner@x.in", "role": "owner", "active": True},
            MANAGER: {"id": MANAGER, "email": "mgr@x.in", "role": "manager", "active": True},
            SUPPORT: {"id": SUPPORT, "email": "sup@x.in", "role": "support", "active": True},
        }
        self.creds: dict[str, dict] = {}
        self.audits: list[dict] = []
        self.versions: dict[tuple, dict] = {}
        self.backups: dict[str, dict] = {}
        self.backup_logs: list[tuple] = []
        self.clients: list[dict] = []

    def get_admin(self, user_id): return self.admins.get(user_id)
    def list_credentials(self, client_id): return [dict(c) for c in self.creds.values() if not client_id or c.get("client_id") == client_id]
    def get_credential(self, cid): return self.creds.get(cid)
    def insert_credential(self, row): self.creds[row["id"]] = dict(row, last_changed_at="2026-01-01", created_at="2026-01-01"); return self.creds[row["id"]]
    def update_credential(self, cid, patch): self.creds[cid].update(patch); return self.creds[cid]
    def delete_credential(self, cid): self.creds.pop(cid, None)
    def audit(self, **kw): self.audits.append(kw)
    def list_repos(self, rid): return []
    def update_repo(self, rid, patch): pass
    def latest_version(self, app_, platform, channel): return self.versions.get((app_, platform, channel))
    def backup_for_client(self, cid): return self.backups.get(cid)
    def record_backup(self, backup, ok, size, note, next_at): self.backup_logs.append((backup["id"], ok, size, next_at))
    def export_clients(self): return self.clients
    def reminder_sources(self): return {}
    def upsert_reminder(self, row): pass


def token(sub: str, *, exp_in: int = 3600, secret: str = JWT_SECRET) -> str:
    return jwt.encode({"sub": sub, "aud": "authenticated", "exp": int(time.time()) + exp_in}, secret, algorithm="HS256")


def auth(sub: str) -> dict:
    return {"Authorization": f"Bearer {token(sub)}"}


@pytest.fixture
def repo():
    return FakeRepo()


@pytest.fixture
def password_ok():
    return {"value": True}


@pytest.fixture
def client(repo, password_ok):
    clear_role_cache()
    ratelimit.reset()
    settings = Settings(supabase_url="http://sb.local", supabase_anon_key="anon", supabase_service_role_key="svc",
                        supabase_jwt_secret=JWT_SECRET, vault_key=KEY_B64, backup_webhook_secret="hook-secret", enable_scheduler=False)
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_repo] = lambda: repo
    app.dependency_overrides[password_verifier] = lambda: (lambda email, pw: password_ok["value"] and pw == "correct horse")
    yield TestClient(app)
    app.dependency_overrides.clear()
