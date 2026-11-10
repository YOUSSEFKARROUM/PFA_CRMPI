"""Fixtures partagées pour les tests de l'API Pentascore."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api.config import Settings  # noqa: E402
from api.main import create_app  # noqa: E402
from src import database as db  # noqa: E402
from src import questionnaire as qmod  # noqa: E402


TEST_SECRET = "test-secret-key-with-enough-entropy-0123456789"


def make_settings(tmp_path: Path, **overrides) -> Settings:
    values = {
        "secret_key": TEST_SECRET,
        "token_ttl_minutes": 60,
        "cookie_secure": False,
        "frontend_dist": tmp_path / "no-frontend-build",
        "allowed_origins": (),
        "auth_rate_limit": 50,
        "auth_rate_window_seconds": 60,
        "public_rate_limit": 500,
    }
    values.update(overrides)
    return Settings(**values)


@pytest.fixture
def api_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "api_test.db")
    yield


@pytest.fixture
def client(api_db, tmp_path):
    from fastapi.testclient import TestClient
    with TestClient(create_app(make_settings(tmp_path))) as test_client:
        yield test_client


@pytest.fixture
def all_answers():
    """Réponses complètes (valeur 3 partout) aux 25 questions réelles."""
    return {q["id"]: 3 for q in qmod.load_questions("fr")}


def register(client, email="pme@exemple.ma", password="motdepasse123", consent=True):
    return client.post("/api/auth/register", json={
        "email": email, "password": password, "organization": "PME Exemple",
        "sector": "Finance", "consent": consent,
    })
