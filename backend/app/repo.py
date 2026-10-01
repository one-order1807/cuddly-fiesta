"""Data access for the service. Every query the API makes lives here, so routers stay thin and tests can swap in a fake."""

from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Protocol

from supabase import Client, create_client

from .config import get_settings

Row = dict[str, Any]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Repo(Protocol):
    def get_admin(self, user_id: str) -> Row | None: ...
    def list_credentials(self, client_id: str | None) -> list[Row]: ...
    def get_credential(self, cred_id: str) -> Row | None: ...
    def insert_credential(self, row: Row) -> Row: ...
    def update_credential(self, cred_id: str, patch: Row) -> Row: ...
    def delete_credential(self, cred_id: str) -> None: ...
    def audit(self, *, user: Row | None, action: str, entity: str | None = None, entity_id: str | None = None,
              meta: Row | None = None, ip: str | None = None, user_agent: str | None = None) -> None: ...
    def list_repos(self, repo_id: str | None) -> list[Row]: ...
    def update_repo(self, repo_id: str, patch: Row) -> None: ...
    def latest_version(self, app: str, platform: str, channel: str) -> Row | None: ...
    def backup_for_client(self, client_id: str) -> Row | None: ...
    def record_backup(self, backup: Row, ok: bool, size_mb: float | None, note: str | None, next_at: str | None) -> None: ...
    def export_clients(self) -> list[Row]: ...
    def reminder_sources(self) -> dict[str, list[Row]]: ...
    def upsert_reminder(self, row: Row) -> None: ...


class SupabaseRepo:
    def __init__(self, client: Client):
        self.sb = client

    def get_admin(self, user_id):
        r = self.sb.table("admin_users").select("id,email,full_name,role,active").eq("id", user_id).maybe_single().execute()
        return r.data if r and r.data and r.data.get("active") else None

    def list_credentials(self, client_id):
        q = self.sb.table("credentials").select("id,client_id,label,username,url,notes,rotation_days,last_changed_at,created_at").is_("deleted_at", "null")
        if client_id:
            q = q.eq("client_id", client_id)
        return q.order("label").execute().data or []

    def get_credential(self, cred_id):
        r = self.sb.table("credentials").select("*").eq("id", cred_id).is_("deleted_at", "null").maybe_single().execute()
        return r.data if r else None

    def insert_credential(self, row):
        return self.sb.table("credentials").insert(row).execute().data[0]

    def update_credential(self, cred_id, patch):
        return self.sb.table("credentials").update(patch).eq("id", cred_id).execute().data[0]

    def delete_credential(self, cred_id):
        self.sb.table("credentials").update({"deleted_at": now_iso()}).eq("id", cred_id).execute()

    def audit(self, *, user, action, entity=None, entity_id=None, meta=None, ip=None, user_agent=None):
        self.sb.table("audit_log").insert({
            "user_id": user["id"] if user else None, "user_email": user["email"] if user else None,
            "action": action, "entity": entity, "entity_id": entity_id, "meta": meta or {}, "ip": ip, "user_agent": user_agent,
        }).execute()

    def list_repos(self, repo_id):
        q = self.sb.table("repos").select("*").is_("deleted_at", "null")
        if repo_id:
            q = q.eq("id", repo_id)
        return q.execute().data or []

    def update_repo(self, repo_id, patch):
        self.sb.table("repos").update(patch).eq("id", repo_id).execute()

    def latest_version(self, app, platform, channel):
        r = (self.sb.table("v_public_latest_versions").select("*")
             .eq("app", app).eq("platform", platform).eq("channel", channel).limit(1).execute())
        return (r.data or [None])[0]

    def backup_for_client(self, client_id):
        r = self.sb.table("backups").select("*").eq("client_id", client_id).limit(1).execute()
        return (r.data or [None])[0]

    def record_backup(self, backup, ok, size_mb, note, next_at):
        self.sb.table("backup_logs").insert({"backup_id": backup["id"], "ok": ok, "size_mb": size_mb, "note": note, "source": "webhook"}).execute()
        patch: Row = {"status": "ok" if ok else "failed"}
        if ok:
            patch.update({"last_backup_at": now_iso(), "next_backup_at": next_at})
            if size_mb is not None:
                patch["size_mb"] = size_mb
        self.sb.table("backups").update(patch).eq("id", backup["id"]).execute()

    def export_clients(self):
        return self.sb.table("clients").select("business_name,owner_name,phone,whatsapp,email,business_type,city,status,onboarding_stage,created_at").is_("deleted_at", "null").order("business_name").execute().data or []

    def reminder_sources(self):
        t = lambda name, cols="*": self.sb.table(name).select(cols).execute().data or []  # noqa: E731
        return {
            "subscriptions": t("subscriptions"), "clients": self.sb.table("clients").select("id,business_name").is_("deleted_at", "null").execute().data or [],
            "backups": t("backups"), "deployments": t("deployments"), "repos": self.sb.table("repos").select("*").is_("deleted_at", "null").execute().data or [],
            "credentials": self.sb.table("credentials").select("id,client_id,label,rotation_days,last_changed_at").is_("deleted_at", "null").execute().data or [],
            "leads": self.sb.table("leads").select("id,name,phone,status,follow_up_at").is_("deleted_at", "null").execute().data or [],
            "invoices": self.sb.table("invoices").select("id,client_id,number,due_date,status,total").is_("deleted_at", "null").execute().data or [],
        }

    def upsert_reminder(self, row):
        self.sb.table("reminders").upsert(row, on_conflict="dedupe_key", ignore_duplicates=True).execute()


@lru_cache
def get_repo() -> Repo:
    s = get_settings()
    return SupabaseRepo(create_client(s.supabase_url, s.supabase_service_role_key))
