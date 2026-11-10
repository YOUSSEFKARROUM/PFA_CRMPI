"""
main.py — Fabrique de l'application Pentascore.

Un seul processus sert l'API (/api/*) et le frontend React compilé (frontend/dist),
conformément à l'exigence « application mono-bloc déployable simplement ».

Lancement : uvicorn api.main:app --port 8000
"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from api.catalog import ensure_database
from api.config import Settings, load_settings
from api.routes import accounts, assessment
from api.security import RateLimiter

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": (
        "default-src 'self'; script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "font-src 'self'; img-src 'self' data:; "
        "connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    ),
}
HSTS = "max-age=31536000; includeSubDomains"
STATE_CHANGING_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def _is_foreign_origin(request: Request, allowed_origins: tuple) -> bool:
    """Défense CSRF en complément de SameSite=Strict : l'en-tête Origin doit désigner le site lui-même."""
    origin = request.headers.get("origin")
    if origin is None:
        return False
    own_origin = f"{request.url.scheme}://{request.headers.get('host', '')}"
    return origin != own_origin and origin not in allowed_origins


def _mount_frontend(app: FastAPI, dist: Path) -> None:
    """Sert le build Vite et renvoie index.html pour toute route non-API (SPA)."""
    index = dist / "index.html"
    if not index.is_file():
        return
    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")
    dist_root = dist.resolve()

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(404, "Not Found")
        candidate = (dist / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(dist_root):
            return FileResponse(candidate)
        return FileResponse(index)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        ensure_database()
        yield

    app = FastAPI(title="Pentascore API", version="2.0.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.auth_limiter = RateLimiter(settings.auth_rate_limit, settings.auth_rate_window_seconds)
    app.state.public_limiter = RateLimiter(settings.public_rate_limit, settings.auth_rate_window_seconds)

    if settings.allowed_origins:
        app.add_middleware(
            CORSMiddleware, allow_origins=list(settings.allowed_origins),
            allow_credentials=True, allow_methods=["GET", "POST", "DELETE"], allow_headers=["Content-Type"],
        )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        is_api = request.url.path.startswith("/api/")
        if (is_api and request.method in STATE_CHANGING_METHODS
                and _is_foreign_origin(request, settings.allowed_origins)):
            response = JSONResponse({"detail": "Origine non autorisée."}, status_code=403)
        else:
            response = await call_next(request)
        for name, value in SECURITY_HEADERS.items():
            response.headers.setdefault(name, value)
        if is_api:
            response.headers["Cache-Control"] = "no-store"
        if settings.cookie_secure:
            response.headers.setdefault("Strict-Transport-Security", HSTS)
        return response

    app.include_router(assessment.router)
    app.include_router(accounts.router)
    _mount_frontend(app, settings.frontend_dist)
    return app


app = create_app()
