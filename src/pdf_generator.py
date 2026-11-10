"""
pdf_generator.py — Génération du rapport PDF d'auto-évaluation (ReportLab).

Identité visuelle Pentascore : palette navy / émeraude / or / corail, score en
composition typographique et radar pentagonal (5 domaines = 5 côtés), identique
au motif de l'application web.
"""
import math
from datetime import datetime
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Circle, Drawing, Line, Polygon, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from src.pdf_annex import annex_flowables

# ===== Identité Pentascore (alignée sur frontend/src/styles/tokens.css) =====
INK = colors.HexColor("#10202F")
EMERALD = colors.HexColor("#0A7D68")
GOLD = colors.HexColor("#A9824C")
CORAL = colors.HexColor("#D24A2E")
MUTED = colors.HexColor("#5A6470")
RULE = colors.HexColor("#D9D6CC")
# Contour extérieur et graduations du radar (instrument de mesure, docs/design/DIRECTION.md).
RADAR_OUTER = colors.HexColor("#A3A8AC")
PAPER = colors.HexColor("#FAF8F2")
WHITE = colors.white

DOMAIN_LABELS_FR = {
    "dom_gov": "Gouvernance",
    "dom_acc": "Accès & Identités",
    "dom_infra": "Infrastructure & Réseau",
    "dom_inc": "Incidents & Continuité",
    "dom_sens": "Sensibilisation & Formation",
}

RADAR_LABELS_FR = {
    "dom_gov": "GOUV.",
    "dom_acc": "ACCÈS",
    "dom_infra": "INFRA.",
    "dom_inc": "INCID.",
    "dom_sens": "SENSIB.",
}

SEVERITY_LABELS_FR = {
    "Critical": "Critique",
    "High": "Haute",
    "Medium": "Moyenne",
    "Low": "Basse",
}

SEVERITY_COLORS = {
    "Critical": "#D24A2E",
    "High": "#A9824C",
    "Medium": "#5A6470",
    "Low": "#0A7D68",
}

DISCLAIMER = (
    "Auto-évaluation déclarative : ce score reflète uniquement les réponses fournies par "
    "l'organisation. Il constitue un premier repère et ne remplace pas un audit de sécurité "
    "réalisé par un expert."
)


def _severity_color(severity: str) -> str:
    return SEVERITY_COLORS.get(severity, "#0A7D68")


def _maturity_label(score: float) -> str:
    if score < 25:
        return "Critique"
    if score < 50:
        return "Faible"
    if score < 75:
        return "Moyen"
    return "Avancé"


MATURITY_HEADLINES_FR = {
    "Critique": "Maturité critique",
    "Faible": "Maturité faible",
    "Moyen": "Maturité moyenne",
    "Avancé": "Maturité avancée",
}


def _score_color(score: float):
    if score < 25:
        return CORAL
    if score < 50:
        return GOLD
    return EMERALD


PDF_MAX_CONSISTENCY_CHECKS = 3


def _styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="PentaBrand", fontSize=13, textColor=INK, fontName="Helvetica-Bold", spaceAfter=2))
    styles.add(ParagraphStyle(
        name="PentaEyebrow", fontSize=8, textColor=EMERALD, fontName="Courier-Bold", spaceAfter=10))
    styles.add(ParagraphStyle(
        name="PentaTitle", fontSize=20, textColor=INK, fontName="Times-Roman", leading=24, spaceAfter=12))
    styles.add(ParagraphStyle(
        name="PentaH2", fontSize=14, textColor=INK, fontName="Times-Roman", spaceBefore=8, spaceAfter=5))
    styles.add(ParagraphStyle(
        name="PentaBody", fontSize=10, textColor=INK, spaceAfter=6, alignment=TA_LEFT, leading=14))
    styles.add(ParagraphStyle(name="PentaSmall", fontSize=8, textColor=MUTED, leading=11))
    styles.add(ParagraphStyle(
        name="PentaChecksHead", fontSize=8, textColor=GOLD, fontName="Courier-Bold",
        leading=11, spaceBefore=8, spaceAfter=1))
    styles.add(ParagraphStyle(name="PentaCheck", fontSize=8.5, textColor=INK, leading=11.5, leftIndent=2))
    styles.add(ParagraphStyle(
        name="PentaAnnexItem", fontSize=8.5, textColor=INK, leading=11.5, leftIndent=12, firstLineIndent=-12,
        spaceAfter=3))
    styles.add(ParagraphStyle(
        name="PentaAnnexHead", fontSize=8, textColor=GOLD, fontName="Courier-Bold", leading=11,
        spaceBefore=8, spaceAfter=3))
    styles.add(ParagraphStyle(name="PentaAnnexCell", fontSize=7.5, textColor=INK, leading=9.5))
    styles.add(ParagraphStyle(
        name="PentaQrCaption", fontSize=7.5, textColor=INK, leading=9, spaceAfter=2, alignment=TA_RIGHT,
        rightIndent=6))
    styles.add(ParagraphStyle(
        name="PentaScore", fontSize=44, textColor=INK, fontName="Courier-Bold", leading=46))
    return styles


