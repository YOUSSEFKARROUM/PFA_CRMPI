"""
services.py — Orchestration du métier existant (src/) pour l'API.

Le calcul reste exclusivement dans src/scoring.py : le frontend n'en duplique
aucune règle, et le serveur recalcule toujours à partir des réponses brutes.
"""
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime

from api import catalog
from src import database as db
from src import badge_generator, consistency_checker, pdf_generator, scoring, templates
from src import questionnaire as qmod

RECOMMENDATION_LIMIT = 3
SCORE_DRIVER_LIMIT = 5
QUESTIONNAIRE_VERSION = "1.0"
ALL_SEVERITIES = ["Critical", "High", "Medium", "Low"]
DEFAULT_ORGANIZATION = "Votre organisation"


class InvalidResponses(ValueError):
    """Les réponses ne couvrent pas exactement les 25 questions avec une valeur 1-5."""


@dataclass(frozen=True)
class Evaluation:
    domain_scores: dict
    global_score: float
    maturity_level: str
    recommendations: list
    consistency: tuple = ()
    contributions: tuple = ()


def validate(responses: dict) -> None:
    expected = list(catalog.question_domain_map().keys())
    unknown = sorted(set(responses) - set(expected))
    if unknown:
        raise InvalidResponses(f"Questions inconnues : {', '.join(unknown)}")
    is_valid, missing = qmod.validate_responses(responses, expected)
    if not is_valid:
        raise InvalidResponses(f"Réponses manquantes ou invalides : {', '.join(missing)}")


def evaluate(responses: dict) -> Evaluation:
    validate(responses)
    grouped = scoring.group_responses_by_domain(responses, catalog.question_domain_map())
    result = scoring.score_full_audit(grouped)
    ordered_scores = {d: result["domain_scores"][d] for d in scoring.DOMAIN_ORDER}
    selected = scoring.generate_top_recommendations(
        ordered_scores, db.get_recommendations_for_domain, limit=RECOMMENDATION_LIMIT, responses=responses
    )
    recommendations = [{**r, "trigger": _trigger(r, responses)} for r in selected]
    # Lecture seule : calculé après le score, sans aucune influence sur lui.
    consistency = tuple(consistency_checker.check_consistency(responses, consistency_checker.load_rules()))
    contributions = tuple(scoring.get_score_contributions(responses, catalog.question_domain_map()))
    return Evaluation(
        ordered_scores, result["global_score"], result["maturity_level"], recommendations, consistency, contributions
    )


def evaluation_payload(evaluation: Evaluation) -> dict:
    return {
        "global_score": evaluation.global_score,
        "maturity_level": evaluation.maturity_level,
        "domains": domain_rows(evaluation.domain_scores),
        "job_description_available": templates.get_job_description_if_needed(evaluation.domain_scores) is not None,
        "consistency_checks": [consistency_row(finding) for finding in evaluation.consistency],
        "score_drivers": score_drivers(evaluation),
        "recommendations": [
            {
                "id": r["id"],
                "text": r["text_fr"],
                "severity": r["severity"],
                "domain_id": r["domain_id"],
                "domain_name": pdf_generator.DOMAIN_LABELS_FR.get(r["domain_id"], r["domain_id"]),
                "reference": r.get("reference"),
                "guide_reference": r.get("guide_ref"),
                "effort": r.get("effort"),
                "trigger": r.get("trigger"),
            }
            for r in evaluation.recommendations
        ],
    }


def _answered_question(question_id: str, value: int) -> dict:
    question = catalog.question_index()[question_id]
    label = next(o["label"] for o in question["options"] if o["value"] == value)
    return {"id": question_id, "number": question["order"], "text": question["text"], "value": value, "answer": label}


def score_drivers(evaluation: Evaluation) -> list:
    """Les réponses qui ont le plus fait baisser le score (replay), au plus SCORE_DRIVER_LIMIT."""
    return [
        {
            **_answered_question(c["question_id"], c["value"]),
            "domain_id": c["domain_id"],
            "domain_name": pdf_generator.DOMAIN_LABELS_FR.get(c["domain_id"], c["domain_id"]),
            "points_lost": c["points_lost"],
        }
        for c in evaluation.contributions[:SCORE_DRIVER_LIMIT]
        if c["points_lost"] > 0
    ]


def _trigger(recommendation: dict, responses: dict) -> dict | None:
    """La réponse qui justifie la recommandation (None pour une recommandation générale)."""
    question_id = recommendation.get("question_id")
    return _answered_question(question_id, responses[question_id]) if question_id else None


def consistency_row(finding) -> dict:
    rule = finding.rule
    return {
        "id": rule.id,
        "kind": rule.kind,
        "title": rule.title,
        "rationale": rule.rationale,
        "reference": rule.reference,
        "questions": [
            _answered_question(rule.if_question, finding.if_value),
            _answered_question(rule.then_question, finding.then_value),
        ],
    }


