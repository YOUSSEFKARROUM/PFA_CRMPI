"""Tests d'intégration — catalogue, scoring et export PDF via l'API."""
from io import BytesIO

from pypdf import PdfReader


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_questionnaire_exposes_real_questions_grouped_by_domain(client):
    body = client.get("/api/questionnaire").json()

    assert [d["id"] for d in body["domains"]] == ["dom_gov", "dom_acc", "dom_infra", "dom_inc", "dom_sens"]
    questions = [q for d in body["domains"] for q in d["questions"]]
    assert len(questions) == 25
    first = questions[0]
    assert first["id"] == "q1"
    assert first["text"].startswith("Votre organisation a-t-elle une politique de sécurité")
    assert [o["value"] for o in first["options"]] == [1, 2, 3, 4, 5]
    assert first["options"][0]["label"] == "Non"
    assert first["guidance"]
    assert all(d["intro"] and d["short"] for d in body["domains"])
    assert body["recommendation_count"] == 47


def test_demo_profiles_match_validated_scores(client):
    profiles = {p["name"]: p for p in client.get("/api/profiles/demo").json()}

    assert profiles["PME Finance"]["global_score"] == 44.0
    assert profiles["PME Finance"]["maturity_level"] == "Faible"
    assert profiles["PME Commerce"]["global_score"] == 20.0
    assert profiles["PME Commerce"]["maturity_level"] == "Critique"
    assert profiles["PME Technologie"]["global_score"] == 83.0
    assert profiles["PME Technologie"]["maturity_level"] == "Avancé"
    assert all(len(p["responses"]) == 25 for p in profiles.values())


def test_score_returns_domain_scores_level_and_global_recommendations(client, all_answers):
    result = client.post("/api/assessments/score", json={"responses": all_answers}).json()

    assert result["global_score"] == 50.0
    assert result["maturity_level"] == "Moyen"
    assert [d["score"] for d in result["domains"]] == [50.0] * 5
    assert all(d["level"] == "Moyen" for d in result["domains"])
    assert 2 <= len(result["recommendations"]) <= 3


def test_score_never_raises_high_alert_on_a_strong_domain(client, all_answers):
    answers = {qid: 5 for qid in all_answers}
    result = client.post("/api/assessments/score", json={"responses": answers}).json()

    assert result["global_score"] == 100.0
    assert all(r["severity"] in ("Medium", "Low") for r in result["recommendations"])


def test_score_rejects_incomplete_answers(client, all_answers):
    del all_answers["q7"]
    response = client.post("/api/assessments/score", json={"responses": all_answers})

    assert response.status_code == 422
    assert "q7" in response.json()["detail"]


def test_score_rejects_out_of_range_value(client, all_answers):
    all_answers["q1"] = 6
    assert client.post("/api/assessments/score", json={"responses": all_answers}).status_code == 422


def test_score_rejects_unknown_question(client, all_answers):
    all_answers["q99"] = 3
    response = client.post("/api/assessments/score", json={"responses": all_answers})

    assert response.status_code == 422
    assert "q99" in response.json()["detail"]


def test_report_returns_branded_pdf_computed_server_side(client, all_answers):
    response = client.post("/api/assessments/report", json={
        "responses": all_answers, "organization": "Atlas SARL", "sector": "Industrie",
    })

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "rapport_pentascore_" in response.headers["content-disposition"]
    text = " ".join(page.extract_text() for page in PdfReader(BytesIO(response.content)).pages)
    assert "Atlas SARL" in text
    assert "50/100" in text


def test_report_defaults_organization_name(client, all_answers):
    response = client.post("/api/assessments/report", json={"responses": all_answers})
    text = " ".join(page.extract_text() for page in PdfReader(BytesIO(response.content)).pages)

    assert "Votre organisation" in text


def test_report_rejects_overlong_organization(client, all_answers):
    response = client.post("/api/assessments/report", json={"responses": all_answers, "organization": "x" * 200})
    assert response.status_code == 422


def test_security_headers_are_set(client):
    headers = client.get("/api/health").headers

    assert headers["x-content-type-options"] == "nosniff"
    assert headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in headers["content-security-policy"]


def test_unknown_api_route_is_json_404(client):
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")


def _demo_responses(client, name):
    return next(p for p in client.get("/api/profiles/demo").json() if p["name"] == name)["responses"]


