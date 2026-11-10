"""Tests unitaires — authentification."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from src import auth, database as db


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    """Utilise une base de données temporaire pour chaque test."""
    test_db_path = tmp_path / "test_app.db"
    monkeypatch.setattr(db, "DB_PATH", test_db_path)
    db.init_database()
    yield


def test_password_hash_and_verify():
    hashed = auth.hash_password("MonMotDePasse123")
    assert auth.verify_password("MonMotDePasse123", hashed) is True
    assert auth.verify_password("mauvais_mdp", hashed) is False


def test_register_success():
    result = auth.register_pme("test@pme.ma", "password123", "Ma PME Test", "Finance", consent=True)
    assert result["success"] is True
    assert result["pme_id"] is not None


def test_register_invalid_email():
    result = auth.register_pme("email_invalide", "password123", "Ma PME", consent=True)
    assert result["success"] is False
    assert "email" in result["error"].lower()


def test_register_short_password():
    result = auth.register_pme("test2@pme.ma", "short", "Ma PME", consent=True)
    assert result["success"] is False
    assert "mot de passe" in result["error"].lower()


def test_register_duplicate_email():
    auth.register_pme("dup@pme.ma", "password123", "PME A", consent=True)
    result = auth.register_pme("dup@pme.ma", "password456", "PME B", consent=True)
    assert result["success"] is False
    assert "existe" in result["error"].lower()


def test_login_success():
    auth.register_pme("login@pme.ma", "password123", "PME Login", consent=True)
    result = auth.login_pme("login@pme.ma", "password123")
    assert result["success"] is True
    assert result["name"] == "PME Login"


def test_login_wrong_password():
    auth.register_pme("login2@pme.ma", "password123", "PME Login2", consent=True)
    result = auth.login_pme("login2@pme.ma", "wrong_password")
    assert result["success"] is False


def test_login_nonexistent_user():
    result = auth.login_pme("inexistant@pme.ma", "password123")
    assert result["success"] is False


def test_register_refused_without_consent():
    result = auth.register_pme("noconsent@pme.ma", "password123", "PME Sans Consentement")
    assert result["success"] is False
    assert "consentement" in result["error"].lower()
    assert db.get_pme_by_email("noconsent@pme.ma") is None


def test_register_stores_consent_timestamp():
    result = auth.register_pme("consent@pme.ma", "password123", "PME Consentante", consent=True)
    pme = db.get_pme_by_id(result["pme_id"])
    assert pme["consent_at"] is not None


def test_register_does_not_log_email_in_clear():
    result = auth.register_pme("private@pme.ma", "password123", "PME Privée", consent=True)
    with db.get_connection() as conn:
        details = [r["details"] for r in conn.execute(
            "SELECT details FROM audit_log WHERE pme_id = ?", (result["pme_id"],))]
    assert details and all("private@pme.ma" not in (d or "") for d in details)


def test_delete_account_removes_all_data():
    result = auth.register_pme("delete@pme.ma", "password123", "PME Supprimée", consent=True)
    pme_id = result["pme_id"]
    audit_id = db.create_audit(pme_id)
    db.complete_audit(audit_id, 50.0)

    assert auth.delete_account(pme_id) is True

    assert db.get_pme_by_id(pme_id) is None
    assert db.get_audit_history(pme_id) == []
    with db.get_connection() as conn:
        assert conn.execute("SELECT COUNT(*) FROM audit_log WHERE pme_id = ?", (pme_id,)).fetchone()[0] == 0


def test_delete_unknown_account_returns_false():
    assert auth.delete_account("does-not-exist") is False
