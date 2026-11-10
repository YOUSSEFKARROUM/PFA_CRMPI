"""
scoring.py — Moteur de scoring pour l'auto-évaluation cybersécurité.

Implémente les formules définies dans docs/Scoring_Rules_V1.md (Jalon 1).
"""

DOMAIN_ORDER = [
    "dom_gov",
    "dom_acc",
    "dom_infra",
    "dom_inc",
    "dom_sens",
]

MATURITY_LEVELS = [
    (25, "Critique"),
    (50, "Faible"),
    (75, "Moyen"),
    (101, "Avancé"),
]


def calculate_domain_score(responses: list) -> float:
    """
    responses: liste de 5 réponses Likert (1-5) pour un domaine.
    returns: score du domaine (0-100), arrondi à 1 décimale.
    """
    if not responses or len(responses) == 0:
        return 0.0
    avg = sum(responses) / len(responses)
    score = ((avg - 1) / 4) * 100
    return round(max(0.0, min(100.0, score)), 1)


def calculate_domain_scores(responses_by_domain: dict) -> dict:
    """
    responses_by_domain: {domain_id: [r1, r2, r3, r4, r5], ...}
    returns: {domain_id: score, ...}
    """
    return {domain_id: calculate_domain_score(resp) for domain_id, resp in responses_by_domain.items()}


def calculate_global_score(domain_scores: dict) -> float:
    """
    domain_scores: {domain_id: score, ...}
    returns: score global (0-100), arrondi à 1 décimale.
    """
    if not domain_scores:
        return 0.0
    values = list(domain_scores.values())
    return round(sum(values) / len(values), 1)


def get_maturity_level(score: float) -> str:
    for threshold, label in MATURITY_LEVELS:
        if score < threshold:
            return label
    return "Avancé"


def get_severity_filter(domain_score: float) -> tuple:
    """
    Retourne (liste de sévérités à filtrer, nombre max de recommandations)
    selon la logique définie dans Scoring_Rules_V1.md section 6.
    """
    if domain_score < 60:
        return (["Critical", "High"], 3)
    return (["Medium", "Low"], 1)


def generate_recommendations(domain_scores: dict, get_recs_fn) -> dict:
    """
    domain_scores: {domain_id: score, ...}
    get_recs_fn: fonction(domain_id, severities) -> liste de recommandations (depuis la DB)
    returns: {domain_id: [recommandations filtrées et limitées], ...}

    Utilisé pour l'affichage détaillé à l'écran (une sélection par domaine).
    """
    result = {}
    for domain_id, score in domain_scores.items():
        severities, limit = get_severity_filter(score)
        recs = get_recs_fn(domain_id, severities)
        result[domain_id] = recs[:limit]
    return result


LIKERT_MIN, LIKERT_MAX = 1, 5


def get_score_contributions(responses: dict, question_domain_map: dict) -> list:
    """
    Replay du score : points perdus par chaque réponse sur le score global (0-100).

    Fonction pure, cohérente avec calculate_domain_score / calculate_global_score :
    une question pèse 100 / (nb de domaines × nb de questions du domaine) points,
    répartis sur les 4 crans de l'échelle de réponse. Avec 5 domaines de 5 questions,
    chaque cran vaut 1 point : une réponse à 1 coûte 4 points, une réponse à 5 n'en coûte aucun.
    La somme des points perdus vaut donc 100 - score global (aux arrondis près).

    returns: [{question_id, domain_id, value, points_lost}], de la réponse la plus
             pénalisante à la moins pénalisante (ordre du questionnaire en cas d'égalité).
    """
    answered = [(qid, domain_id) for qid, domain_id in question_domain_map.items() if qid in responses]
    domains = {domain_id for _, domain_id in answered}
    questions_per_domain = {d: sum(1 for _, domain_id in answered if domain_id == d) for d in domains}
    steps = LIKERT_MAX - LIKERT_MIN

    contributions = [
        {
            "question_id": qid,
            "domain_id": domain_id,
            "value": responses[qid],
            "points_lost": round(
                (LIKERT_MAX - responses[qid]) / steps * 100 / len(domains) / questions_per_domain[domain_id], 2
            ),
        }
        for qid, domain_id in answered
    ]
    order = {qid: index for index, (qid, _) in enumerate(answered)}
    return sorted(contributions, key=lambda c: (-c["points_lost"], order[c["question_id"]]))


SEVERITY_RANK = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
MAX_RECOMMENDATIONS_PER_DOMAIN = 2


def recommendation_applies(recommendation: dict, responses: dict) -> bool:
    """
    Une recommandation liée à une question ne s'applique que si la réponse est
    inférieure ou égale à son seuil (trigger_max). Une recommandation générale
    (sans question) s'applique toujours.
    """
    question_id = recommendation.get("question_id")
    if question_id is None:
        return True
    answer = responses.get(question_id)
    return answer is not None and answer <= recommendation["trigger_max"]


