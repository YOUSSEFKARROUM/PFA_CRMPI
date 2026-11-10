"""Tests unitaires — moteur de scoring."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src import scoring


def test_calculate_domain_score_basic():
    assert scoring.calculate_domain_score([4, 4, 3, 4, 2]) == 60.0


def test_calculate_domain_score_all_min():
    assert scoring.calculate_domain_score([1, 1, 1, 1, 1]) == 0.0


def test_calculate_domain_score_all_max():
    assert scoring.calculate_domain_score([5, 5, 5, 5, 5]) == 100.0


def test_calculate_domain_score_empty():
    assert scoring.calculate_domain_score([]) == 0.0


def test_calculate_global_score():
    domain_scores = {"d1": 60, "d2": 60, "d3": 40, "d4": 40, "d5": 20}
    assert scoring.calculate_global_score(domain_scores) == 44.0


def test_maturity_levels():
    assert scoring.get_maturity_level(10) == "Critique"
    assert scoring.get_maturity_level(24.9) == "Critique"
    assert scoring.get_maturity_level(25) == "Faible"
    assert scoring.get_maturity_level(49.9) == "Faible"
    assert scoring.get_maturity_level(50) == "Moyen"
    assert scoring.get_maturity_level(74.9) == "Moyen"
    assert scoring.get_maturity_level(75) == "Avancé"
    assert scoring.get_maturity_level(100) == "Avancé"


def test_severity_filter_low_score():
    severities, limit = scoring.get_severity_filter(45)
    assert severities == ["Critical", "High"]
    assert limit == 3


def test_severity_filter_high_score():
    severities, limit = scoring.get_severity_filter(80)
    assert severities == ["Medium", "Low"]
    assert limit == 1


def test_profile_finance():
    """Profil 1 — PME Finance. Score recalculé et vérifié (44.0% / Faible) —
    corrige une erreur d'addition manuelle présente dans le rapport Jalon 1 (54% / Moyen)."""
    responses = {
        "dom_gov": [3, 3, 4, 3, 2],
        "dom_acc": [3, 3, 4, 3, 3],
        "dom_infra": [3, 2, 3, 2, 2],
        "dom_inc": [3, 3, 3, 3, 3],
        "dom_sens": [2, 2, 3, 2, 2],
    }
    result = scoring.score_full_audit(responses)
    assert result["global_score"] == 44.0
    assert result["maturity_level"] == "Faible"


def test_profile_commerce():
    """Profil 2 — PME Commerce. Score recalculé et vérifié (20.0% / Faible) —
    corrige une erreur d'addition manuelle présente dans le rapport Jalon 1 (34% / Faible)."""
    responses = {
        "dom_gov": [2, 2, 3, 2, 1],
        "dom_acc": [2, 1, 2, 2, 2],
        "dom_infra": [2, 2, 2, 1, 2],
        "dom_inc": [1, 2, 2, 1, 2],
        "dom_sens": [2, 2, 2, 1, 2],
    }
    result = scoring.score_full_audit(responses)
    assert result["global_score"] == 20.0
    assert result["maturity_level"] == "Critique"


def test_profile_technologie():
    """Profil 3 — PME Technologie. Score recalculé et vérifié (83.0% / Avancé) —
    corrige une erreur d'addition manuelle présente dans le rapport Jalon 1 (82% / Avancé)."""
    responses = {
        "dom_gov": [4, 5, 4, 4, 4],
        "dom_acc": [5, 4, 5, 5, 4],
        "dom_infra": [5, 5, 4, 5, 5],
        "dom_inc": [4, 4, 5, 4, 4],
        "dom_sens": [4, 4, 4, 3, 4],
    }
    result = scoring.score_full_audit(responses)
    assert result["global_score"] == 83.0
    assert result["maturity_level"] == "Avancé"


def test_group_responses_by_domain():
    responses = {"q1": 4, "q6": 3}
    question_domain_map = {"q1": "dom_gov", "q6": "dom_acc"}
    grouped = scoring.group_responses_by_domain(responses, question_domain_map)
    assert grouped == {"dom_gov": [4], "dom_acc": [3]}


def _fake_get_recs(domain_id, severities):
    catalog = {
        "Critical": {"severity": "Critical", "priority": 1, "text_fr": f"Rec critique {domain_id}"},
        "High": {"severity": "High", "priority": 2, "text_fr": f"Rec haute {domain_id}"},
    }
    return [catalog[s] for s in ["Critical", "High"] if s in severities]


def test_generate_top_recommendations_respects_limit():
    domain_scores = {"dom_gov": 20, "dom_acc": 30, "dom_infra": 90, "dom_inc": 85, "dom_sens": 95}
    top = scoring.generate_top_recommendations(domain_scores, _fake_get_recs, limit=3)
    assert len(top) == 3


def test_generate_top_recommendations_prioritizes_weakest_domains():
    domain_scores = {"dom_gov": 10, "dom_acc": 95, "dom_infra": 90, "dom_inc": 85, "dom_sens": 95}
    top = scoring.generate_top_recommendations(domain_scores, _fake_get_recs, limit=2)
    assert all(r["domain_id"] == "dom_gov" for r in top)
    assert top[0]["severity"] == "Critical"


def test_generate_top_recommendations_default_limit_is_three():
    domain_scores = {"dom_gov": 20, "dom_acc": 25, "dom_infra": 30, "dom_inc": 85, "dom_sens": 95}
    top = scoring.generate_top_recommendations(domain_scores, _fake_get_recs)
    assert len(top) == 3


# ---- Sélection pilotée par les réponses (paramètre responses) ----

