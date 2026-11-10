"""
consistency_checker.py — Contrôle de cohérence des réponses déclaratives.

Chaque règle a une forme unique : « si la question A atteint le niveau x, la
question B devrait atteindre au moins le niveau y ». Les règles sont des données
(data/rules/consistency_rules.json), validées au chargement.

Couche en lecture seule : ce module n'a AUCUN effet sur calculate_domain_score,
calculate_global_score ou generate_top_recommendations. Il signale des points à
revérifier, sans jamais corriger une réponse ni modifier un score.

Invariant garanti par la validation (2 <= then.min <= if.min <= 5) : un profil
uniforme (toutes les réponses au même niveau) ne déclenche jamais de règle.
"""
import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

RULES_PATH = Path(__file__).resolve().parent.parent / "data" / "rules" / "consistency_rules.json"
KINDS = ("declaration", "prerequisite")
MIN_LEVEL, MAX_LEVEL = 2, 5
_QUESTION_ID = re.compile(r"^q\d+$")
_TEXT_FIELDS = ("title", "rationale", "reference")


class InvalidRules(ValueError):
    """Le fichier de règles est mal formé."""


@dataclass(frozen=True)
class ConsistencyRule:
    id: str
    kind: str
    if_question: str
    if_min: int
    then_question: str
    then_min: int
    title: str
    rationale: str
    reference: str


@dataclass(frozen=True)
class ConsistencyFinding:
    rule: ConsistencyRule
    if_value: int
    then_value: int


def _condition(raw: dict, key: str, rule_id: str) -> tuple:
    condition = raw.get(key)
    if not isinstance(condition, dict):
        raise InvalidRules(f"{rule_id} : champ '{key}' manquant")
    question, level = condition.get("question"), condition.get("min")
    if not isinstance(question, str) or not _QUESTION_ID.match(question):
        raise InvalidRules(f"{rule_id} : identifiant de question invalide dans '{key}'")
    if isinstance(level, bool) or not isinstance(level, int) or not MIN_LEVEL <= level <= MAX_LEVEL:
        raise InvalidRules(f"{rule_id} : '{key}.min' doit être un entier entre {MIN_LEVEL} et {MAX_LEVEL}")
    return question, level


def _parse_rule(raw: dict) -> ConsistencyRule:
    rule_id = raw.get("id") or "?"
    if raw.get("kind") not in KINDS:
        raise InvalidRules(f"{rule_id} : kind doit valoir {' ou '.join(KINDS)}")
    for field in _TEXT_FIELDS:
        if not isinstance(raw.get(field), str) or not raw[field].strip():
            raise InvalidRules(f"{rule_id} : champ '{field}' manquant ou vide")
    if_question, if_min = _condition(raw, "if", rule_id)
    then_question, then_min = _condition(raw, "then", rule_id)
    if if_question == then_question:
        raise InvalidRules(f"{rule_id} : questions 'if' et 'then' identiques")
    if then_min > if_min:
        raise InvalidRules(f"{rule_id} : 'then.min' ne peut dépasser 'if.min' (profil uniforme incohérent)")
    return ConsistencyRule(
        id=rule_id, kind=raw["kind"],
        if_question=if_question, if_min=if_min, then_question=then_question, then_min=then_min,
        title=raw["title"].strip(), rationale=raw["rationale"].strip(), reference=raw["reference"].strip(),
    )


def parse_rules(document: dict) -> tuple:
    """Valide et convertit le document JSON en règles immuables (ordre conservé)."""
    raw_rules = document.get("rules") if isinstance(document, dict) else None
    if not isinstance(raw_rules, list):
        raise InvalidRules("le document doit contenir une liste 'rules'")
    rules = tuple(_parse_rule(raw) for raw in raw_rules)
    seen = set()
    for rule in rules:
        if rule.id in seen:
            raise InvalidRules(f"identifiant dupliqué : {rule.id}")
        seen.add(rule.id)
    return rules


@lru_cache(maxsize=1)
def load_rules() -> tuple:
    return parse_rules(json.loads(RULES_PATH.read_text(encoding="utf-8")))


def check_consistency(responses: dict, rules: tuple) -> list:
    """
    Retourne les règles enfreintes, dans l'ordre des règles.

    Les réponses absentes ne déclenchent rien. Des règles graduées peuvent porter
    sur la même paire de questions : une seule est alors signalée (la première
    dans l'ordre du fichier), pour ne jamais compter deux fois le même écart.
    """
    findings, flagged_pairs = [], set()
    for rule in rules:
        pair = (rule.if_question, rule.then_question)
        if_value, then_value = responses.get(rule.if_question), responses.get(rule.then_question)
        if pair in flagged_pairs or if_value is None or then_value is None:
            continue
        if if_value >= rule.if_min and then_value < rule.then_min:
            findings.append(ConsistencyFinding(rule, if_value, then_value))
            flagged_pairs.add(pair)
    return findings
