"""
security.py — Session signée (JWT HS256 dans un cookie HttpOnly SameSite=Strict),
résolution de l'utilisateur courant et limitation de débit des routes d'authentification.
"""
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, Request, Response, status

from api.config import Settings
from src import database as db

SESSION_COOKIE = "pentascore_session"
ALGORITHM = "HS256"


def issue_session(response: Response, settings: Settings, pme_id: str) -> None:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.token_ttl_minutes)
    token = jwt.encode({"sub": pme_id, "exp": expires}, settings.secret_key, algorithm=ALGORITHM)
    response.set_cookie(
        SESSION_COOKIE, token,
        max_age=settings.token_ttl_minutes * 60,
        httponly=True, secure=settings.cookie_secure, samesite="strict", path="/",
    )


def clear_session(response: Response, settings: Settings) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/", httponly=True, secure=settings.cookie_secure, samesite="strict")


def current_pme(request: Request) -> dict:
    """Dépendance FastAPI : PME authentifiée, sinon 401."""
    settings: Settings = request.app.state.settings
    token = request.cookies.get(SESSION_COOKIE)
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentification requise.")
    if not token:
        raise unauthorized
    try:
        claims = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM], options={"require": ["exp", "sub"]})
    except jwt.PyJWTError:
        raise unauthorized
    pme = db.get_pme_by_id(claims["sub"])
    if pme is None:
        raise unauthorized
    return pme


class RateLimiter:
    """Fenêtre glissante en mémoire, par adresse IP (suffisant pour une instance unique)."""

    def __init__(self, limit: int, window_seconds: int):
        self._limit = limit
        self._window = window_seconds
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def _purge(self, now: float) -> None:
        """Oublie les clients dont la dernière tentative est sortie de la fenêtre (mémoire bornée)."""
        expired = [key for key, hits in self._hits.items() if not hits or now - hits[-1] > self._window]
        for key in expired:
            del self._hits[key]

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            self._purge(now)
            hits = self._hits[key]
            while hits and now - hits[0] > self._window:
                hits.popleft()
            if len(hits) >= self._limit:
                raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Trop de tentatives. Réessayez dans une minute.")
            hits.append(now)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def auth_rate_limit(request: Request) -> None:
    """Dépendance FastAPI : limite les tentatives sur les routes d'authentification."""
    request.app.state.auth_limiter.check(_client_ip(request))


def public_rate_limit(request: Request) -> None:
    """Dépendance FastAPI : borne les calculs coûteux accessibles sans compte (score, PDF)."""
    request.app.state.public_limiter.check(_client_ip(request))
