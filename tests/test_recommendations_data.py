"""
Intégrité de la base de recommandations (data/recommendations/Recommendations_Database.xlsx).

Les références doivent pointer vers des sections qui existent réellement :
- Guide AUSIM-CMRPI 2018 « Les PME marocaines, comment faire face aux menaces cybernétiques ? »
  (sommaire, p. 6-7) ;
- ISO/IEC 27001:2022 (clauses 4 à 10, annexe A.5 à A.8).
"""
import re
from pathlib import Path

import pytest

from api import catalog
from src import database as db

XLSX = Path(__file__).resolve().parent.parent / "data" / "recommendations" / "Recommendations_Database.xlsx"

# Sections réelles du guide (sommaire), citables par une recommandation.
GUIDE_SECTIONS = {
    *(f"§2.1.{i}" for i in range(1, 6)), "§2.2", "§2.3", "§2.4", "§2.5",
    *(f"§2.6.{i}" for i in range(1, 13)),
    *(f"§3.1.{i}" for i in range(1, 8)), *(f"§3.2.{i}" for i in range(1, 4)),
    *(f"§3.3.{i}" for i in range(1, 5)), *(f"§3.4.{i}" for i in range(1, 5)),
    *(f"§3.5.{i}" for i in range(1, 5)),
    "annexe 5.1", "annexe 5.2",
}
GUIDE_PREFIX = "Guide AUSIM-CMRPI 2018, "
ISO_PATTERN = re.compile(r"^ISO/IEC 27001:2022 (A\.[5-8]\.\d{1,2}|§(4|5|6|7|8|9|10)(\.\d+){0,2})$")
ANNEX_A_SIZE = {"5": 37, "6": 8, "7": 14, "8": 34}


@pytest.fixture(scope="module")
def recommendations(tmp_path_factory):
    original = db.DB_PATH
    db.DB_PATH = tmp_path_factory.mktemp("recs") / "recs.db"
    try:
        db.init_database()
        db.seed_recommendations_from_xlsx(str(XLSX))
        with db.get_connection() as conn:
            yield [dict(r) for r in conn.execute("SELECT * FROM recommendation ORDER BY id")]
    finally:
        db.DB_PATH = original


def test_no_reference_cites_a_nonexistent_guide_numbering(recommendations):
    for rec in recommendations:
        assert "CMRPI Guide" not in (rec["reference"] or ""), rec["id"]
        assert "Gartner" not in (rec["reference"] or ""), rec["id"]


def test_guide_references_point_to_real_sections(recommendations):
    cited = [rec for rec in recommendations if rec["guide_ref"]]
    assert len(cited) >= 30
    for rec in cited:
        assert rec["guide_ref"].startswith(GUIDE_PREFIX), rec["id"]
        assert rec["guide_ref"].removeprefix(GUIDE_PREFIX) in GUIDE_SECTIONS, rec["id"]


def test_iso_references_follow_the_2022_numbering(recommendations):
    for rec in recommendations:
        reference = rec["reference"]
        if reference is None or reference.startswith("Loi "):
            continue
        assert ISO_PATTERN.match(reference), f"{rec['id']} : {reference}"
        annex = re.search(r"A\.(\d)\.(\d+)$", reference)
        if annex:
            assert int(annex.group(2)) <= ANNEX_A_SIZE[annex.group(1)], rec["id"]


def test_triggers_target_real_questions_with_a_meaningful_threshold(recommendations):
    questions = catalog.question_domain_map()
    linked = [rec for rec in recommendations if rec["question_id"]]
    assert len(linked) >= 40
    for rec in linked:
        assert rec["question_id"] in questions, rec["id"]
        assert questions[rec["question_id"]] == rec["domain_id"], rec["id"]
        assert 1 <= rec["trigger_max"] <= 4, rec["id"]


def test_general_recommendations_have_no_threshold(recommendations):
    for rec in recommendations:
        if rec["question_id"] is None:
            assert rec["trigger_max"] is None, rec["id"]


def test_critical_recommendations_only_fire_on_absent_or_ad_hoc_practices(recommendations):
    for rec in recommendations:
        if rec["severity"] == "Critical" and rec["question_id"]:
            assert rec["trigger_max"] <= 2, rec["id"]