def domain_rows(domain_scores: dict) -> list:
    return [
        {
            "id": domain_id,
            "name": pdf_generator.DOMAIN_LABELS_FR.get(domain_id, domain_id),
            "score": score,
            "level": scoring.get_maturity_level(score),
        }
        for domain_id, score in domain_scores.items()
    ]


def build_report(
    responses: dict, organization: str | None, sector: str | None, revisit_url: str | None = None
) -> bytes:
    evaluation = evaluate(responses)
    return pdf_generator.generate_audit_report(
        pme_name=(organization or "").strip() or DEFAULT_ORGANIZATION,
        sector=(sector or "").strip() or None,
        audit_date=datetime.now().strftime("%d/%m/%Y"),
        domain_scores=evaluation.domain_scores,
        global_score=evaluation.global_score,
        maturity_level=evaluation.maturity_level,
        recommendations=evaluation.recommendations,
        consistency_checks=[consistency_row(finding) for finding in evaluation.consistency],
        revisit_url=revisit_url,
        annex={
            "report_id": report_id(responses),
            "actions": action_plan(responses, evaluation),
            "answers": answer_rows(responses),
            "facts": {
                "recommendation_count": db.count_recommendations(),
                "rule_count": len(consistency_checker.load_rules()),
            },
        },
    )


def report_id(responses: dict) -> str:
    """Référence déterministe : mêmes réponses et mêmes versions => même référence."""
    payload = json.dumps(
        {"questionnaire": QUESTIONNAIRE_VERSION, "responses": dict(sorted(responses.items()))}, sort_keys=True
    )
    return "PS-" + hashlib.sha256(payload.encode("utf-8")).hexdigest()[:10].upper()


def action_plan(responses: dict, evaluation: Evaluation) -> list:
    """
    Les priorités de la synthèse, puis toutes les autres mesures déclenchées par une réponse,
    les plus sévères d'abord (domaines faibles en tête).
    """
    weakest = sorted(evaluation.domain_scores, key=evaluation.domain_scores.get)
    priority_rank = {r["id"]: rank for rank, r in enumerate(evaluation.recommendations)}
    triggered = [
        {**r, "domain_id": domain_id, "trigger": _trigger(r, responses), "is_priority": r["id"] in priority_rank}
        for domain_id in weakest
        for r in db.get_recommendations_for_domain(domain_id, ALL_SEVERITIES)
        if r["id"] in priority_rank or (r.get("question_id") and scoring.recommendation_applies(r, responses))
    ]
    return sorted(triggered, key=lambda r: (
        priority_rank.get(r["id"], len(priority_rank)),
        scoring.SEVERITY_RANK.get(r["severity"], 9),
        weakest.index(r["domain_id"]),
        responses.get(r["question_id"], 0),
    ))


def answer_rows(responses: dict) -> list:
    mapping = catalog.question_domain_map()
    return [
        {**_answered_question(question_id, responses[question_id]), "domain_id": domain_id}
        for question_id, domain_id in mapping.items()
    ]


def build_badge(responses: dict, organization: str | None) -> bytes:
    """Badge PNG 1200 × 1200 du résultat, à partager (auto-évaluation déclarative)."""
    evaluation = evaluate(responses)
    return badge_generator.generate_badge(
        pme_name=organization,
        global_score=evaluation.global_score,
        maturity_level=evaluation.maturity_level,
        audit_date=datetime.now().strftime("%d/%m/%Y"),
    )


def build_job_description(responses: dict) -> bytes | None:
    """PDF de la fiche de poste RSSI si la gouvernance est faible, sinon None."""
    markdown = templates.get_job_description_if_needed(evaluate(responses).domain_scores)
    return pdf_generator.generate_job_description_pdf(markdown) if markdown else None


def save_assessment(pme_id: str, responses: dict) -> dict:
    evaluation = evaluate(responses)
    mapping = catalog.question_domain_map()
    rows = [(qid, value, evaluation.domain_scores[mapping[qid]]) for qid, value in responses.items()]
    audit_id = db.save_completed_audit(pme_id, rows, evaluation.global_score)
    db.log_action(pme_id, "assessment_saved", f"Évaluation {audit_id}")
    return next(entry for entry in history(pme_id) if entry["id"] == audit_id)


def history(pme_id: str) -> list:
    return [
        {
            "id": audit["id"],
            "completed_at": audit["completed_at"],
            "global_score": audit["global_score"],
            "maturity_level": scoring.get_maturity_level(audit["global_score"]),
            "domains": domain_rows(db.get_audit_domain_scores(audit["id"])),
        }
        for audit in db.get_audit_history(pme_id)
    ]
