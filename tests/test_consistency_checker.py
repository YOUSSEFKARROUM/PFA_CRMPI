"""Tests du contrôle de cohérence déclarative (src/consistency_checker.py)."""
import copy

import pytest

from api import catalog
from src import consistency_checker as cc

RULES = cc.load_rules()


def _base(value: int = 3) -> dict:
    return {qid: value for qid in catalog.question_domain_map()}


def _ids(findings) -> list:
    return [f.rule.id for f in findings]


def _raw_rule(**overrides) -> dict:
    rule = {
        "id": "CR-X", "kind": "prerequisite",
        "if": {"question": "q4", "min": 3}, "then": {"question": "q2", "min": 2},
        "title": "Titre", "rationale": "Justification.", "reference": "ISO/IEC 27001:2022 A.5.2",
    }
    rule.update(overrides)
    return rule


def test_rules_file_loads_with_unique_ids():
    assert len(RULES) >= 25
    assert len({r.id for r in RULES}) == len(RULES)
    assert {r.kind for r in RULES} == set(cc.KINDS)


def test_every_rule_targets_real_questions_and_existing_answer_levels():
    options = {q["id"]: {o["value"] for o in q["options"]}
               for d in catalog.questionnaire()["domains"] for q in d["questions"]}
    for rule in RULES:
        assert rule.if_min in options[rule.if_question], rule.id
        assert rule.then_min in options[rule.then_question], rule.id


def test_graduated_rules_on_the_same_pair_are_reported_once():
    flat_network = {**_base(), "q11": 4, "q15": 1}
    assert _ids(cc.check_consistency(flat_network, RULES)) == ["CR-05"]
    dmz_only = {**_base(), "q11": 4, "q15": 2}
    assert _ids(cc.check_consistency(dmz_only, RULES)) == ["CR-06"]


@pytest.mark.parametrize("rule", RULES, ids=lambda r: r.id)
def test_rule_triggers_when_prerequisite_is_below_its_minimum(rule):
    responses = {**_base(), rule.if_question: rule.if_min, rule.then_question: rule.then_min - 1}
    assert rule.id in _ids(cc.check_consistency(responses, RULES))


@pytest.mark.parametrize("rule", RULES, ids=lambda r: r.id)
def test_rule_stays_silent_when_both_answers_are_consistent(rule):
    responses = {**_base(), rule.if_question: rule.if_min, rule.then_question: rule.then_min}
    assert rule.id not in _ids(cc.check_consistency(responses, RULES))


@pytest.mark.parametrize("rule", RULES, ids=lambda r: r.id)
def test_rule_stays_silent_when_the_advanced_practice_is_not_declared(rule):
    responses = {**_base(), rule.if_question: rule.if_min - 1, rule.then_question: 1}
    assert rule.id not in _ids(cc.check_consistency(responses, RULES))


@pytest.mark.parametrize("profile", catalog.demo_profiles(), ids=lambda p: p["name"])
def test_demo_profiles_trigger_no_rule(profile):
    assert cc.check_consistency(profile["responses"], RULES) == []


@pytest.mark.parametrize("value", [1, 2, 3, 4, 5])
def test_uniform_answers_are_never_inconsistent(value):
    assert cc.check_consistency(_base(value), RULES) == []


def test_findings_follow_rule_order_and_report_both_answers():
    responses = {**_base(), "q24": 4, "q22": 1, "q6": 4, "q8": 1}
    findings = cc.check_consistency(responses, RULES)
    assert _ids(findings) == ["CR-01", "CR-29"]
    first = findings[0]
    assert (first.if_value, first.then_value) == (4, 1)


def test_missing_answers_never_trigger_and_input_is_not_mutated():
    responses = {"q6": 5}
    snapshot = copy.deepcopy(responses)
    assert cc.check_consistency(responses, RULES) == []
    assert responses == snapshot


@pytest.mark.parametrize("overrides, message", [
    ({"kind": "autre"}, "kind"),
    ({"if": {"question": "q4", "min": 1}}, "min"),
    ({"then": {"question": "q2", "min": 4}}, "min"),
    ({"then": {"question": "q4", "min": 2}}, "identiques"),
    ({"if": {"question": "Q4", "min": 3}}, "question"),
    ({"title": "  "}, "title"),
    ({"if": {"question": "q4", "min": "3"}}, "min"),
])
def test_parse_rules_rejects_invalid_definitions(overrides, message):
    with pytest.raises(cc.InvalidRules, match=message):
        cc.parse_rules({"rules": [_raw_rule(**overrides)]})


def test_parse_rules_rejects_duplicates_and_missing_fields():
    with pytest.raises(cc.InvalidRules, match="dupliqué"):
        cc.parse_rules({"rules": [_raw_rule(), _raw_rule()]})
    incomplete = _raw_rule()
    del incomplete["rationale"]
    with pytest.raises(cc.InvalidRules, match="rationale"):
        cc.parse_rules({"rules": [incomplete]})
    with pytest.raises(cc.InvalidRules, match="rules"):
        cc.parse_rules({})
