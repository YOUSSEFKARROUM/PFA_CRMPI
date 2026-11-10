"""
catalog.py — Données de référence exposées au frontend : questionnaire réel
(data/questions/*.json), domaines et profils de démonstration (src/test_profiles.py).
"""
from functools import lru_cache
from pathlib import Path

from src import database as db
from src import questionnaire as qmod
from src.pdf_generator import DOMAIN_LABELS_FR, RADAR_LABELS_FR
from src.scoring import DOMAIN_ORDER
from src.test_profiles import TEST_PROFILES, expand_profile_to_question_responses

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

DOMAIN_INTROS_FR = {
    "dom_gov": "Comment la sécurité est pilotée, évaluée et budgétée dans l'organisation.",
    "dom_acc": "Qui peut accéder à quoi, avec quelle authentification, et comment ces droits sont revus.",
    "dom_infra": "La protection du réseau, des données, des sauvegardes et des postes de travail.",
    "dom_inc": "Ce que fait l'organisation le jour où un incident survient, et comment elle redémarre.",
    "dom_sens": "Ce que les équipes savent reconnaître, et les règles qu'elles appliquent au quotidien.",
}


def ensure_database() -> None:
    """Crée/migre la base et (re)charge les données de référence. Idempotent."""
    db.init_database()
    db.seed_questions_and_domains(
        str(DATA_DIR / "questions" / "questions_fr.json"),
        str(DATA_DIR / "questions" / "questions_en.json"),
        str(DATA_DIR / "questions" / "guidance.json"),
    )
    db.seed_recommendations_from_xlsx(str(DATA_DIR / "recommendations" / "Recommendations_Database.xlsx"))


@lru_cache(maxsize=1)
def question_domain_map() -> dict:
    return qmod.get_question_domain_map("fr")


@lru_cache(maxsize=1)
def questionnaire() -> dict:
    guidance = qmod.load_guidance()
    grouped = qmod.get_questions_grouped_by_domain("fr")
    domains = []
    for domain_id in DOMAIN_ORDER:
        questions = [
            {
                "id": q["id"],
                "order": q["order"],
                "text": q["text"],
                "guidance": guidance.get(q["id"], {}).get("fr", ""),
                "options": [{"value": int(k), "label": v} for k, v in sorted(q["options"].items())],
            }
            for q in grouped.get(domain_id, [])
        ]
        domains.append({
            "id": domain_id,
            "name": DOMAIN_LABELS_FR[domain_id],
            "short": RADAR_LABELS_FR[domain_id],
            "intro": DOMAIN_INTROS_FR[domain_id],
            "questions": questions,
        })
    return {"domains": domains}


@lru_cache(maxsize=1)
def question_index() -> dict:
    """{question_id: question} avec numéro (order), texte et libellés des réponses."""
    return {q["id"]: q for d in questionnaire()["domains"] for q in d["questions"]}


def demo_profiles() -> list:
    mapping = question_domain_map()
    return [
        {
            "key": key,
            "name": key.split(" (")[0],
            "sector": profile["sector"],
            "responses": expand_profile_to_question_responses(key, mapping),
        }
        for key, profile in TEST_PROFILES.items()
    ]