def _pentagon_point(cx: float, cy: float, radius: float, index: int) -> tuple:
    """Sommet `index` d'un pentagone régulier, premier sommet en haut (repère ReportLab, y vers le haut)."""
    angle = math.radians(90 - index * 72)
    return cx + radius * math.cos(angle), cy + radius * math.sin(angle)


def _radar(domain_scores: dict) -> Drawing:
    """Radar pentagonal des scores de domaine (anneaux à 25/50/75/100)."""
    width, height, cx, cy, radius = 200, 186, 100, 92, 64
    drawing = Drawing(width, height)
    domain_ids = list(domain_scores.keys())

    for ring in (0.25, 0.5, 0.75, 1.0):
        points = [c for i in range(5) for c in _pentagon_point(cx, cy, radius * ring, i)]
        outline = RADAR_OUTER if ring == 1.0 else RULE
        drawing.add(Polygon(points, fillColor=None, strokeColor=outline, strokeWidth=0.6))
    for i in range(5):
        x, y = _pentagon_point(cx, cy, radius, i)
        drawing.add(Line(cx, cy, x, y, strokeColor=RULE, strokeWidth=0.6))
        # Graduations d'instrument tous les 10 points (même signature que l'écran de résultats).
        for tick in range(1, 10):
            tx, ty = _pentagon_point(cx, cy, radius * tick / 10, i)
            drawing.add(Circle(tx, ty, 0.75 if tick == 5 else 0.4, fillColor=RADAR_OUTER, strokeColor=None))

    shape = [c for i, domain_id in enumerate(domain_ids[:5])
             for c in _pentagon_point(cx, cy, radius * domain_scores[domain_id] / 100, i)]
    drawing.add(Polygon(shape, fillColor=colors.Color(10 / 255, 125 / 255, 104 / 255, alpha=0.14),
                        strokeColor=EMERALD, strokeWidth=1.4, strokeLineJoin=1))
    for i, domain_id in enumerate(domain_ids[:5]):
        x, y = _pentagon_point(cx, cy, radius * domain_scores[domain_id] / 100, i)
        drawing.add(Circle(x, y, 2.2, fillColor=colors.white, strokeColor=EMERALD, strokeWidth=1.1))
        lx, ly = _pentagon_point(cx, cy, radius + 20, i)
        drawing.add(String(lx, ly + 2, RADAR_LABELS_FR.get(domain_id, domain_id), textAnchor="middle",
                           fontName="Courier", fontSize=6.5, fillColor=MUTED))
        drawing.add(String(lx, ly - 7, f"{domain_scores[domain_id]:.0f}", textAnchor="middle",
                           fontName="Courier-Bold", fontSize=8, fillColor=_score_color(domain_scores[domain_id])))
    return drawing


REVISIT_INVITATION = "Refaites votre évaluation dans 6 mois"
QR_SIZE = 1.75 * cm


def qr_drawing(url: str, size: float = QR_SIZE) -> Drawing:
    """QR code vectoriel, généré en mémoire par ReportLab (aucun fichier temporaire, aucun réseau)."""
    widget = QrCodeWidget(url, barLevel="M")
    x0, y0, x1, y1 = widget.getBounds()
    drawing = Drawing(size, size, transform=[size / (x1 - x0), 0, 0, size / (y1 - y0), 0, 0])
    drawing.add(widget)
    return drawing


