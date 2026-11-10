"""Tests unitaires — database.py et pdf_generator.py."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from src import database as db, pdf_generator

BASE_DIR = Path(__file__).resolve().parent.parent


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    test_db_path = tmp_path / "test_app.db"
    monkeypatch.setattr(db, "DB_PATH", test_db_path)
    db.init_database()
    yield


def test_init_database_creates_domains():
    domains = db.get_all_domains()
    assert len(domains) == 5


def test_create_and_get_pme():
    pme_id = db.create_pme("t@pme.ma", "hashed_pw", "Test PME", "Finance")
    pme = db.get_pme_by_id(pme_id)
    assert pme["email"] == "t@pme.ma"
    assert pme["name"] == "Test PME"


def test_seed_questions_and_domains():
    n = db.seed_questions_and_domains(
        str(BASE_DIR / "data" / "questions" / "questions_fr.json"),
        str(BASE_DIR / "data" / "questions" / "questions_en.json"),
        str(BASE_DIR / "data" / "questions" / "guidance.json"),
    )
    assert n == 25
    questions = db.get_all_questions()
    assert len(questions) == 25


def test_seed_recommendations():
    n = db.seed_recommendations_from_xlsx(str(BASE_DIR / "data" / "recommendations" / "Recommendations_Database.xlsx"))
    assert n >= 40
    recs = db.get_recommendations_for_domain("dom_gov", ["Critical", "High"])
    assert len(recs) > 0


def test_audit_lifecycle():
    db.seed_questions_and_domains(
        str(BASE_DIR / "data" / "questions" / "questions_fr.json"),
        str(BASE_DIR / "data" / "questions" / "questions_en.json"),
        str(BASE_DIR / "data" / "questions" / "guidance.json"),
    )
    pme_id = db.create_pme("audit@pme.ma", "hash", "PME Audit")
    audit_id = db.create_audit(pme_id)
    db.save_response(audit_id, "q1", 4, 60.0)
    db.complete_audit(audit_id, 60.0)
    history = db.get_audit_history(pme_id)
    assert len(history) == 1
    assert history[0]["global_score"] == 60.0
    responses = db.get_audit_responses(audit_id)
    assert len(responses) == 1


def test_pdf_generation_returns_bytes():
    domain_scores = {"dom_gov": 60.0, "dom_acc": 55.0, "dom_infra": 35.0, "dom_inc": 50.0, "dom_sens": 30.0}
    recommendations = [
        {"severity": "Critical", "text_fr": "Établir une politique de sécurité", "domain_id": "dom_gov"},
        {"severity": "High", "text_fr": "Activer le MFA", "domain_id": "dom_acc"},
    ]
    pdf_bytes = pdf_generator.generate_audit_report(
        pme_name="PME Test",
        sector="Finance",
        audit_date="23/07/2026",
        domain_scores=domain_scores,
        global_score=44.0,
        maturity_level="Faible",
        recommendations=recommendations,
    )
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes[:4] == b"%PDF"
    assert len(pdf_bytes) > 1000


def test_init_database_migrates_legacy_pme_table(tmp_path, monkeypatch):
    legacy_path = tmp_path / "legacy.db"
    monkeypatch.setattr(db, "DB_PATH", legacy_path)
    import sqlite3
    conn = sqlite3.connect(legacy_path)
    conn.execute(
        "CREATE TABLE pme (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, "
        "name TEXT NOT NULL, sector TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
    )
    conn.commit()
    conn.close()

    db.init_database()

    with db.get_connection() as conn:
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(pme)")}
    assert "consent_at" in columns


def test_audit_history_keeps_domain_scores():
    db.seed_questions_and_domains(
        str(BASE_DIR / "data" / "questions" / "questions_fr.json"),
        str(BASE_DIR / "data" / "questions" / "questions_en.json"),
        str(BASE_DIR / "data" / "questions" / "guidance.json"),
    )
    pme_id = db.create_pme("scores@pme.ma", "hash", "PME Scores")
    audit_id = db.create_audit(pme_id)
    db.save_response(audit_id, "q1", 4, 75.0)
    db.save_response(audit_id, "q6", 2, 25.0)
    db.complete_audit(audit_id, 50.0)

    assert db.get_audit_domain_scores(audit_id) == {"dom_gov": 75.0, "dom_acc": 25.0}


def test_pdf_mentions_pentascore_and_self_assessment_disclaimer():
    from pypdf import PdfReader
    from io import BytesIO
    pdf_bytes = pdf_generator.generate_audit_report(
        pme_name="PME Test", sector="Finance", audit_date="09/11/2026",
        domain_scores={"dom_gov": 50.0, "dom_acc": 50.0, "dom_infra": 50.0, "dom_inc": 50.0, "dom_sens": 50.0},
        global_score=50.0, maturity_level="Moyen", recommendations=[],
    )
    text = " ".join(page.extract_text() for page in PdfReader(BytesIO(pdf_bytes)).pages)
    assert "Pentascore" in text
    assert "déclarati" in text.lower()
    assert "Maturité moyenne" in text


def test_count_recommendations():
    assert db.count_recommendations() == 0
    db.seed_recommendations_from_xlsx(str(BASE_DIR / "data" / "recommendations" / "Recommendations_Database.xlsx"))
    assert db.count_recommendations() == 47


def test_database_path_can_be_overridden_by_environment(tmp_path, monkeypatch):
    import importlib
    custom = tmp_path / "custom.db"
    monkeypatch.setenv("PENTASCORE_DB_PATH", str(custom))
    reloaded = importlib.reload(db)
    try:
        assert reloaded.DB_PATH == custom
    finally:
        monkeypatch.delenv("PENTASCORE_DB_PATH")
        importlib.reload(db)


def test_pdf_report_fits_on_a_single_page_with_three_recommendations():
    from pypdf import PdfReader
    from io import BytesIO
    recommendation = {
        "severity": "High", "text_fr": "Intégrer un module cybersécurité à l'onboarding", "domain_id": "dom_sens",
    }
    pdf_bytes = pdf_generator.generate_audit_report(
        pme_name="PME Finance", sector="Finance", audit_date="09/11/2026",
        domain_scores={"dom_gov": 50.0, "dom_acc": 55.0, "dom_infra": 35.0, "dom_inc": 50.0, "dom_sens": 30.0},
        global_score=44.0, maturity_level="Faible", recommendations=[recommendation] * 3,
    )
    assert len(PdfReader(BytesIO(pdf_bytes)).pages) == 1


def test_save_completed_audit_is_atomic():
    db.seed_questions_and_domains(
        str(BASE_DIR / "data" / "questions" / "questions_fr.json"),
        str(BASE_DIR / "data" / "questions" / "questions_en.json"),
        str(BASE_DIR / "data" / "questions" / "guidance.json"),
    )
    pme_id = db.create_pme("atomic@pme.ma", "hash", "PME Atomique")
    with pytest.raises(Exception):
        db.save_completed_audit(pme_id, [("q1", 3, 50.0), ("question-inexistante", 3, 50.0)], 50.0)

    with db.get_connection() as conn:
        assert conn.execute("SELECT COUNT(*) FROM audit WHERE pme_id = ?", (pme_id,)).fetchone()[0] == 0

    audit_id = db.save_completed_audit(pme_id, [("q1", 3, 50.0), ("q6", 4, 75.0)], 62.5)
    assert db.get_audit_history(pme_id)[0]["id"] == audit_id
    assert db.get_audit_domain_scores(audit_id) == {"dom_gov": 50.0, "dom_acc": 75.0}


def test_pdf_caps_consistency_checks_and_counts_the_rest():
    from pypdf import PdfReader
    from io import BytesIO
    check = {"title": "Comité sécurité régulier sans responsable désigné", "questions": [{"number": 4}, {"number": 2}]}
    pdf_bytes = pdf_generator.generate_audit_report(
        pme_name="PME", sector=None, audit_date="09/11/2026",
        domain_scores={"dom_gov": 50.0, "dom_acc": 55.0, "dom_infra": 35.0, "dom_inc": 50.0, "dom_sens": 30.0},
        global_score=44.0, maturity_level="Faible", recommendations=[],
        consistency_checks=[check] * (pdf_generator.PDF_MAX_CONSISTENCY_CHECKS + 2),
    )
    text = "".join(page.extract_text() for page in PdfReader(BytesIO(pdf_bytes)).pages)
    assert text.count("questions 4 et 2") == pdf_generator.PDF_MAX_CONSISTENCY_CHECKS
    assert "+ 2 autres points" in text


def test_pdf_report_stays_on_one_page_with_the_longest_consistency_titles():
    from pypdf import PdfReader
    from io import BytesIO
    from src import consistency_checker
    longest = sorted(consistency_checker.load_rules(), key=lambda r: len(r.title), reverse=True)
    checks = [{"title": r.title, "questions": [{"number": 24}, {"number": 22}]} for r in longest[:8]]
    recommendation = {
        "severity": "High", "text_fr": "Intégrer un module cybersécurité à l'onboarding", "domain_id": "dom_sens",
    }
    pdf_bytes = pdf_generator.generate_audit_report(
        pme_name="PME Finance", sector="Finance", audit_date="09/11/2026",
        domain_scores={"dom_gov": 50.0, "dom_acc": 55.0, "dom_infra": 35.0, "dom_inc": 50.0, "dom_sens": 30.0},
        global_score=44.0, maturity_level="Faible", recommendations=[recommendation] * 3,
        consistency_checks=checks,
    )
    assert len(PdfReader(BytesIO(pdf_bytes)).pages) == 1


def test_init_database_migrates_legacy_recommendation_table(tmp_path, monkeypatch):
    import sqlite3
    legacy = tmp_path / "legacy_recs.db"
    with sqlite3.connect(legacy) as conn:
        conn.execute("""CREATE TABLE recommendation (id TEXT PRIMARY KEY, domain_id TEXT NOT NULL,
                        severity TEXT NOT NULL, priority INTEGER, text_fr TEXT NOT NULL, text_en TEXT NOT NULL,
                        reference TEXT, effort TEXT)""")
    monkeypatch.setattr(db, "DB_PATH", legacy)
    db.init_database()
    n = db.seed_recommendations_from_xlsx(str(BASE_DIR / "data" / "recommendations" / "Recommendations_Database.xlsx"))
    assert n == 47
    [rec] = [r for r in db.get_recommendations_for_domain("dom_gov", ["Critical"]) if r["id"] == "rec_gov_001"]
    assert (rec["question_id"], rec["trigger_max"]) == ("q1", 2)
    assert rec["guide_ref"] == "Guide AUSIM-CMRPI 2018, §2.1.1"


def _report_with_qr(url, pme_name_override=None, **extra):
    return pdf_generator.generate_audit_report(
        pme_name=pme_name_override or "Atlas SARL", sector="Commerce", audit_date="10/11/2026",
        domain_scores={"dom_gov": 50.0, "dom_acc": 55.0, "dom_infra": 35.0, "dom_inc": 50.0, "dom_sens": 30.0},
        global_score=44.0, maturity_level="Faible", recommendations=[], revisit_url=url, **extra,
    )


def test_pdf_shows_the_revisit_invitation_and_url_next_to_the_qr_code():
    from pypdf import PdfReader
    from io import BytesIO
    page = PdfReader(BytesIO(_report_with_qr("https://pentascore.cmrpi.ma"))).pages[0]
    text = " ".join(page.extract_text().split())
    assert "Refaites votre évaluation dans 6 mois" in text
    assert "pentascore.cmrpi.ma" in text


def test_qr_widget_encodes_exactly_the_configured_url():
    from reportlab.graphics.barcode.qr import QrCodeWidget
    drawing = pdf_generator.qr_drawing("https://pentascore.cmrpi.ma", size=50)
    [widget] = [c for c in drawing.contents if isinstance(c, QrCodeWidget)]
    assert widget.value == "https://pentascore.cmrpi.ma"
    assert (drawing.width, drawing.height) == (50, 50)


def test_qr_code_in_the_rendered_pdf_decodes_to_the_url():
    cv2 = pytest.importorskip("cv2")
    fitz = pytest.importorskip("fitz")
    import numpy as np
    page = fitz.open(stream=_report_with_qr("http://localhost:8000"), filetype="pdf")[0]
    pixmap = page.get_pixmap(dpi=200)
    image = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(pixmap.height, pixmap.width, pixmap.n)
    decoded, _, _ = cv2.QRCodeDetector().detectAndDecode(image[:, :, :3].copy())
    assert decoded == "http://localhost:8000"


def test_report_with_qr_and_eight_consistency_points_still_fits_one_page():
    from pypdf import PdfReader
    from io import BytesIO
    from src import consistency_checker
    longest = sorted(consistency_checker.load_rules(), key=lambda r: len(r.title), reverse=True)
    checks = [{"title": r.title, "questions": [{"number": 24}, {"number": 22}]} for r in longest[:8]]
    recommendation = {"severity": "High", "text_fr": "Intégrer un module cybersécurité à l'onboarding",
                      "domain_id": "dom_sens", "trigger": {"number": 21, "answer": "Ad-hoc (optionnel)"}}
    pdf_bytes = pdf_generator.generate_audit_report(
        pme_name="PME Finance", sector="Finance", audit_date="10/11/2026",
        domain_scores={"dom_gov": 50.0, "dom_acc": 55.0, "dom_infra": 35.0, "dom_inc": 50.0, "dom_sens": 30.0},
        global_score=44.0, maturity_level="Faible", recommendations=[recommendation] * 3,
        consistency_checks=checks, revisit_url="https://pentascore.cmrpi.ma",
    )
    assert len(PdfReader(BytesIO(pdf_bytes)).pages) == 1


def test_long_organization_names_wrap_instead_of_overflowing():
    from pypdf import PdfReader
    from io import BytesIO
    name = "Société Marocaine de Distribution et de Services Numériques Avancés de Casablanca-Settat"
    page = PdfReader(BytesIO(_report_with_qr("https://pentascore.cmrpi.ma", pme_name_override=name))).pages[0]
    assert "Casablanca-Settat" in " ".join(page.extract_text().split())
