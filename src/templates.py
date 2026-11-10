"""
templates.py — Modèles statiques proposés selon les résultats (aucune génération dynamique).

Fiche de poste RSSI junior : proposée uniquement si le score du domaine Gouvernance
est strictement inférieur à 50. Couche d'information en lecture seule : elle n'a
aucun effet sur le calcul des scores ni sur les recommandations.
"""
from functools import lru_cache
from pathlib import Path

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "data" / "templates"
JOB_DESCRIPTION_PATH = TEMPLATES_DIR / "fiche_poste_rssi.md"
GOVERNANCE_DOMAIN = "dom_gov"
GOVERNANCE_THRESHOLD = 50.0


@lru_cache(maxsize=1)
def load_job_description() -> str:
    return JOB_DESCRIPTION_PATH.read_text(encoding="utf-8")


def get_job_description_if_needed(domain_scores: dict) -> str | None:
    """Retourne le modèle de fiche de poste si la gouvernance est faible (< 50), sinon None."""
    governance = domain_scores.get(GOVERNANCE_DOMAIN)
    if governance is None or governance >= GOVERNANCE_THRESHOLD:
        return None
    return load_job_description()
