"""
auth.py — Authentification des utilisateurs PME (bcrypt).

Conformité loi 09-08 : l'inscription exige un consentement explicite, horodaté
en base ; le compte et toutes ses données peuvent être supprimés à la demande.
Le journal d'actions ne contient jamais l'adresse email en clair.
"""
import re
import sqlite3
from datetime import datetime, timezone

import bcrypt

from src import database as db

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72  # limite de bcrypt : au-delà, les octets sont ignorés
DUPLICATE_EMAIL_ERROR = "Un compte existe déjà avec cet email."
LOGIN_ERROR = "Email ou mot de passe incorrect."
# Empreinte de référence : un email inconnu coûte le même calcul bcrypt qu'un email connu,
# pour ne pas révéler l'existence d'un compte par le temps de réponse.
_TIMING_REFERENCE_HASH = bcrypt.hashpw(b"pentascore-timing-reference", bcrypt.gensalt()).decode("utf-8")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def _failure(error: str) -> dict:
    return {"success": False, "pme_id": None, "error": error}


def _validate_registration(email: str, password: str, name: str, consent: bool) -> str | None:
    """Retourne le message d'erreur à afficher, ou None si la demande est valide."""
    if not EMAIL_REGEX.match(email):
        return "Adresse email invalide."
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Le mot de passe doit contenir au moins {MIN_PASSWORD_LENGTH} caractères."
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        return f"Le mot de passe ne doit pas dépasser {MAX_PASSWORD_BYTES} octets."
    if not name or len(name.strip()) < 2:
        return "Nom de l'organisation requis."
    if not consent:
        return "Le consentement au traitement des données (loi 09-08) est obligatoire."
    if db.get_pme_by_email(email):
        return DUPLICATE_EMAIL_ERROR
    return None


def register_pme(email: str, password: str, name: str, sector: str = None, *, consent: bool = False) -> dict:
    """
    Inscrit une nouvelle PME. `consent` doit être True (case cochée par l'utilisateur).
    Returns: {"success": bool, "pme_id": str|None, "error": str|None}
    """
    email = email.strip().lower()
    error = _validate_registration(email, password, name, consent)
    if error:
        return _failure(error)

    consent_at = datetime.now(timezone.utc).isoformat()
    try:
        pme_id = db.create_pme(email, hash_password(password), name.strip(), sector, consent_at=consent_at)
    except sqlite3.IntegrityError:
        return _failure(DUPLICATE_EMAIL_ERROR)  # inscription concurrente avec le même email
    db.log_action(pme_id, "register", "Compte créé avec consentement explicite (loi 09-08)")
    return {"success": True, "pme_id": pme_id, "error": None}


def login_pme(email: str, password: str) -> dict:
    """
    Authentifie une PME.
    Returns: {"success": bool, "pme_id": str|None, "name": str|None, "error": str|None}
    """
    email = email.strip().lower()
    pme = db.get_pme_by_email(email)
    password_ok = verify_password(password, pme["password_hash"] if pme else _TIMING_REFERENCE_HASH)
    if not pme or not password_ok:
        return {"success": False, "pme_id": None, "name": None, "error": LOGIN_ERROR}

    db.log_action(pme["id"], "login", "Connexion réussie")
    return {"success": True, "pme_id": pme["id"], "name": pme["name"], "error": None}


def delete_account(pme_id: str) -> bool:
    """Supprime définitivement le compte et toutes les données associées."""
    return db.delete_pme(pme_id)