def _answer_gap(recommendation: dict, responses: dict) -> int:
    question_id = recommendation.get("question_id")
    return recommendation["trigger_max"] - responses[question_id] if question_id else 0


def _pick_diverse(candidates: list, limit: int) -> list:
    """
    Trois passes, dans l'ordre de priorité des candidats :
    1. au plus MAX_RECOMMENDATIONS_PER_DOMAIN par domaine et une seule par question ;
    2. une seule par question, sans plafond de domaine ;
    3. complément libre si la limite n'est toujours pas atteinte.
    """
    picked = []

    def run_pass(is_allowed) -> None:
        for candidate in candidates:
            if len(picked) == limit:
                return
            if candidate not in picked and is_allowed(candidate):
                picked.append(candidate)

    def new_question(candidate: dict) -> bool:
        question_id = candidate.get("question_id")
        return question_id is None or all(p.get("question_id") != question_id for p in picked)

    def domain_has_room(candidate: dict) -> bool:
        same_domain = sum(1 for p in picked if p["domain_id"] == candidate["domain_id"])
        return same_domain < MAX_RECOMMENDATIONS_PER_DOMAIN

    run_pass(lambda c: new_question(c) and domain_has_room(c))
    run_pass(new_question)
    run_pass(lambda c: True)
    return picked


def generate_top_recommendations(domain_scores: dict, get_recs_fn, limit: int = 3, responses: dict = None) -> list:
    """
    Sélectionne un total global de `limit` recommandations (2-3, conformément au
    brief Jalon 3 : "score + 2-3 recommandations selon les réponses faibles"),
    en priorisant les domaines les plus faibles. Pour chaque domaine, la sévérité
    interrogée dépend de son propre score (get_severity_filter) : un domaine sous
    60% remonte des recommandations Critical/High, un domaine déjà bon ne remonte
    que des pistes d'optimisation Medium/Low — jamais une alerte "Haute" sur un
    domaine déjà maîtrisé.

    Avec `responses` ({question_id: valeur}), la sélection est pilotée par les
    réponses : une recommandation liée à une question n'est retenue que si la
    réponse est <= son seuil (on ne recommande jamais une pratique déjà déclarée),
    les recommandations générales passent après, et la diversité est assurée
    (une par question, au plus MAX_RECOMMENDATIONS_PER_DOMAIN par domaine).

    domain_scores: {domain_id: score, ...}
    get_recs_fn: fonction(domain_id, severities) -> liste de recommandations (depuis la DB)
    returns: liste plate de recommandations (chacune enrichie de sa clé "domain_id"),
             de longueur <= limit
    """
    weakest_order = [d for d, _ in sorted(domain_scores.items(), key=lambda kv: kv[1])]
    domain_rank = {domain_id: i for i, domain_id in enumerate(weakest_order)}

    candidates = []
    for domain_id in weakest_order:
        severities, _ = get_severity_filter(domain_scores[domain_id])
        for r in get_recs_fn(domain_id, severities):
            if responses is None or recommendation_applies(r, responses):
                candidates.append({**r, "domain_id": domain_id})

    if responses is None:
        candidates.sort(key=lambda r: (
            domain_rank[r["domain_id"]],
            SEVERITY_RANK.get(r.get("severity"), 9),
            r.get("priority", 99),
        ))
        return candidates[:limit]

    candidates.sort(key=lambda r: (
        r.get("question_id") is None,
        domain_rank[r["domain_id"]],
        SEVERITY_RANK.get(r.get("severity"), 9),
        -_answer_gap(r, responses),
        r.get("priority", 99),
    ))
    return _pick_diverse(candidates, limit)


def score_full_audit(all_responses: dict) -> dict:
    """
    Fonction principale : calcule le score complet d'un audit.

    all_responses: {question_id: response(1-5), ...} — 25 entrées
    Nécessite un mapping question_id -> domain_id (fourni séparément via la DB
    dans l'application ; ici on suppose que all_responses est déjà groupé par domaine
    via `group_responses_by_domain`).

    returns: {
        "domain_scores": {domain_id: score},
        "global_score": float,
        "maturity_level": str
    }
    """
    domain_scores = calculate_domain_scores(all_responses)
    global_score = calculate_global_score(domain_scores)
    level = get_maturity_level(global_score)
    return {
        "domain_scores": domain_scores,
        "global_score": global_score,
        "maturity_level": level,
    }


def group_responses_by_domain(responses: dict, question_domain_map: dict) -> dict:
    """
    responses: {question_id: value}
    question_domain_map: {question_id: domain_id}
    returns: {domain_id: [values...]}
    """
    grouped = {}
    for qid, value in responses.items():
        domain_id = question_domain_map.get(qid)
        if domain_id is None:
            continue
        grouped.setdefault(domain_id, []).append(value)
    return grouped
