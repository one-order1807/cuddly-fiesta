from datetime import date

from app.jobs import build_reminders
from app.routers.export import safe_cell
from app.routers.github import parse_repo
from app.routers.public import parse

from .conftest import OWNER, auth

CID = "11111111-1111-1111-1111-111111111111"


def test_health(client):
    assert client.get("/health").json() == {"ok": True}
    assert client.get("/health").headers["x-content-type-options"] == "nosniff"


# ---- public latest-version ----
def test_latest_version_update_flags(client, repo):
    repo.versions[("one-order-pos", "android", "stable")] = {"version": "1.4.0", "min_supported_version": "1.2.0", "force_update": False, "download_url": "https://x/apk"}
    q = "/public/latest-version?app=one-order-pos&platform=android"
    assert client.get(q + "&current=1.4.0").json()["update_available"] is False
    j = client.get(q + "&current=1.3.0").json()
    assert j["update_available"] and not j["force_update"]
    assert client.get(q + "&current=1.1.0").json()["force_update"] is True  # below supported floor
    assert client.get("/public/latest-version?app=nope&platform=android").status_code == 404
    assert client.get("/public/latest-version?app=Bad_App!").status_code == 422


def test_semver_parse():
    assert parse("v1.2.3") == (1, 2, 3) and parse("1.10.0") > parse("1.9.9") and parse("junk") is None


# ---- backups webhook ----
def test_backup_webhook_secret_enforced(client, repo):
    repo.backups[CID] = {"id": "b1", "client_id": CID, "frequency": "daily"}
    body = {"client_id": CID, "ok": True, "size_mb": 12.5}
    assert client.post("/backups/webhook", json=body).status_code == 401
    assert client.post("/backups/webhook", json=body, headers={"x-webhook-secret": "wrong"}).status_code == 401
    r = client.post("/backups/webhook", json=body, headers={"x-webhook-secret": "hook-secret"})
    assert r.status_code == 200 and repo.backup_logs[0][:3] == ("b1", True, 12.5)
    assert client.post("/backups/webhook", json={**body, "client_id": "22222222-2222-2222-2222-222222222222"}, headers={"x-webhook-secret": "hook-secret"}).status_code == 404


# ---- csv export ----
def test_csv_formula_injection_neutralised(client, repo):
    repo.clients = [{"business_name": "=HYPERLINK(\"http://evil\")", "owner_name": "+cmd|' /C calc'!A0", "phone": "-5", "city": "Pune"}]
    r = client.get("/export/clients.csv", headers=auth(OWNER))
    assert r.status_code == 200
    assert "'=HYPERLINK" in r.text and "\n=HYP" not in r.text and "'+cmd" in r.text
    assert client.get("/export/clients.csv").status_code == 401
    assert safe_cell(None) == "" and safe_cell("normal") == "normal"


# ---- github url parsing ----
def test_parse_repo_urls():
    assert parse_repo("https://github.com/one-order1807/cuddly-fiesta.git") == ("one-order1807", "cuddly-fiesta")
    assert parse_repo("https://github.com/a/b/") == ("a", "b")
    assert parse_repo("git@github.com:a/b.git") == ("a", "b")
    assert parse_repo("https://example.com/a/b") is None


# ---- reminders job ----
def test_daily_reminders_logic():
    today = date(2026, 10, 2)
    src = {
        "clients": [{"id": "c1", "business_name": "Chai Tapri"}],
        "subscriptions": [{"client_id": "c1", "free_period_end": "2026-10-09", "next_billing_date": None, "renewal_reminder": True}],
        "backups": [{"id": "b1", "client_id": "c1", "status": "overdue", "next_backup_at": None}],
        "deployments": [{"id": "d1", "client_id": "c1", "domain": "chai.example", "ssl_expires_on": "2026-10-20"}],
        "repos": [{"id": "r1", "repo_name": "chai", "last_commit_at": "2026-08-01T00:00:00Z"}],
        "credentials": [{"id": "k1", "client_id": "c1", "label": "Supabase", "rotation_days": 90, "last_changed_at": "2026-05-01T00:00:00Z"}],
        "leads": [{"id": "l1", "name": "Sana", "phone": "1", "status": "new", "follow_up_at": "2026-10-01T00:00:00Z"}, {"id": "l2", "name": "Won", "phone": "2", "status": "won", "follow_up_at": "2026-10-01T00:00:00Z"}],
        "invoices": [{"id": "i1", "client_id": "c1", "number": "INV-1001", "due_date": "2026-09-20", "status": "sent", "total": 5}],
    }
    out = build_reminders(src, today)
    kinds = sorted(r["kind"] for r in out)
    assert kinds == ["backup_overdue", "credential_rotation", "free_period_ending", "invoice_due", "lead_followup", "ssl_expiry", "stale_repo"]
    assert len({r["dedupe_key"] for r in out}) == len(out)
    assert build_reminders(src, today) == out  # deterministic keys → re-running is idempotent