def _rec(rec_id, severity, priority, question=None, trigger_max=None):
    return {"id": rec_id, "severity": severity, "priority": priority, "text_fr": rec_id,
            "question_id": question, "trigger_max": trigger_max}


ANSWER_DRIVEN_CATALOG = {
    "dom_gov": [
        _rec("gov_policy", "Critical", 1, "q1", 2),
        _rec("gov_ciso", "Critical", 2, "q2", 1),
        _rec("gov_risk", "High", 3, "q3", 2),
        _rec("gov_policy_audit", "High", 4, "q1", 3),
        _rec("gov_change", "High", 5),
    ],
    "dom_acc": [
        _rec("acc_mfa", "High", 1, "q8", 2),
        _rec("acc_review", "Medium", 2, "q10", 3),
    ],
}


def _catalog_recs(domain_id, severities):
    return [r for r in ANSWER_DRIVEN_CATALOG.get(domain_id, []) if r["severity"] in severities]


def _top(responses, scores=None, limit=3):
    scores = scores or {"dom_gov": 20.0, "dom_acc": 40.0}
    return [r["id"] for r in scoring.generate_top_recommendations(scores, _catalog_recs, limit, responses=responses)]


def test_answer_driven_never_recommends_a_practice_already_declared():
    # Politique déclarée au maximum (q1=5) : « établir une politique » ne doit pas sortir.
    top = _top({"q1": 5, "q2": 1, "q3": 1, "q8": 1, "q10": 1})
    assert "gov_policy" not in top and "gov_policy_audit" not in top
    assert top[0] == "gov_ciso"


def test_answer_driven_caps_each_domain_to_cover_more_than_one_domain():
    top = _top({"q1": 1, "q2": 1, "q3": 1, "q8": 1, "q10": 1})
    assert top == ["gov_policy", "gov_ciso", "acc_mfa"]


def test_answer_driven_uses_one_recommendation_per_question_first():
    top = _top({"q1": 1, "q2": 5, "q3": 5, "q8": 5, "q10": 5}, limit=2)
    # gov_policy et gov_policy_audit portent sur q1 : la seconde passe après la générale.
    assert top == ["gov_policy", "gov_change"]


def test_answer_driven_falls_back_to_general_recommendations_last():
    top = _top({"q1": 5, "q2": 5, "q3": 5, "q8": 1, "q10": 5})
    assert top == ["acc_mfa", "gov_change"]


def test_answer_driven_fills_the_limit_beyond_the_domain_cap_when_needed():
    only_gov = {"dom_gov": 10.0}
    top = _top({"q1": 1, "q2": 1, "q3": 1}, scores=only_gov)
    assert top == ["gov_policy", "gov_ciso", "gov_risk"]


def test_answer_driven_keeps_the_severity_filter_of_strong_domains():
    strong = {"dom_gov": 90.0, "dom_acc": 90.0}
    top = _top({"q1": 1, "q2": 1, "q3": 1, "q8": 1, "q10": 1}, scores=strong)
    assert top == ["acc_review"]


def test_answer_driven_ignores_unanswered_questions():
    assert _top({}) == ["gov_change"]


# ---- Replay : contribution de chaque réponse au score (get_score_contributions) ----

import pytest  # noqa: E402

from api import catalog  # noqa: E402


@pytest.fixture(params=["PME Finance", "PME Commerce", "PME Technologie"])
def demo_profile(request):
    profile = next(p for p in catalog.demo_profiles() if p["name"] == request.param)
    grouped = scoring.group_responses_by_domain(profile["responses"], catalog.question_domain_map())
    return profile["responses"], scoring.score_full_audit(grouped)["global_score"]


def test_contributions_explain_exactly_the_points_lost(demo_profile):
    responses, global_score = demo_profile
    contributions = scoring.get_score_contributions(responses, catalog.question_domain_map())

    assert len(contributions) == 25
    assert round(sum(c["points_lost"] for c in contributions), 1) == round(100 - global_score, 1)


def test_contributions_are_sorted_from_the_most_penalizing_answer(demo_profile):
    responses, _ = demo_profile
    contributions = scoring.get_score_contributions(responses, catalog.question_domain_map())

    losses = [c["points_lost"] for c in contributions]
    assert losses == sorted(losses, reverse=True)
    worst = contributions[0]
    assert worst["value"] == min(responses.values())


def test_each_answer_step_is_worth_one_point_with_five_domains_of_five_questions():
    mapping = catalog.question_domain_map()
    responses = {qid: 5 for qid in mapping}
    responses.update(q16=1, q8=4)

    contributions = scoring.get_score_contributions(responses, mapping)

    assert contributions[0] == {"question_id": "q16", "domain_id": "dom_inc", "value": 1, "points_lost": 4.0}
    assert contributions[1]["question_id"] == "q8" and contributions[1]["points_lost"] == 1.0
    assert all(c["points_lost"] == 0 for c in contributions[2:])


def test_contributions_keep_question_order_on_ties_and_do_not_mutate_input():
    mapping = {"a1": "d1", "a2": "d1", "b1": "d2"}
    responses = {"a1": 1, "a2": 1, "b1": 1}
    snapshot = dict(responses)

    contributions = scoring.get_score_contributions(responses, mapping)

    # 2 domaines : un domaine pèse 50 points, une question de d1 en pèse 25, celle de d2 en pèse 50.
    assert [c["question_id"] for c in contributions] == ["b1", "a1", "a2"]
    assert [c["points_lost"] for c in contributions] == [50.0, 25.0, 25.0]
    assert responses == snapshot
