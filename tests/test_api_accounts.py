"""Tests d'intégration — comptes (consentement 09-08), session et historique."""
from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

from api.main import create_app
from api.security import SESSION_COOKIE
from tests.conftest import TEST_SECRET, make_settings, register


def test_register_requires_explicit_consent(client):
    response = register(client, consent=False)

    assert response.status_code == 400
    assert "consentement" in response.json()["detail"].lower()
    assert SESSION_COOKIE not in response.cookies


def test_register_opens_an_httponly_session(client):
    response = register(client)

    assert response.status_code == 201
    assert response.json()["organization"] == "PME Exemple"
    set_cookie = response.headers["set-cookie"].lower()
    assert "httponly" in set_cookie and "samesite=strict" in set_cookie


def test_me_never_exposes_password_hash(client):
    register(client)
    body = client.get("/api/auth/me").json()

    assert body["email"] == "pme@exemple.ma"
    assert body["consent_at"]
    assert "password_hash" not in body and "password" not in str(body).lower()


def test_duplicate_email_is_conflict(client):
    register(client)
    client.post("/api/auth/logout")
    assert register(client).status_code == 409


def test_login_logout_cycle(client):
    register(client)
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401

    credentials = {"email": "PME@exemple.ma", "password": "motdepasse123"}
    assert client.post("/api/auth/login", json=credentials).status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_login_with_wrong_password_is_generic_401(client):
    register(client)
    response = client.post("/api/auth/login", json={"email": "pme@exemple.ma", "password": "mauvais-mdp"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Email ou mot de passe incorrect."


def test_tampered_session_is_rejected(client):
    register(client)
    client.cookies.set(SESSION_COOKIE, client.cookies.get(SESSION_COOKIE) + "x")
    assert client.get("/api/auth/me").status_code == 401


def test_expired_session_is_rejected(client):
    register(client)
    pme_id = client.get("/api/auth/me").json()["id"]
    expired = jwt.encode(
        {"sub": pme_id, "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        TEST_SECRET, algorithm="HS256",
    )
    client.cookies.set(SESSION_COOKIE, expired)
    assert client.get("/api/auth/me").status_code == 401


def test_delete_account_erases_data_and_session(client, all_answers):
    register(client)
    client.post("/api/assessments", json={"responses": all_answers})

    assert client.delete("/api/auth/me").status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    credentials = {"email": "pme@exemple.ma", "password": "motdepasse123"}
    assert client.post("/api/auth/login", json=credentials).status_code == 401


def test_saving_an_assessment_requires_login(client, all_answers):
    assert client.post("/api/assessments", json={"responses": all_answers}).status_code == 401
    assert client.get("/api/assessments").status_code == 401


def test_history_records_server_computed_scores(client, all_answers):
    register(client)
    saved = client.post("/api/assessments", json={"responses": all_answers})
    history = client.get("/api/assessments").json()

    assert saved.status_code == 201
    assert len(history) == 1
    assert history[0]["global_score"] == 50.0
    assert history[0]["maturity_level"] == "Moyen"
    assert [d["score"] for d in history[0]["domains"]] == [50.0] * 5


def test_history_is_isolated_between_accounts(client, all_answers):
    register(client, email="a@pme.ma")
    client.post("/api/assessments", json={"responses": all_answers})
    client.post("/api/auth/logout")

    register(client, email="b@pme.ma")
    assert client.get("/api/assessments").json() == []


def test_auth_endpoints_are_rate_limited(api_db, tmp_path):
    app = create_app(make_settings(tmp_path, auth_rate_limit=3))
    with TestClient(app) as limited:
        statuses = [
            limited.post("/api/auth/login", json={"email": "x@pme.ma", "password": "motdepasse123"}).status_code
            for _ in range(4)
        ]
    assert statuses == [401, 401, 401, 429]


def test_frontend_build_is_served_with_spa_fallback(api_db, tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>Pentascore</title>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log('ok')", encoding="utf-8")

    with TestClient(create_app(make_settings(tmp_path, frontend_dist=dist))) as spa:
        assert "Pentascore" in spa.get("/").text
        assert "Pentascore" in spa.get("/resultats").text
        assert spa.get("/assets/app.js").status_code == 200
        assert spa.get("/api/nope").status_code == 404
