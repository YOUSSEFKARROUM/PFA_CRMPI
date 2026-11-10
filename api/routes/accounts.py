"""Routes de compte (loi 09-08 : consentement explicite, suppression) et historique des évaluations."""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from api import services
from api.routes.assessment import _evaluate_or_422
from api.schemas import LoginIn, RegisterIn, ResponsesIn
from api.security import auth_rate_limit, clear_session, current_pme, issue_session
from src import auth
from src import database as db

router = APIRouter(prefix="/api", tags=["accounts"])


def _public_account(pme: dict) -> dict:
    return {
        "id": pme["id"],
        "email": pme["email"],
        "organization": pme["name"],
        "sector": pme["sector"],
        "consent_at": pme["consent_at"],
        "created_at": pme["created_at"],
    }


@router.post("/auth/register", status_code=status.HTTP_201_CREATED, dependencies=[Depends(auth_rate_limit)])
def register(payload: RegisterIn, request: Request, response: Response) -> dict:
    result = auth.register_pme(
        payload.email, payload.password, payload.organization, payload.sector, consent=payload.consent
    )
    if not result["success"]:
        is_duplicate = result["error"] == auth.DUPLICATE_EMAIL_ERROR
        code = status.HTTP_409_CONFLICT if is_duplicate else status.HTTP_400_BAD_REQUEST
        raise HTTPException(code, result["error"])
    issue_session(response, request.app.state.settings, result["pme_id"])
    return _public_account(db.get_pme_by_id(result["pme_id"]))


@router.post("/auth/login", dependencies=[Depends(auth_rate_limit)])
def login(payload: LoginIn, request: Request, response: Response) -> dict:
    result = auth.login_pme(payload.email, payload.password)
    if not result["success"]:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, result["error"])
    issue_session(response, request.app.state.settings, result["pme_id"])
    return _public_account(db.get_pme_by_id(result["pme_id"]))


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response) -> None:
    clear_session(response, request.app.state.settings)


@router.get("/auth/me")
def me(pme: dict = Depends(current_pme)) -> dict:
    return _public_account(pme)


@router.delete("/auth/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(request: Request, response: Response, pme: dict = Depends(current_pme)) -> None:
    auth.delete_account(pme["id"])
    clear_session(response, request.app.state.settings)


@router.post("/assessments", status_code=status.HTTP_201_CREATED)
def save_assessment(payload: ResponsesIn, pme: dict = Depends(current_pme)) -> dict:
    _evaluate_or_422(payload.responses)
    return services.save_assessment(pme["id"], payload.responses)


@router.get("/assessments")
def list_assessments(pme: dict = Depends(current_pme)) -> list:
    return services.history(pme["id"])
