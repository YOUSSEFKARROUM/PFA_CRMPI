"""
badge_generator.py — Badge PNG partageable (1200 × 1200) du résultat Pentascore.

Rendu 100 % local et déterministe (Pillow + polices OFL embarquées dans
assets/fonts) : aucun appel réseau, mêmes entrées => mêmes octets.
Le badge rappelle qu'il s'agit d'une auto-évaluation déclarative, pour ne
jamais pouvoir passer pour une certification.
"""
import math
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from src.pdf_generator import MATURITY_HEADLINES_FR

FONTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
BRAND_FONT = "Fraunces-SemiBold.ttf"
NAME_FONT = "Inter-SemiBold.ttf"
TEXT_FONT = "Inter-Regular.ttf"
SCORE_FONT = "IBMPlexMono-SemiBold.ttf"
EYEBROW_FONT = "IBMPlexMono-Medium.ttf"

BADGE_SIZE = 1200
MARGIN = 96
TEXT_MAX_WIDTH = BADGE_SIZE - 2 * MARGIN
NAME_SIZE = 46
DEFAULT_NAME = "Votre organisation"
DISCLAIMER = "Auto-évaluation déclarative — ne vaut ni audit ni certification"

# Palette alignée sur frontend/src/styles/tokens.css
PAPER = (250, 248, 242)
INK = (16, 32, 47)
MUTED = (90, 100, 112)
RULE = (217, 214, 204)
EMERALD = (10, 125, 104)
GOLD = (169, 130, 76)
CORAL = (210, 74, 46)
LEVEL_TONES = {"Critique": CORAL, "Faible": GOLD, "Moyen": EMERALD, "Avancé": EMERALD}

PENTAGON_CENTER = (BADGE_SIZE // 2, 545)
PENTAGON_RADIUS = 285


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS_DIR / name), size)


def display_name(pme_name: str | None) -> str:
    return (pme_name or "").strip() or DEFAULT_NAME


def score_label(global_score: float) -> str:
    """Score entier borné à [0, 100], arrondi au plus proche (comme l'application)."""
    return str(int(math.floor(min(100.0, max(0.0, float(global_score))) + 0.5)))


def fit_text(text: str, font: ImageFont.FreeTypeFont, max_width: float) -> str:
    """Raccourcit le texte avec « … » pour qu'il tienne dans max_width pixels."""
    if font.getlength(text) <= max_width:
        return text
    shortened = text
    while shortened and font.getlength(shortened.rstrip() + "…") > max_width:
        shortened = shortened[:-1]
    return shortened.rstrip() + "…"


def _pentagon(radius: float) -> list:
    cx, cy = PENTAGON_CENTER
    return [
        (cx + radius * math.cos(math.radians(-90 + 72 * i)), cy + radius * math.sin(math.radians(-90 + 72 * i)))
        for i in range(5)
    ]


def _draw_signature(draw: ImageDraw.ImageDraw, score: float, tone: tuple) -> None:
    """Pentagone signature : anneaux à 25/50/75/100, surface proportionnelle au score."""
    for ring in (0.25, 0.5, 0.75, 1.0):
        draw.polygon(_pentagon(PENTAGON_RADIUS * ring), outline=RULE, width=3)
    filled = _pentagon(PENTAGON_RADIUS * max(0.06, min(score, 100) / 100))
    wash = tuple(int(c + (255 - c) * 0.82) for c in tone)
    draw.polygon(filled, fill=wash, outline=tone, width=6)


def _centered(draw: ImageDraw.ImageDraw, y: float, text: str, font, fill) -> None:
    draw.text((BADGE_SIZE / 2, y), text, font=font, fill=fill, anchor="mm")


def generate_badge(
    pme_name: str,
    global_score: float,
    maturity_level: str,
    audit_date: str,
    output_path: str = None,
) -> bytes:
    """Génère le badge PNG 1200 × 1200 et retourne ses octets (écrit aussi output_path si fourni)."""
    tone = LEVEL_TONES.get(maturity_level, INK)
    image = Image.new("RGB", (BADGE_SIZE, BADGE_SIZE), PAPER)
    draw = ImageDraw.Draw(image)

    brand = load_font(BRAND_FONT, 64)
    draw.text((MARGIN, 92), "Penta", font=brand, fill=INK, anchor="ls")
    draw.text((MARGIN + brand.getlength("Penta"), 92), "score", font=brand, fill=EMERALD, anchor="ls")
    draw.text((MARGIN, 134), "PAR CMRPI · AUTO-ÉVALUATION CYBERSÉCURITÉ", font=load_font(EYEBROW_FONT, 24),
              fill=EMERALD, anchor="ls")
    draw.rectangle((MARGIN, 168, BADGE_SIZE - MARGIN, 170), fill=RULE)

    _draw_signature(draw, float(global_score), tone)
    score_font, max_font = load_font(SCORE_FONT, 190), load_font(SCORE_FONT, 44)
    score_text = score_label(global_score)
    score_width = score_font.getlength(score_text)
    total_width = score_width + 8 + max_font.getlength("/100")
    left = BADGE_SIZE / 2 - total_width / 2
    baseline = PENTAGON_CENTER[1] + 70
    draw.text((left, baseline), score_text, font=score_font, fill=INK, anchor="ls")
    draw.text((left + score_width + 8, baseline), "/100", font=max_font, fill=MUTED, anchor="ls")

    headline = MATURITY_HEADLINES_FR.get(maturity_level, maturity_level)
    _centered(draw, 905, headline, load_font(BRAND_FONT, 66), tone)

    name_font = load_font(NAME_FONT, NAME_SIZE)
    _centered(draw, 990, fit_text(display_name(pme_name), name_font, TEXT_MAX_WIDTH), name_font, INK)
    _centered(draw, 1046, f"Évaluation du {audit_date}", load_font(TEXT_FONT, 30), MUTED)
    draw.rectangle((MARGIN, 1092, BADGE_SIZE - MARGIN, 1094), fill=RULE)
    _centered(draw, 1130, DISCLAIMER, load_font(TEXT_FONT, 24), MUTED)

    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    png = buffer.getvalue()
    if output_path:
        Path(output_path).write_bytes(png)
    return png
