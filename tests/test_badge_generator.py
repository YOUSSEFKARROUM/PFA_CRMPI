"""Tests du badge PNG partageable (src/badge_generator.py)."""
from io import BytesIO

import pytest
from PIL import Image

from api import catalog
from src import badge_generator as bg
from src import scoring

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def _open(png: bytes) -> Image.Image:
    return Image.open(BytesIO(png))


def _profile_result(name: str) -> dict:
    profile = next(p for p in catalog.demo_profiles() if p["name"] == name)
    grouped = scoring.group_responses_by_domain(profile["responses"], catalog.question_domain_map())
    return scoring.score_full_audit(grouped)


@pytest.mark.parametrize("name, tone", [
    ("PME Finance", bg.LEVEL_TONES["Faible"]),
    ("PME Commerce", bg.LEVEL_TONES["Critique"]),
    ("PME Technologie", bg.LEVEL_TONES["Avancé"]),
])
def test_demo_profiles_produce_a_square_png_in_the_level_colour(name, tone):
    result = _profile_result(name)
    png = bg.generate_badge(name, result["global_score"], result["maturity_level"], "09/11/2026")

    assert png.startswith(PNG_SIGNATURE)
    image = _open(png)
    assert image.size == (bg.BADGE_SIZE, bg.BADGE_SIZE) == (1200, 1200)
    colours = {colour for _, colour in image.convert("RGB").getcolors(maxcolors=1_000_000)}
    assert tone in colours


def test_badge_is_deterministic_and_can_be_written_to_disk(tmp_path):
    path = tmp_path / "badge.png"
    first = bg.generate_badge("Atlas SARL", 44.0, "Faible", "09/11/2026", output_path=str(path))
    assert first == bg.generate_badge("Atlas SARL", 44.0, "Faible", "09/11/2026")
    assert path.read_bytes() == first


@pytest.mark.parametrize("raw, expected", [("", bg.DEFAULT_NAME), ("   ", bg.DEFAULT_NAME), (None, bg.DEFAULT_NAME),
                                           ("  Atlas SARL ", "Atlas SARL")])
def test_empty_names_fall_back_to_a_neutral_label(raw, expected):
    assert bg.display_name(raw) == expected
    assert _open(bg.generate_badge(raw, 50.0, "Moyen", "09/11/2026")).size == (1200, 1200)


def test_very_long_names_are_shortened_to_fit_the_badge():
    font = bg.load_font(bg.NAME_FONT, bg.NAME_SIZE)
    long_name = "Société Marocaine de Distribution et de Services Numériques Avancés " * 4

    fitted = bg.fit_text(long_name, font, bg.TEXT_MAX_WIDTH)

    assert fitted.endswith("…")
    assert font.getlength(fitted) <= bg.TEXT_MAX_WIDTH
    assert bg.fit_text("Atlas SARL", font, bg.TEXT_MAX_WIDTH) == "Atlas SARL"
    assert _open(bg.generate_badge(long_name, 83.0, "Avancé", "09/11/2026")).size == (1200, 1200)


@pytest.mark.parametrize("score, shown", [(-5, 0), (0, 0), (44.4, 44), (44.5, 45), (100, 100), (130, 100)])
def test_score_is_clamped_and_rounded_like_the_application(score, shown):
    assert bg.score_label(score) == str(shown)


def test_badge_states_that_it_is_a_self_assessment():
    assert "Auto-évaluation déclarative" in bg.DISCLAIMER
    assert "certification" in bg.DISCLAIMER


def test_badge_fonts_ship_with_the_project():
    for font_name in (bg.BRAND_FONT, bg.NAME_FONT, bg.SCORE_FONT, bg.TEXT_FONT):
        assert (bg.FONTS_DIR / font_name).is_file()
