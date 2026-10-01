"""Refreshes repo metadata (branch, visibility, last commit, CI) from the GitHub API. The token lives in env only."""

from __future__ import annotations

import re
import uuid
from concurrent.futures import ThreadPoolExecutor

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth import Admin, require_writer
from ..config import Settings, get_settings
from ..repo import Repo, get_repo, now_iso

router = APIRouter(prefix="/github", tags=["github"])
_URL = re.compile(r"github\.com[/:]([\w.-]+)/([\w.-]+?)(?:\.git)?/?$")


class SyncIn(BaseModel):
    repo_id: uuid.UUID | None = None  # omit to sync everything


def parse_repo(url: str) -> tuple[str, str] | None:
    m = _URL.search(url.strip())
    return (m[1], m[2]) if m else None


def _ci_state(runs: list[dict]) -> str:
    if not runs:
        return "unknown"
    concl = {r.get("conclusion") for r in runs}
    if concl & {"failure", "timed_out", "cancelled", "action_required"}:
        return "failing"
    return "passing" if concl <= {"success", "neutral", "skipped"} else "unknown"


def fetch_repo(client: httpx.Client, owner: str, name: str) -> dict:
    meta = client.get(f"/repos/{owner}/{name}")
    meta.raise_for_status()
    m = meta.json()
    patch = {"default_branch": m.get("default_branch"), "visibility": "private" if m.get("private") else "public", "synced_at": now_iso()}
    commit = client.get(f"/repos/{owner}/{name}/commits", params={"per_page": 1, "sha": m.get("default_branch")})
    if commit.status_code == 200 and commit.json():
        c = commit.json()[0]
        patch.update({"last_commit_sha": c["sha"], "last_commit_message": (c["commit"]["message"] or "").split("\n")[0][:300], "last_commit_at": c["commit"]["committer"]["date"]})
        checks = client.get(f"/repos/{owner}/{name}/commits/{c['sha']}/check-runs")
        patch["ci_status"] = _ci_state(checks.json().get("check_runs", [])) if checks.status_code == 200 else "unknown"
    return patch


@router.post("/sync")
def sync(body: SyncIn, _: Admin = Depends(require_writer), repo: Repo = Depends(get_repo), settings: Settings = Depends(get_settings)):
    if not settings.github_token:
        raise HTTPException(503, "GITHUB_TOKEN is not configured on the server")
    rows = repo.list_repos(str(body.repo_id) if body.repo_id else None)
    headers = {"Authorization": f"Bearer {settings.github_token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}

    def one(row: dict) -> dict:
        parsed = parse_repo(row["github_url"])
        if not parsed:
            return {"id": row["id"], "ok": False, "error": "unrecognised GitHub URL"}
        try:
            with httpx.Client(base_url="https://api.github.com", headers=headers, timeout=15) as c:
                patch = fetch_repo(c, *parsed)
            repo.update_repo(row["id"], patch | {"repo_name": row.get("repo_name") or parsed[1]})
            return {"id": row["id"], "ok": True}
        except httpx.HTTPStatusError as e:
            return {"id": row["id"], "ok": False, "error": f"GitHub returned {e.response.status_code}"}
        except httpx.HTTPError:
            return {"id": row["id"], "ok": False, "error": "network error"}

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(one, rows))
    return {"synced": sum(r["ok"] for r in results), "failed": [r for r in results if not r["ok"]]}
