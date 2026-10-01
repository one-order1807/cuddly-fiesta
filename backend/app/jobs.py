"""Daily reminder generation. Idempotent: every reminder has a dedupe_key, so re-running never duplicates rows."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from .repo import Repo

log = logging.getLogger("jobs")


def _d(v: str | None) -> date | None:
    if not v:
        return None
    try:
        return datetime.fromisoformat(v.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def build_reminders(src: dict[str, list[dict]], today: date) -> list[dict]:
    name = {c["id"]: c["business_name"] for c in src["clients"]}
    out: list[dict] = []

    def add(kind: str, key: str, title: str, due: date, entity: str | None = None, entity_id: str | None = None, body: str | None = None):
        out.append({"kind": kind, "dedupe_key": key, "title": title, "body": body, "entity": entity, "entity_id": entity_id,
                    "due_at": datetime.combine(due, datetime.min.time(), tzinfo=timezone.utc).isoformat()})

    for s in src["subscriptions"]:
        end, who = _d(s.get("free_period_end")), name.get(s["client_id"], "A client")
        if end:
            left = (end - today).days
            for mark in (30, 7, 1):
                if 0 <= left <= mark:
                    add("free_period_ending", f"free:{s['client_id']}:{end}:{mark}", f"{who}: free period ends in {left} day(s)", end, "clients", s["client_id"])
                    break
        nb = _d(s.get("next_billing_date"))
        if nb and s.get("renewal_reminder", True) and 0 <= (nb - today).days <= 7:
            add("renewal_due", f"renew:{s['client_id']}:{nb}", f"{who}: renewal due {nb}", nb, "clients", s["client_id"])
    for b in src["backups"]:
        nxt = _d(b.get("next_backup_at"))
        if b.get("status") in ("overdue", "failed") or (nxt and nxt < today - timedelta(days=1)):
            add("backup_overdue", f"backup:{b['id']}:{today}", f"{name.get(b['client_id'], 'A client')}: backup overdue", today, "backups", b["id"])
    for dep in src["deployments"]:
        exp = _d(dep.get("ssl_expires_on"))
        if exp and (exp - today).days <= 30:
            add("ssl_expiry", f"ssl:{dep['id']}:{exp}", f"{name.get(dep.get('client_id'), 'A client')}: SSL for {dep.get('domain') or 'site'} expires {exp}", exp, "deployments", dep["id"])
    for r in src["repos"]:
        last = _d(r.get("last_commit_at"))
        if last and (today - last).days > 30:
            add("stale_repo", f"stale:{r['id']}:{today.isocalendar()[:2]}", f"{r.get('repo_name') or 'Repo'} has had no commits for {(today - last).days} days", today, "repos", r["id"])
    for c in src["credentials"]:
        changed = _d(c.get("last_changed_at"))
        if changed and (today - changed).days >= c.get("rotation_days", 90):
            add("credential_rotation", f"rotate:{c['id']}:{changed}", f"Rotate credential “{c['label']}” ({name.get(c.get('client_id'), 'internal')})", today, "credentials", c["id"])
    for l in src["leads"]:
        fu = _d(l.get("follow_up_at"))
        if fu and fu <= today and l.get("status") not in ("won", "lost"):
            add("lead_followup", f"lead:{l['id']}:{fu}", f"Follow up with {l['name']} ({l.get('phone')})", fu, "leads", l["id"])
    for i in src["invoices"]:
        due = _d(i.get("due_date"))
        if due and due < today and i.get("status") in ("sent", "overdue"):
            add("invoice_due", f"inv:{i['id']}:{today.isocalendar()[:2]}", f"{name.get(i['client_id'], 'A client')}: invoice {i['number']} is overdue", due, "invoices", i["id"])
    return out


def run_daily(repo: Repo, today: date | None = None) -> int:
    rows = build_reminders(repo.reminder_sources(), today or date.today())
    for r in rows:
        repo.upsert_reminder(r)
    log.info("daily reminders processed: %d", len(rows))
    return len(rows)
