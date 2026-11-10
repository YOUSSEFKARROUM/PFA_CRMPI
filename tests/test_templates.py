"""Tests — fiche de poste RSSI proposée quand la gouvernance est faible (fonctionnalité 5)."""
from io import BytesIO

from pypdf import PdfReader

from api import catalog
from src import pdf_generator, scoring, templates


def _domain_scores(profile_name: str) -> dict:
    profile = next(p for p in catalog.demo_profiles() if p["name"] == profile_name)
    grouped = scoring.group_responses_by_domain(profile["responses"], catalog.question_domain_map())
    return scoring.score_full_audit(grouped)["domain_scores"]


def test_template_is_offered_for_pme_commerce_weak_governance():
    scores = _domain_scores("PME Commerce")
    assert scores["dom_gov"] < 50

    text = templates.get_job_description_if_needed(scores)

    assert text is not None
    assert "Responsable de la sécurité des systèmes d'information" in text


def test_template_is_not_offered_for_pme_technologie():
    assert templates.get_job_description_if_needed(_domain_scores("PME Technologie")) is None


def test_threshold_is_strictly_below_fifty():
    assert templates.get_job_description_if_needed({"dom_gov": 50.0}) is None
    assert templates.get_job_description_if_needed({"dom_gov": 49.9}) is not None


def test_missing_governance_score_offers_nothing():
    assert templates.get_job_description_if_needed({}) is None


def test_template_covers_missions_profile_and_skills():
    text = templates.load_job_description()
    for section in ("## Missions", "## Profil recherché", "## Compétences"):
        assert section in text


def test_job_description_pdf_renders_the_template():
    pdf_bytes = pdf_generator.generate_job_description_pdf(templates.load_job_description())
    text = " ".join(page.extract_text() for page in PdfReader(BytesIO(pdf_bytes)).pages)

    assert pdf_bytes.startswith(b"%PDF")
    assert "Missions" in text
    assert "Pentascore" in text
    assert len(pdf_bytes) < 200_000


def test_markdown_rendering_escapes_markup_characters():
    pdf_bytes = pdf_generator.generate_job_description_pdf("# Titre\n\n- Budget < 5 % & suivi")
    text = " ".join(page.extract_text() for page in PdfReader(BytesIO(pdf_bytes)).pages)
    assert "Budget < 5 % & suivi" in text
