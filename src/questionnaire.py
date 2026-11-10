"""
questionnaire.py — Chargement et validation du questionnaire d'auto-évaluation.
"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "questions"

DOMAIN_NAME_TO_ID = {
    "Gouvernance": "dom_gov",
    "Governance": "dom_gov",
    "Accès & Identités": "dom_acc",
    "Access & Identity": "dom_acc",
    "Infrastructure & Sécurité réseau": "dom_infra",
    "Infrastructure & Network Security": "dom_infra",
    "Incidents & Continuité": "dom_inc",
    "Incident & Continuity": "dom_inc",
    "Sensibilisation & Formation": "dom_sens",
    "Awareness & Training": "dom_sens",
}


def load_questions(language: str = "fr") -> list:
    """Charge les 25 questions depuis le fichier JSON correspondant à la langue."""
    filename = f"questions_{language}.json"
    path = DATA_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["questionnaire"]


def load_guidance() -> dict:
    path = DATA_DIR / "guidance.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["guidance"]


def get_question_domain_map(language: str = "fr") -> dict:
    """Retourne {question_id: domain_id} pour les 25 questions."""
    questions = load_questions(language)
    return {q["id"]: DOMAIN_NAME_TO_ID.get(q["domain"], "dom_gov") for q in questions}


def get_questions_grouped_by_domain(language: str = "fr") -> dict:
    """Retourne {domain_id: [questions...]} conservant l'ordre du questionnaire."""
    questions = load_questions(language)
    grouped = {}
    for q in questions:
        domain_id = DOMAIN_NAME_TO_ID.get(q["domain"], "dom_gov")
        grouped.setdefault(domain_id, []).append(q)
    return grouped


def validate_responses(responses: dict, expected_ids: list) -> tuple:
    """
    Vérifie que toutes les questions ont une réponse valide (1-5).
    returns: (is_valid: bool, missing: list)
    """
    missing = [qid for qid in expected_ids if qid not in responses or responses[qid] not in (1, 2, 3, 4, 5)]
    return (len(missing) == 0, missing)