def test_score_flags_job_description_only_when_governance_is_weak(client):
    commerce = client.post("/api/assessments/score", json={"responses": _demo_responses(client, "PME Commerce")})
    technologie = client.post("/api/assessments/score", json={"responses": _demo_responses(client, "PME Technologie")})

    assert commerce.json()["job_description_available"] is True
    assert technologie.json()["job_description_available"] is False


def test_job_description_pdf_is_served_when_governance_is_weak(client):
    response = client.post(
        "/api/assessments/job-description", json={"responses": _demo_responses(client, "PME Commerce")}
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "fiche_poste_rssi" in response.headers["content-disposition"]


def test_job_description_is_refused_when_governance_is_sufficient(client):
    response = client.post(
        "/api/assessments/job-description", json={"responses": _demo_responses(client, "PME Technologie")}
    )
    assert response.status_code == 409


def test_score_lists_no_consistency_check_for_demo_profiles(client):
    for name in ("PME Finance", "PME Commerce", "PME Technologie"):
        result = client.post("/api/assessments/score", json={"responses": _demo_responses(client, name)}).json()
        assert result["consistency_checks"] == []


def test_score_reports_contradictions_with_the_chosen_answers(client, all_answers):
    answers = {**all_answers, "q6": 4, "q8": 1}
    result = client.post("/api/assessments/score", json={"responses": answers}).json()

    [check] = result["consistency_checks"]
    assert check["id"] == "CR-01"
    assert check["kind"] == "declaration"
    assert check["reference"].startswith("ISO/IEC 27001")
    assert [(q["number"], q["value"]) for q in check["questions"]] == [(6, 4), (8, 1)]
    assert check["questions"][0]["answer"] == "Active Directory + MFA"
    assert check["questions"][1]["answer"] == "Non"


def test_consistency_checks_never_change_scores_or_recommendations(client, all_answers, monkeypatch):
    from api import services
    from src import consistency_checker

    answers = {**all_answers, "q6": 4, "q8": 1}
    with_checks = services.evaluate(answers)
    monkeypatch.setattr(consistency_checker, "check_consistency", lambda responses, rules: [])
    without_checks = services.evaluate(answers)

    assert with_checks.consistency and not without_checks.consistency
    assert with_checks.domain_scores == without_checks.domain_scores
    assert with_checks.global_score == without_checks.global_score
    assert with_checks.recommendations == without_checks.recommendations


def test_report_includes_points_to_recheck_before_priorities(client, all_answers):
    answers = {**all_answers, "q6": 4, "q8": 1}
    response = client.post("/api/assessments/report", json={"responses": answers})
    text = "".join(page.extract_text() for page in PdfReader(BytesIO(response.content)).pages)

    assert "POINTS À REVÉRIFIER · 1" in text
    assert "questions 6 et 8" in text
    assert text.index("POINTS À REVÉRIFIER") < text.index("Vos priorités")


def test_report_omits_the_section_when_answers_are_consistent(client, all_answers):
    response = client.post("/api/assessments/report", json={"responses": all_answers})
    text = "".join(page.extract_text() for page in PdfReader(BytesIO(response.content)).pages)
    assert "REVÉRIFIER" not in text


def test_recommendations_never_target_a_practice_already_declared(client, all_answers):
    answers = {**{qid: 4 for qid in all_answers}, "q1": 5, "q2": 1, "q3": 1, "q4": 1, "q5": 1}
    recs = client.post("/api/assessments/score", json={"responses": answers}).json()["recommendations"]

    assert "rec_gov_001" not in [r["id"] for r in recs]
    assert recs[0]["trigger"]["number"] == 2
    assert recs[0]["trigger"]["answer"] == "Non"


def test_each_recommendation_explains_its_answer_and_cites_its_sources(client):
    for name in ("PME Finance", "PME Commerce", "PME Technologie"):
        recs = client.post(
            "/api/assessments/score", json={"responses": _demo_responses(client, name)}
        ).json()["recommendations"]
        assert len(recs) == 3
        assert len({r["domain_id"] for r in recs}) >= 2, name
        for rec in recs:
            assert rec["trigger"]["answer"], rec["id"]
            assert rec["reference"].startswith("ISO/IEC 27001:2022"), rec["id"]


def test_perfect_answers_only_get_general_maintenance_recommendations(client, all_answers):
    answers = {qid: 5 for qid in all_answers}
    recs = client.post("/api/assessments/score", json={"responses": answers}).json()["recommendations"]
    assert recs and all(r["trigger"] is None for r in recs)


def _report_text(client, responses):
    response = client.post("/api/assessments/report", json={"responses": responses})
    reader = PdfReader(BytesIO(response.content))
    return reader, [page.extract_text() for page in reader.pages]


def test_report_has_synthesis_action_plan_and_answers_annex(client):
    reader, pages = _report_text(client, _demo_responses(client, "PME Commerce"))

    assert len(reader.pages) == 3
    assert "Vos priorités" in pages[0] and "parce que Q16" in pages[0]
    assert "Plan d'action" in pages[1] and "ACTIONS RAPIDES" in pages[1]
    assert "Guide AUSIM-CMRPI 2018" in pages[1] and "ISO/IEC 27001:2022" in pages[1]
    assert "En cas d'incident" in pages[1] and "CNDP" in pages[1]
    assert "VOS RÉPONSES" in pages[2] and "Méthodologie et limites" in pages[2]
    assert "CMRPI Guide" not in "".join(pages)


def test_report_reference_is_deterministic_and_tied_to_the_answers(client, all_answers):
    from api import services

    first = services.report_id(all_answers)
    assert first == services.report_id(dict(reversed(list(all_answers.items()))))
    assert first != services.report_id({**all_answers, "q1": 4})
    _, pages = _report_text(client, all_answers)
    assert all(first in page for page in pages)


def test_action_plan_lists_priorities_first_and_only_triggered_measures(client, all_answers):
    from api import services

    answers = {**{qid: 5 for qid in all_answers}, "q8": 1}
    evaluation = services.evaluate(answers)
    plan = services.action_plan(answers, evaluation)

    priority_count = len(evaluation.recommendations)
    assert [a["id"] for a in plan[:priority_count]] == [r["id"] for r in evaluation.recommendations]
    assert all(a["is_priority"] for a in plan[:priority_count])
    others = plan[priority_count:]
    assert others and all(a["question_id"] == "q8" for a in others)


def test_badge_is_a_1200px_png_generated_server_side(client):
    from PIL import Image

    response = client.post("/api/assessments/badge", json={
        "responses": _demo_responses(client, "PME Technologie"), "organization": "Atlas SARL",
    })

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert 'filename="badge_pentascore.png"' in response.headers["content-disposition"]
    assert Image.open(BytesIO(response.content)).size == (1200, 1200)


def test_badge_rejects_incomplete_answers(client, all_answers):
    del all_answers["q3"]
    assert client.post("/api/assessments/badge", json={"responses": all_answers}).status_code == 422


def test_content_security_policy_allows_no_external_font_or_style_origin(client):
    policy = client.get("/api/health").headers["content-security-policy"]
    assert "googleapis" not in policy and "gstatic" not in policy
    assert "font-src 'self';" in policy


def test_score_lists_the_five_answers_that_cost_the_most_points(client):
    result = client.post(
        "/api/assessments/score", json={"responses": _demo_responses(client, "PME Commerce")}
    ).json()

    drivers = result["score_drivers"]
    assert len(drivers) == 5
    assert all(d["value"] == 1 and d["points_lost"] == 4.0 and d["answer"] == "Non" for d in drivers)
    # Six réponses à 1 (q5, q7, q14, q16, q19, q24) : à égalité, l'ordre du questionnaire départage.
    assert [d["number"] for d in drivers] == [5, 7, 14, 16, 19]


def test_perfect_answers_have_no_score_driver(client, all_answers):
    answers = {qid: 5 for qid in all_answers}
    assert client.post("/api/assessments/score", json={"responses": answers}).json()["score_drivers"] == []


def test_report_qr_code_points_to_the_configured_public_address(api_db, tmp_path, all_answers):
    from fastapi.testclient import TestClient

    from api.main import create_app
    from tests.conftest import make_settings

    settings = make_settings(tmp_path, public_base_url="https://pentascore.cmrpi.ma")
    with TestClient(create_app(settings)) as custom_client:
        response = custom_client.post("/api/assessments/report", json={"responses": all_answers})
    first_page = " ".join(PdfReader(BytesIO(response.content)).pages[0].extract_text().split())

    assert "Refaites votre évaluation dans 6 mois" in first_page
    assert "pentascore.cmrpi.ma" in first_page
