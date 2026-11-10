"""
config.py — Configuration de l'API, lue depuis l'environnement.

Variables :
- PENTASCORE_SECRET_KEY : clé de signature des sessions (obligatoire en production)
- PENTASCORE_ENV        : toute valeur autre que "development"/"test" est traitée comme production
                          (clé secrète obligatoire, cookies Secure, HSTS)
- PENTASCORE_ORIGINS    : origines CORS autorisées, séparées par des virgules (dev Vite)
- PENTASCORE_BASE_URL   : adresse publique de l'application, encodée dans le QR code du rapport
                          (défaut http://localhost:8000 ; http/https uniquement)
"""
import logging
import os
import secrets
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

logger = logging.getLogger("pentascore")

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
MIN_SECRET_LENGTH = 32
DEVELOPMENT_ENVIRONMENTS = frozenset({"development", "test"})
DEFAULT_BASE_URL = "http://localhost:8000"


@dataclass(frozen=True)
class Settings:
    secret_key: str
    token_ttl_minutes: int
    cookie_secure: bool
    frontend_dist: Path
    allowed_origins: tuple
    auth_rate_limit: int
    auth_rate_window_seconds: int
    public_rate_limit: int
    public_base_url: str = DEFAULT_BASE_URL


def validate_base_url(raw: str) -> str:
    """URL http(s) absolue, sans identifiants ni paramètres : elle est imprimée dans un QR code."""
    url = raw.strip().rstrip("/")
    parts = urlsplit(url)
    if (parts.scheme not in ("http", "https") or not parts.hostname
            or parts.username or parts.password or parts.query or parts.fragment):
        raise RuntimeError(f"PENTASCORE_BASE_URL invalide : {raw!r} (attendu : http(s)://hôte[:port][/chemin]).")
    return url


def load_settings() -> Settings:
    environment = os.environ.get("PENTASCORE_ENV", "development").strip().lower()
    is_production = environment not in DEVELOPMENT_ENVIRONMENTS
    secret_key = os.environ.get("PENTASCORE_SECRET_KEY", "")

    if len(secret_key) < MIN_SECRET_LENGTH:
        if is_production:
            raise RuntimeError(
                f"PENTASCORE_SECRET_KEY doit être définie (au moins {MIN_SECRET_LENGTH} caractères) en production."
            )
        secret_key = secrets.token_urlsafe(48)
        logger.warning("PENTASCORE_SECRET_KEY absente : clé éphémère générée (sessions perdues au redémarrage).")

    origins = tuple(o.strip() for o in os.environ.get("PENTASCORE_ORIGINS", "").split(",") if o.strip())
    return Settings(
        secret_key=secret_key,
        token_ttl_minutes=int(os.environ.get("PENTASCORE_SESSION_MINUTES", "480")),
        cookie_secure=is_production,
        frontend_dist=DEFAULT_FRONTEND_DIST,
        allowed_origins=origins,
        auth_rate_limit=int(os.environ.get("PENTASCORE_AUTH_RATE_LIMIT", "10")),
        auth_rate_window_seconds=60,
        public_rate_limit=int(os.environ.get("PENTASCORE_PUBLIC_RATE_LIMIT", "60")),
        public_base_url=validate_base_url(os.environ.get("PENTASCORE_BASE_URL", DEFAULT_BASE_URL)),
    )