def _revisit_block(url: str, styles) -> Table:
    caption = [
        Paragraph(f"<b>{REVISIT_INVITATION}</b>", styles["PentaQrCaption"]),
        Paragraph(
            f"<font name='Courier' size=6.5 color='#5A6470'>{escape(url.split('://', 1)[-1])}</font>",
            styles["PentaQrCaption"],
        ),
    ]
    block = Table([[caption, qr_drawing(url)]], colWidths=[3.85 * cm, QR_SIZE])
    block.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return block


def _identity_block(pme_name: str, sector: str, audit_date: str, revisit_url: str, styles):
    """Identité de l'évaluation, avec à droite le QR code de réévaluation si une URL est fournie."""
    if not revisit_url:
        return _identity_table(pme_name, sector, audit_date)
    block = Table(
        [[_identity_table(pme_name, sector, audit_date, width=11.1 * cm), _revisit_block(revisit_url, styles)]],
        colWidths=[11.4 * cm, 5.6 * cm],
    )
    block.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return block


IDENTITY_VALUE_STYLE = ParagraphStyle(name="PentaIdentityValue", fontSize=9, textColor=INK, leading=11)


def _identity_table(pme_name: str, sector: str, audit_date: str, width: float = 17 * cm) -> Table:
    values = (pme_name, sector or "Non spécifié", audit_date)
    labels = ("Organisation", "Secteur", "Date de l'évaluation")
    table = Table(
        [[label, Paragraph(escape(value), IDENTITY_VALUE_STYLE)] for label, value in zip(labels, values)],
        colWidths=[4.2 * cm, width - 4.2 * cm],
    )
    table.setStyle(TableStyle([
        ("TEXTCOLOR", (0, 0), (0, -1), MUTED),
        ("TEXTCOLOR", (1, 0), (1, -1), INK),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, RULE),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def _score_block(global_score: float, maturity_level: str, domain_scores: dict, styles) -> Table:
    left = [
        Paragraph(f"{global_score:.0f}<font size=16 color='#8A9099'>/100</font>", styles["PentaScore"]),
        Spacer(1, 6),
        Paragraph(
            f"<font color='{_score_color(global_score).hexval().replace('0x', '#')}'>"
            f"{escape(MATURITY_HEADLINES_FR.get(maturity_level, maturity_level))}</font>",
            styles["PentaTitle"]),
    ]
    block = Table([[left, _radar(domain_scores)]], colWidths=[8.5 * cm, 8.5 * cm])
    block.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    return block


def _domain_table(domain_scores: dict) -> Table:
    rows = [["Domaine", "Score", "Niveau"]]
    for domain_id, score in domain_scores.items():
        rows.append([DOMAIN_LABELS_FR.get(domain_id, domain_id), f"{score:.0f}/100", _maturity_label(score)])
    table = Table(rows, colWidths=[10 * cm, 3.5 * cm, 3.5 * cm])
    style = [
        ("FONTNAME", (0, 0), (-1, 0), "Courier-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 7.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), MUTED),
        ("FONTSIZE", (0, 1), (-1, -1), 9.5),
        ("FONTNAME", (1, 1), (1, -1), "Courier-Bold"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, RULE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
    ]
    for row_index, score in enumerate(domain_scores.values(), start=1):
        style.append(("TEXTCOLOR", (2, row_index), (2, row_index), _score_color(score)))
    table.setStyle(TableStyle(style))
    return table


def _recommendation_paragraphs(recommendations: list, styles) -> list:
    story = []
    for rank, rec in enumerate(recommendations, start=1):
        severity = rec.get("severity", "")
        severity_fr = SEVERITY_LABELS_FR.get(severity, severity)
        domain_label = DOMAIN_LABELS_FR.get(rec.get("domain_id", ""), "")
        trigger = rec.get("trigger")
        why = (
            f"&nbsp;&nbsp;<font size=8 color='#5A6470'>· parce que Q{trigger['number']} "
            f"« {escape(trigger['answer'])} »</font>" if trigger else ""
        )
        story.append(Paragraph(
            f"<font name='Courier' color='#8A9099'>{rank:02d}</font>&nbsp;&nbsp;"
            f"<b>{escape(rec.get('text_fr', ''))}</b><br/>"
            f"<font size=8 color='#5A6470'>{escape(domain_label)}</font>&nbsp;&nbsp;"
            f"<font name='Courier-Bold' size=8 color='{_severity_color(severity)}'>"
            f"{escape(severity_fr.upper())}</font>{why}",
            styles["PentaBody"],
        ))
        story.append(Spacer(1, 4))
    return story


def _consistency_paragraphs(checks: list, styles) -> list:
    """
    Section compacte « Points à revérifier » : écarts entre réponses, sans effet sur le score.
    Une ligne par point (le détail complet reste dans l'application).
    """
    if not checks:
        return []
    shown = checks[:PDF_MAX_CONSISTENCY_CHECKS]
    story = [
        Paragraph(f"POINTS À REVÉRIFIER · {len(checks)}", styles["PentaChecksHead"]),
        Paragraph(
            "Réponses qui semblent incompatibles. Sans effet sur le score : à vérifier avant diffusion.",
            styles["PentaSmall"],
        ),
    ]
    for check in shown:
        numbers = " et ".join(str(q["number"]) for q in check.get("questions", []))
        story.append(Paragraph(
            f"<font color='#A9824C'>&#9679;</font>&nbsp;&nbsp;{escape(check.get('title', ''))}"
            f"&nbsp;&nbsp;<font name='Courier' color='#5A6470'>questions {escape(numbers)}</font>",
            styles["PentaCheck"],
        ))
    remaining = len(checks) - len(shown)
    if remaining:
        plural = "s" if remaining > 1 else ""
        story.append(Paragraph(
            f"+ {remaining} autre{plural} point{plural}, détaillé{plural} dans l'application.", styles["PentaSmall"]
        ))
    return story


def _footer(report_id: str):
    def draw(canvas, doc) -> None:
        canvas.saveState()
        # Filet de relevé, comme l'en-tête de l'écran de résultats.
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.5)
        canvas.line(doc.leftMargin, 0.95 * cm, A4[0] - doc.rightMargin, 0.95 * cm)
        canvas.setFont("Courier", 7)
        canvas.setFillColor(MUTED)
        canvas.drawString(doc.leftMargin, 0.55 * cm, f"Pentascore · Réf. {report_id}")
        canvas.drawRightString(A4[0] - doc.rightMargin, 0.55 * cm, f"page {doc.page}")
        canvas.restoreState()
    return draw


def generate_audit_report(
    pme_name: str,
    sector: str,
    audit_date: str,
    domain_scores: dict,
    global_score: float,
    maturity_level: str,
    recommendations: list,
    output_path: str = None,
    consistency_checks: list = None,
    annex: dict = None,
    revisit_url: str = None,
) -> bytes:
    """
    Génère le rapport PDF d'auto-évaluation.

    domain_scores: {domain_id: score}
    recommendations: liste plate de 2-3 recommandations globales
                     (voir scoring.generate_top_recommendations), chacune avec
                     les clés text_fr, severity, domain_id
    consistency_checks: points à revérifier (title, questions[{number}]), affichés
                        avant les priorités ; sans effet sur les scores
    annex: pages complémentaires (plan d'action, réflexes incident, méthodologie,
           réponses) — voir src/pdf_annex.annex_flowables ; absent = rapport d'une page
    revisit_url: adresse de l'application, encodée dans un QR code « Refaites votre
                 évaluation dans 6 mois » à droite du bloc d'identité
    returns: bytes du PDF (et l'écrit dans output_path si fourni)
    """
    styles = _styles()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        output_path if output_path else buffer,
        pagesize=A4, title="Rapport Pentascore", author="Pentascore — CMRPI",
        topMargin=1.1 * cm, bottomMargin=1.1 * cm, leftMargin=2 * cm, rightMargin=2 * cm,
    )

    story = [
        Paragraph("Penta<font color='#0A7D68'>score</font>", styles["PentaBrand"]),
        Paragraph("PAR CMRPI · ESPACE MAROC CYBERCONFIANCE", styles["PentaEyebrow"]),
        Paragraph("Rapport d'auto-évaluation de la maturité cybersécurité", styles["PentaTitle"]),
        _identity_block(pme_name, sector, audit_date, revisit_url, styles),
        Spacer(1, 8),
        _score_block(global_score, maturity_level, domain_scores, styles),
        Spacer(1, 6),
        Paragraph(DISCLAIMER, styles["PentaSmall"]),
        Paragraph("Détail par domaine", styles["PentaH2"]),
        _domain_table(domain_scores),
        *_consistency_paragraphs(consistency_checks or [], styles),
        Paragraph("Vos priorités", styles["PentaH2"]),
        Paragraph(
            "Choisies à partir de vos réponses les plus faibles ; chaque priorité cite la réponse qui la justifie."
            + (" Sources et plan d'action complet en page 2." if annex else ""),
            styles["PentaSmall"],
        ),
        Spacer(1, 6),
        *_recommendation_paragraphs(recommendations, styles),
        Spacer(1, 10),
        Paragraph(
            f"Document généré automatiquement le {datetime.now().strftime('%d/%m/%Y à %H:%M')} — "
            "Pentascore, plateforme d'auto-évaluation cybersécurité du CMRPI. Confidentiel.",
            styles["PentaSmall"],
        ),
    ]
    if annex:
        story.extend(annex_flowables(annex, DOMAIN_LABELS_FR, styles))
        footer = _footer(annex["report_id"])
        doc.build(story, onFirstPage=footer, onLaterPages=footer)
    else:
        doc.build(story)

    if output_path:
        with open(output_path, "rb") as f:
            return f.read()
    return buffer.getvalue()


def _markdown_flowables(markdown: str, styles) -> list:
    """Rendu minimal d'un Markdown maîtrisé (titres #, ##, ###, puces '- ', paragraphes)."""
    flowables, paragraph = [], []

    def flush_paragraph():
        if paragraph:
            flowables.append(Paragraph(escape(" ".join(paragraph)), styles["PentaBody"]))
            paragraph.clear()

    for raw_line in markdown.splitlines():
        line = raw_line.strip()
        heading = {"# ": "PentaTitle", "## ": "PentaH2", "### ": "PentaH3"}
        prefix = next((p for p in ("### ", "## ", "# ") if line.startswith(p)), None)
        if not line:
            flush_paragraph()
        elif prefix:
            flush_paragraph()
            flowables.append(Paragraph(escape(line[len(prefix):]), styles[heading[prefix]]))
        elif line.startswith("- "):
            flush_paragraph()
            flowables.append(Paragraph(escape(line[2:]), styles["PentaBullet"], bulletText="–"))
        elif raw_line.startswith("  ") and flowables and not paragraph:
            last = flowables.pop()
            flowables.append(Paragraph(f"{last.text} {escape(line)}", last.style, bulletText=last.bulletText))
        else:
            paragraph.append(line)
    flush_paragraph()
    return flowables


def generate_job_description_pdf(markdown: str) -> bytes:
    """PDF d'un modèle de fiche de poste (data/templates/*.md), à l'identité Pentascore."""
    styles = _styles()
    styles.add(ParagraphStyle(
        name="PentaH3", fontSize=11, textColor=EMERALD, fontName="Helvetica-Bold", spaceBefore=8, spaceAfter=4))
    styles.add(ParagraphStyle(
        name="PentaBullet", parent=styles["PentaBody"], leftIndent=14, bulletIndent=2, spaceAfter=3))
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, title="Modèle de fiche de poste — Pentascore", author="Pentascore — CMRPI",
        topMargin=1.6 * cm, bottomMargin=1.6 * cm, leftMargin=2 * cm, rightMargin=2 * cm,
    )
    story = [
        Paragraph("Penta<font color='#0A7D68'>score</font>", styles["PentaBrand"]),
        Paragraph("MODÈLE DE FICHE DE POSTE · À ADAPTER AVANT DIFFUSION", styles["PentaEyebrow"]),
        *_markdown_flowables(markdown, styles),
    ]
    doc.build(story)
    return buffer.getvalue()
