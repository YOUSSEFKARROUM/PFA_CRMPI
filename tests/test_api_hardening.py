"""Tests de durcissement — issus de la revue de sécurité."""
import sqlite3

import pytest
from fastapi.testclient import TestClient

from api import config
from api.main import create_app
from api.security import RateLimiter
from src import auth
from src import database as db
from tests.conftest import make_settings, register


@pytest.mark.parametrize("env", ["prod", "Production", "staging"])
def test_any_non_development_environment_requires_a_secret(monkeypatch, env):
    monkeypatch.setenv("PENTASCORE_ENV", env)
    monkeypatch.delenv("PENTASCORE_SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError):
        config.load_settings()


@pytest.mark.parametrize("env", ["development", "test"])
def test_development_environments_generate_an_ephemeral_secret(monkeypatch, env):
    monkeypatch.setenv("PENTASCORE_ENV", env)
    monkeypatch.delenv("PENTASCORE_SECRET_KEY", raising=False)
    settings = config.load_settings()
    assert len(settings.secret_key) >= config.MIN_SECRET_LENGTH
    assert settings.cookie_secure is False


def test_production_enables_secure_cookies(monkeypatch):
    monkeypatch.setenv("PENTASCORE_ENV", "production")
    monkeypatch.setenv("PENTASCORE_SECRET_KEY", "x" * 40)
    assert config.load_settings().cookie_secure is True


def test_pdf_generation_is_rate_limited(api_db, tmp_path, all_answers):
    with TestClient(create_app(make_settings(tmp_path, public_rate_limit=2))) as limited:
        statuses = [
            limited.post("/api/assessments/report", json={"responses": all_answers}).status_code for _ in range(3)
        ]
    assert statuses == [200, 200, 429]


def test_cross_origin_state_change_is_rejected(client):
    response = client.post("/api/auth/logout", headers={"Origin": "https://evil.example"})
    assert response.status_code == 403


def test_same_origin_state_change_is_accepted(client):
    response = client.post("/api/auth/logout", headers={"Origin": "http://testserver"})
    assert response.status_code == 204


def test_api_responses_are_not_cached(client):
    register(client)
    assert client.get("/api/auth/me").headers["cache-control"] == "no-store"


def test_concurrent_duplicate_registration_returns_conflict_not_500(client, monkeypatch):
    register(client)
    client.post("/api/auth/logout")
    monkeypatch.setattr(db, "get_pme_by_email", lambda email: None)
    assert register(client).status_code == 409


def test_create_pme_duplicate_raises_integrity_error(api_db):
    db.init_database()
    db.create_pme("dup@pme.ma", "hash", "PME")
    with pytest.raises(sqlite3.IntegrityError):
        db.create_pme("dup@pme.ma", "hash", "PME")


def test_login_with_unknown_email_still_runs_bcrypt(api_db, monkeypatch):
    db.init_database()
    calls = []
    monkeypatch.setattr(auth, "verify_password", lambda password, hashed: calls.append(hashed) or False)
    assert auth.login_pme("inconnu@pme.ma", "motdepasse123")["success"] is False
    assert len(calls) == 1


def test_rate_limiter_forgets_expired_clients(monkeypatch):
    clock = iter([0.0, 0.0, 120.0])
    monkeypatch.setattr("api.security.time.monotonic", lambda: next(clock))
    limiter = RateLimiter(limit=1, window_seconds=60)
    limiter.check("1.1.1.1")
    limiter.check("2.2.2.2")
    limiter.check("2.2.2.2")
    assert "1.1.1.1" not in limiter._hits


def test_base_url_defaults_to_the_local_server(monkeypatch):
    monkeypatch.delenv("PENTASCORE_BASE_URL", raising=False)
    assert config.load_settings().public_base_url == "http://localhost:8000"


def test_base_url_is_read_from_the_environment_without_trailing_slash(monkeypatch):
    monkeypatch.setenv("PENTASCORE_BASE_URL", "https://pentascore.cmrpi.ma/ ")
    assert config.load_settings().public_base_url == "https://pentascore.cmrpi.ma"


@pytest.mark.parametrize("url", [
    "javascript:alert(1)", "ftp://exemple.ma", "pentascore.ma", "https://", "https://user:pass@exemple.ma",
    "https://exemple.ma/?next=evil",
])
def test_base_url_rejects_unsafe_or_malformed_values(monkeypatch, url):
    monkeypatch.setenv("PENTASCORE_BASE_URL", url)
    with pytest.raises(RuntimeError, match="PENTASCORE_BASE_URL"):
        config.load_settings()
