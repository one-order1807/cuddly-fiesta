import uuid

from .conftest import MANAGER, OUTSIDER, OWNER, SUPPORT, auth, token

NEW = {"label": "Client POS login", "username": "owner@cafe", "secret": "hunter2-very-secret", "rotation_days": 90}


def create(client, who=OWNER, **over):
    return client.post("/vault", json={**NEW, **over}, headers=auth(who))


def test_requires_token(client):
    assert client.get("/vault").status_code == 401
    assert client.get("/vault", headers={"Authorization": "Bearer nonsense"}).status_code == 401


def test_expired_and_forged_tokens_rejected(client):
    assert client.get("/vault", headers={"Authorization": f"Bearer {token(OWNER, exp_in=-10)}"}).status_code == 401
    assert client.get("/vault", headers={"Authorization": f"Bearer {token(OWNER, secret='x' * 40)}"}).status_code == 401


def test_authenticated_but_not_admin_is_forbidden(client):
    assert client.get("/vault", headers=auth(OUTSIDER)).status_code == 403


def test_create_encrypts_and_never_echoes_secret(client, repo):
    r = create(client)
    assert r.status_code == 201
    assert "secret" not in r.text and "hunter2" not in r.text and "ciphertext" not in r.text
    stored = next(iter(repo.creds.values()))
    assert "hunter2" not in str(stored)
    assert stored["secret_ciphertext"].startswith("\\x") and stored["secret_nonce"].startswith("\\x")


def test_list_never_returns_secret_material(client):
    create(client)
    r = client.get("/vault", headers=auth(SUPPORT))  # support may see the login id…
    assert r.status_code == 200
    body = r.text
    assert "owner@cafe" in body
    assert "hunter2" not in body and "ciphertext" not in body and "nonce" not in body  # …but never secrets


def test_support_cannot_create(client):
    assert create(client, who=SUPPORT).status_code == 403


def test_reveal_happy_path_and_audit_without_secret(client, repo):
    cid = create(client).json()["id"]
    r = client.post(f"/vault/{cid}/reveal", json={"password": "correct horse"}, headers=auth(MANAGER))
    assert r.status_code == 200
    assert r.json() == {"secret": "hunter2-very-secret", "expires_in": 20}
    assert r.headers["cache-control"] == "no-store"
    reveal = [a for a in repo.audits if a["action"] == "vault_reveal"]
    assert len(reveal) == 1 and reveal[0]["entity_id"] == cid
    assert "hunter2" not in str(repo.audits)


def test_reveal_requires_correct_password(client, repo):
    cid = create(client).json()["id"]
    r = client.post(f"/vault/{cid}/reveal", json={"password": "wrong"}, headers=auth(OWNER))
    assert r.status_code == 401 and "hunter2" not in r.text
    assert any(a["action"] == "vault_reveal_bad_password" for a in repo.audits)


def test_support_cannot_reveal_even_with_correct_password(client, repo):
    cid = create(client).json()["id"]
    r = client.post(f"/vault/{cid}/reveal", json={"password": "correct horse"}, headers=auth(SUPPORT))
    assert r.status_code == 403
    assert any(a["action"] == "vault_reveal_denied" for a in repo.audits)


def test_reveal_is_rate_limited(client):
    cid = create(client).json()["id"]
    codes = [client.post(f"/vault/{cid}/reveal", json={"password": "nope"}, headers=auth(OWNER)).status_code for _ in range(8)]
    assert codes[:6] == [401] * 6 and codes[6:] == [429, 429]


def test_reveal_unknown_credential_404(client):
    r = client.post(f"/vault/{uuid.uuid4()}/reveal", json={"password": "correct horse"}, headers=auth(OWNER))
    assert r.status_code == 404


def test_ciphertext_swapped_onto_another_row_cannot_be_revealed(client, repo):
    a = create(client, label="A", secret="secret-A").json()["id"]
    b = create(client, label="B", secret="secret-B").json()["id"]
    repo.creds[b]["secret_ciphertext"] = repo.creds[a]["secret_ciphertext"]
    repo.creds[b]["secret_nonce"] = repo.creds[a]["secret_nonce"]
    r = client.post(f"/vault/{b}/reveal", json={"password": "correct horse"}, headers=auth(OWNER))
    assert r.status_code == 500 and "secret-A" not in r.text


def test_update_secret_rotates_and_records_change(client, repo):
    cid = create(client).json()["id"]
    before = repo.creds[cid]["last_changed_at"]
    r = client.patch(f"/vault/{cid}", json={"secret": "new-secret"}, headers=auth(OWNER))
    assert r.status_code == 200 and "new-secret" not in r.text
    assert repo.creds[cid]["last_changed_at"] != before
    rv = client.post(f"/vault/{cid}/reveal", json={"password": "correct horse"}, headers=auth(OWNER))
    assert rv.json()["secret"] == "new-secret"


def test_delete(client, repo):
    cid = create(client).json()["id"]
    assert client.delete(f"/vault/{cid}", headers=auth(OWNER)).status_code == 204
    assert cid not in repo.creds


def test_input_validation(client):
    assert create(client, secret="").status_code == 422
    assert create(client, label="").status_code == 422
    assert create(client, rotation_days=0).status_code == 422
