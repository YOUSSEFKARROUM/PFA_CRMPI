"""Routes publiques : questionnaire, profils de démonstration, scoring, exports PDF et badge."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from api import catalog, services
from api.schemas import ReportIn, ResponsesIn
from api.security import public_rate_limit
from src import database as db

router = APIRouter(prefix="/api", tags=["assessment"])


def _evaluate_or_422(responses: dict) -> services.Evaluation:
    try:
        return services.evaluate(responses)
    except services.InvalidResponses as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/questionnaire")
def get_questionnaire() -> dict:
    return {**catalog.questionnaire(), "recommendation_count": db.count_recommendations()}


@router.get("/profiles/demo")
def get_demo_profiles() -> list:
    profiles = []
    for profile in catalog.demo_profiles():
        evaluation = _evaluate_or_422(profile["responses"])
        profiles.append({
            **profile,
            "global_score": evaluation.global_score,
            "maturity_level": evaluation.maturity_level,
        })
    return profiles


@router.post("/assessments/score", dependencies=[Depends(public_rate_limit)])
def score(payload: ResponsesIn) -> dict:
    return services.evaluation_payload(_evaluate_or_422(payload.responses))


@router.post("/assessments/report", dependencies=[Depends(public_rate_limit)])
def report(payload: ReportIn, request: Request) -> Response:
    _evaluate_or_422(payload.responses)
    revisit_url = request.app.state.settings.public_base_url
    pdf = services.build_report(payload.responses, payload.organization, payload.sector, revisit_url)
    return _pdf_response(pdf, f"rapport_pentascore_{datetime.now():%Y%m%d}.pdf")


@router.post("/assessments/badge", dependencies=[Depends(public_rate_limit)])
def badge(payload: ReportIn) -> Response:
    """Badge PNG partageable (1200 × 1200), généré localement."""
    _evaluate_or_422(payload.responses)
    png = services.build_badge(payload.responses, payload.organization)
    return Response(
        content=png,
        media_type="image/png",
        headers={"Content-Disposition": 'attachment; filename="badge_pentascore.png"'},
    )


@router.post("/assessments/job-description", dependencies=[Depends(public_rate_limit)])
def job_description(payload: ResponsesIn) -> Response:
    """Modèle de fiche de poste RSSI, proposé uniquement si la gouvernance est faible (< 50)."""
    _evaluate_or_422(payload.responses)
    pdf = services.build_job_description(payload.responses)
    if pdf is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Le domaine Gouvernance n'est pas faible : aucun modèle proposé.")
    return _pdf_response(pdf, "fiche_poste_rssi_pentascore.pdf")


def _pdf_response(pdf: bytes, filename: str) -> Response:
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
