"""
Assemble la présentation en un seul fichier HTML autonome (polices, images et film intégrés).
Usage : python docs/soutenance/build.py
Sortie : docs/soutenance/Pentascore_soutenance.html — s'ouvre hors connexion, par double-clic.
"""
import base64
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "src"
ASSETS = HERE / "assets"
FONTS = HERE.parent.parent / "frontend" / "node_modules" / "@fontsource"
OUTPUT = HERE / "Pentascore_soutenance.html"
SCRIPT = HERE / "SCRIPT.md"
HEADING = re.compile(r"^### (\d{2}) · .+? — (\d+) s$")
MIME = {".jpg": "image/jpeg", ".png": "image/png", ".mp4": "video/mp4"}
FONT_FACES = [  # (famille CSS, dossier, fichier, graisse, style)
    ("Fraunces", "fraunces", "fraunces-latin-{w}-{s}.woff2", (400, 500, 600), ("normal", "italic")),
    ("Inter", "inter", "inter-latin-{w}-{s}.woff2", (400, 500, 600), ("normal",)),
    ("IBM Plex Mono", "ibm-plex-mono", "ibm-plex-mono-latin-{w}-{s}.woff2", (400, 500, 600), ("normal",)),
]


def b64(path: Path) -> str:
    if not path.is_file():
        raise FileNotFoundError(f"Fichier requis introuvable : {path}")
    return base64.b64encode(path.read_bytes()).decode("ascii")


def font_faces() -> str:
    rules = []
    for family, folder, pattern, weights, styles in FONT_FACES:
        for weight in weights:
            for style in styles:
                data = b64(FONTS / folder / "files" / pattern.format(w=weight, s=style))
                rules.append(
                    f"@font-face{{font-family:'{family}';font-style:{style};font-weight:{weight};"
                    f"font-display:block;src:url(data:font/woff2;base64,{data}) format('woff2')}}"
                )
    return "\n".join(rules)


def data_uri(match: re.Match) -> str:
    path = ASSETS / match.group(1)
    return f"data:{MIME[path.suffix]};base64,{b64(path)}"


def script_notes() -> list:
    """Découpe SCRIPT.md en notes d'orateur : une section « ### NN · titre — X s » par diapositive."""
    notes = []
    for line in SCRIPT.read_text(encoding="utf-8").splitlines():
        heading = HEADING.match(line)
        if heading:
            notes.append({"budget": int(heading.group(2)), "lines": []})
        elif line.startswith("## "):
            if notes:
                break
        elif notes and line.strip():
            notes[-1]["lines"].append(line.strip())
    return notes


def check_budgets(page: str, notes: list) -> None:
    budgets = [int(b) for b in re.findall(r'class="slide"[^>]*data-budget="(\d+)"', page)]
    script = [n["budget"] for n in notes]
    if budgets != script:
        raise ValueError(f"Durées de deck.html {budgets} différentes de SCRIPT.md {script}")


def build() -> Path:
    page = (SRC / "deck.html").read_text(encoding="utf-8")
    script = "\n".join((SRC / name).read_text(encoding="utf-8") for name in ("engine.js", "slides.js"))
    if "</script" in script.lower():
        raise ValueError("Le JavaScript contient « </script » : il casserait l'intégration en ligne.")
    notes = script_notes()
    check_budgets(page, notes)
    notes_json = json.dumps(["\n".join(n["lines"]) for n in notes], ensure_ascii=False).replace("</", "<\\/")
    page = page.replace("{{notes}}", notes_json)
    page = page.replace("/*FONTFACES*/", font_faces())
    page = page.replace("/*CSS*/", (SRC / "deck.css").read_text(encoding="utf-8"))
    page = page.replace("/*JS*/", script)
    page = re.sub(r"\{\{asset:([\w.\-]+)\}\}", data_uri, page)
    page = re.sub(r"\{\{b64:([\w.\-]+)\}\}", lambda m: b64(ASSETS / m.group(1)), page)
    leftovers = re.findall(r"\{\{[^}]+\}\}|/\*(?:FONTFACES|CSS|JS)\*/", page)
    if leftovers:
        raise ValueError(f"Marqueurs non remplacés : {leftovers}")
    OUTPUT.write_text(page, encoding="utf-8", newline="\n")
    return OUTPUT


if __name__ == "__main__":
    out = build()
    total = sum(n["budget"] for n in script_notes())
    print(f"{out.name} : {out.stat().st_size / 1_048_576:.2f} Mo · durée du script {total // 60} min {total % 60:02d} s")
