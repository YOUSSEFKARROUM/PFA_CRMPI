"""
pdf_annex.py — Pages complémentaires du rapport Pentascore (après la synthèse).

- Plan d'action classé par effort (toutes les mesures déclenchées par les réponses) ;
- Bons réflexes en cas d'incident (Guide AUSIM-CMRPI 2018, annexe 5.2) ;
- Annexe : les 25 réponses déclarées, puis la méthodologie et les limites.

Module de présentation pur : il ne calcule rien, il met en forme ce que lui
transmet api/services.py.
"""
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, Spacer, Table, TableStyle

INK = colors.HexColor("#10202F")
MUTED = colors.HexColor("#5A6470")
RULE = colors.HexColor("#D9D6CC")
PAPER_DEEP = colors.HexColor("#F1EEE3")
GOLD_HEX = "#A9824C"

EFFORT_GROUPS = (
    ("Faible", "Actions rapides", "effort faible, à engager dans les 30 jours"),
    ("Moyen", "Moyen terme", "effort moyen, à planifier sur 3 mois"),
    ("Eleve", "Chantiers structurants", "effort élevé, à inscrire dans un plan sur 6 à 12 mois"),
)
MAX_ACTIONS_PER_GROUP = 5

INCIDENT_REFLEXES = (
    "Déconnectez la machine du réseau sans l'éteindre ni la redémarrer, pour stopper l'attaque "
    "sans effacer les traces utiles à l'analyse.",
    "Prévenez la direction et le responsable sécurité par téléphone ou de vive voix : "
    "l'intrus peut lire les courriels.",
    "Faites appel à un prestataire informatique pour l'analyse et la restauration, et recherchez les traces "
    "sur les autres équipements (pare-feu, routeurs, détection d'intrusion).",
    "Déposez plainte auprès de la police judiciaire ou de la gendarmerie compétente ; si des données "
    "personnelles sont concernées, contactez la CNDP.",
    "Après l'incident : réinstallez à partir d'une version saine, restaurez une sauvegarde non compromise "
    "et changez tous les mots de passe.",
)
INCIDENT_SOURCE = (
    "Source : Guide AUSIM-CMRPI 2018 « Les PME marocaines, comment faire face aux menaces cybernétiques ? », "
    "annexe 5.2."
)


def _methodology(facts: dict) -> tuple:
    return (
        "<b>Questionnaire</b> : 25 questions déclaratives, 5 domaines de 5 questions, réponses graduées de 1 à 5.",
        "<b>Score</b> : chaque domaine vaut (moyenne des réponses − 1) / 4 × 100 ; le score global est la moyenne "
        "des 5 domaines, à pondération égale. Niveaux : Critique &lt; 25 ≤ Faible &lt; 50 ≤ Moyen &lt; 75 ≤ Avancé.",
        f"<b>Recommandations</b> : base de {facts['recommendation_count']} mesures. Une mesure n'est proposée que "
        "si la réponse à la question correspondante est inférieure ou égale à un seuil fixé : aucune mesure n'est "
        "proposée pour une pratique déjà déclarée. Sources : Guide AUSIM-CMRPI 2018 (PME marocaines) et "
        "ISO/IEC 27001:2022.",
        f"<b>Cohérence</b> : {facts['rule_count']} règles signalent les réponses incompatibles, "
        "sans modifier le score.",
        "<b>Limites</b> : auto-évaluation déclarative, sans vérification technique ni entretien ; ce rapport ne "
        "vaut ni audit ni certification. Le calcul est déterministe : les mêmes réponses produisent toujours "
        f"le même résultat et la même référence ({escape(facts['report_id'])}).",
    )


def _bullet(text: str, styles) -> Paragraph:
    return Paragraph(f"<font color='{GOLD_HEX}'>&#9679;</font>&nbsp;&nbsp;{text}", styles["PentaAnnexItem"])


def _action_line(action: dict) -> str:
    trigger = action.get("trigger")
    why = f"Q{trigger['number']} « {escape(trigger['answer'])} »" if trigger else "bonne pratique générale"
    sources = " · ".join(escape(s) for s in (action.get("guide_ref"), action.get("reference")) if s)
    flag = "<font color='#0A7D68'><b>Priorité</b></font> · " if action.get("is_priority") else ""
    return (
        f"<b>{escape(action['text_fr'])}</b><br/>"
        f"<font size=7.5 color='#5A6470'>{flag}{why}{' · ' + sources if sources else ''}</font>"
    )


def _action_plan(actions: list, styles) -> list:
    story = [
        Paragraph("Plan d'action", styles["PentaH2"]),
        Paragraph(
            "Vos priorités, puis les autres mesures déclenchées par vos réponses, regroupées par effort de mise "
            "en œuvre (au plus cinq par groupe, les plus sévères d'abord).",
            styles["PentaSmall"],
        ),
    ]
    for effort, title, subtitle in EFFORT_GROUPS:
        group = [a for a in actions if a.get("effort") == effort][:MAX_ACTIONS_PER_GROUP]
        if not group:
            continue
        story.append(Paragraph(
            f"{title.upper()} <font color='#5A6470'>· {subtitle}</font>", styles["PentaAnnexHead"]))
        story.extend(_bullet(_action_line(a), styles) for a in group)
    if len(story) == 2:
        story.append(_bullet("Aucune mesure n'est déclenchée par vos réponses : maintenez vos pratiques "
                             "et réévaluez-vous régulièrement.", styles))
    return story


def _incident_box(styles) -> Table:
    rows = [[Paragraph("En cas d'incident : les bons réflexes", styles["PentaH2"])]]
    rows += [[_bullet(escape(text), styles)] for text in INCIDENT_REFLEXES]
    rows.append([Paragraph(escape(INCIDENT_SOURCE), styles["PentaSmall"])])
    box = Table(rows, colWidths=[17 * cm])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER_DEEP),
        ("LINEBEFORE", (0, 0), (0, -1), 2, colors.HexColor(GOLD_HEX)),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
    ]))
    return box


def _answers_table(answers: list, domain_labels: dict, styles) -> Table:
    rows = [[Paragraph("<b>N°</b>", styles["PentaAnnexCell"]), Paragraph("<b>Question</b>", styles["PentaAnnexCell"]),
             Paragraph("<b>Réponse déclarée</b>", styles["PentaAnnexCell"])]]
    section_rows = []
    current_domain = None
    for answer in answers:
        if answer["domain_id"] != current_domain:
            current_domain = answer["domain_id"]
            section_rows.append(len(rows))
            rows.append([Paragraph(
                f"<b>{escape(domain_labels.get(current_domain, current_domain).upper())}</b>",
                styles["PentaAnnexCell"]), "", ""])
        rows.append([
            Paragraph(str(answer["number"]), styles["PentaAnnexCell"]),
            Paragraph(escape(answer["text"]), styles["PentaAnnexCell"]),
            Paragraph(f"{escape(answer['answer'])} <font color='#5A6470'>({answer['value']}/5)</font>",
                      styles["PentaAnnexCell"]),
        ])
    table = Table(rows, colWidths=[1 * cm, 10.6 * cm, 5.4 * cm], repeatRows=1)
    style = [
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
    ]
    for index in section_rows:
        style += [("SPAN", (0, index), (-1, index)), ("BACKGROUND", (0, index), (-1, index), PAPER_DEEP)]
    table.setStyle(TableStyle(style))
    return table


def annex_flowables(annex: dict, domain_labels: dict, styles) -> list:
    """
    annex: {
      "report_id": str,
      "actions": [{text_fr, effort, severity, trigger|None, reference, guide_ref, is_priority}],
      "answers": [{number, domain_id, text, answer, value}],
      "facts": {"recommendation_count": int, "rule_count": int},
    }
    """
    facts = {**annex["facts"], "report_id": annex["report_id"]}
    return [
        PageBreak(),
        Paragraph(f"DÉTAIL DE L'ÉVALUATION · RÉF. {escape(annex['report_id'])}", styles["PentaEyebrow"]),
        *_action_plan(annex["actions"], styles),
        Spacer(1, 10),
        KeepTogether(_incident_box(styles)),
        PageBreak(),
        Paragraph(f"ANNEXE · VOS RÉPONSES · RÉF. {escape(annex['report_id'])}", styles["PentaEyebrow"]),
        Paragraph(
            "Réponses déclarées lors de l'évaluation. Elles fondent le score, les priorités et le plan d'action ; "
            "conservez-les pour comparer lors de votre prochaine évaluation.",
            styles["PentaSmall"],
        ),
        Spacer(1, 6),
        _answers_table(annex["answers"], domain_labels, styles),
        KeepTogether([
            Paragraph("Méthodologie et limites", styles["PentaH2"]),
            *(_bullet(text, styles) for text in _methodology(facts)),
        ]),
    ]
