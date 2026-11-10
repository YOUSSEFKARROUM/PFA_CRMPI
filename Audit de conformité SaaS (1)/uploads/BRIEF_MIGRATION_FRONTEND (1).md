# BRIEF DE MIGRATION — Streamlit vers Frontend Professionnel
## Plateforme CMRPI d'auto-évaluation cybersécurité

Ce document sert de pont entre Claude Design (maquettes visuelles) et Claude Code
(implémentation réelle). Il capture toute la logique métier déjà existante et vérifiée,
pour qu'aucune régression ne survienne pendant la migration.

---

## PARTIE A — CE QUI EXISTE DÉJÀ ET NE CHANGE PAS

Le code métier (`src/scoring.py`, `src/database.py`, `src/pdf_generator.py`, `src/auth.py`)
est **déjà indépendant de Streamlit** — aucun `import streamlit` dedans. Il devient
directement le cœur du futur backend FastAPI, sans réécriture.

### Fonctions métier à exposer via API (déjà testées, 52 tests, 90% couverture)

**Scoring (`src/scoring.py`)**
- `calculate_domain_score(responses: list) -> float`
- `calculate_global_score(domain_scores: dict) -> float`
- `get_maturity_level(score: float) -> str` — retourne Critique/Faible/Moyen/Avancé
- `generate_top_recommendations(domain_scores, get_recs_fn, limit=3) -> list` — 2-3 recos globales, domaines faibles priorisés
- `score_full_audit(all_responses: dict) -> dict` — fonction principale, tout-en-un

**Données (`src/database.py`)**
- `create_pme`, `get_pme_by_email`, `get_pme_by_id`
- `get_all_questions`, `get_all_domains`
- `get_recommendations_for_domain(domain_id, severities)`
- `create_audit`, `save_response`, `complete_audit`, `get_audit_history`, `get_audit_responses`

**PDF (`src/pdf_generator.py`)**
- `generate_audit_report(pme_name, sector, audit_date, domain_scores, global_score, maturity_level, recommendations, output_path=None) -> bytes`

**Auth (`src/auth.py`)**
- `register_pme`, `login_pme` (bcrypt) — module existant, jamais branché au flux Streamlit actuel, à activer dans la V2

### Données de référence (ne pas retoucher)
- `data/questions/questions_fr.json` + `questions_en.json` — 25 questions, 5 domaines
- `data/questions/guidance.json` — textes d'aide
- `data/recommendations/Recommendations_Database.xlsx` — 47 recommandations
- `data/schema.sql` — schéma SQLite (7 tables)

### Règles de calcul (à ne jamais dupliquer côté frontend — toujours appeler l'API)
```
Score domaine = ((moyenne_Likert - 1) / 4) × 100
Score global  = moyenne des 5 scores de domaine
Niveaux       = [0,25[ Critique · [25,50[ Faible · [50,75[ Moyen · [75,100] Avancé
```

---

## PARTIE B — ARCHITECTURE CIBLE

```
┌─────────────────────────┐         ┌──────────────────────────┐
│   Frontend (React/Next)  │  REST   │   Backend (FastAPI)       │
│   Design par Claude       │◄──────► │   Réutilise scoring.py,   │
│   Design, implémenté par  │  JSON   │   database.py,            │
│   Claude Code             │         │   pdf_generator.py tels   │
│                            │         │   quels                   │
└─────────────────────────┘         └────────────┬─────────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │ SQLite (ou       │
                                          │ PostgreSQL v2)   │
                                          └──────────────────┘
```

**Stack recommandée**
- Backend : FastAPI (Python — capitalise sur le code existant), pydantic pour la validation
- Frontend : React + Next.js + Tailwind CSS + Framer Motion (animations "wow")
- Base de données : SQLite pour commencer (déjà en place), migration PostgreSQL documentée comme évolution

### Endpoints API à créer (mapping direct des fonctions existantes)

| Méthode | Route | Fonction réutilisée |
|---|---|---|
| GET | `/api/questions?lang=fr` | `get_all_questions()` |
| GET | `/api/domains` | `get_all_domains()` |
| POST | `/api/audit/score` | `score_full_audit()` |
| POST | `/api/audit/recommendations` | `generate_top_recommendations()` |
| POST | `/api/audit/pdf` | `generate_audit_report()` (retourne le PDF en binaire) |
| POST | `/api/auth/register` | `register_pme()` |
| POST | `/api/auth/login` | `login_pme()` |
| GET | `/api/profiles/demo` | Les 3 profils fictifs (`src/test_profiles.py`) |

---

## PARTIE C — BRIEF CRÉATIF (pour Claude Design)

### Références réelles à étudier avant de commencer (5 min chacune, non négociable)

- **vanta.com** — le produit le plus proche du tien qui existe réellement : plateforme
  de conformité et d'auto-évaluation sécurité pour entreprises. Regarder spécifiquement
  comment ils traitent un score de conformité (composition typographique forte, pas une
  jauge générique), et leur usage minimal de la couleur (un seul accent, jamais de dégradé).
- **drata.com** — même catégorie de produit, même niveau d'exigence.
- **linear.app** — référence absolue de discipline typographique et de gestion de l'espace
  blanc en SaaS, à prendre comme étalon de retenue visuelle même si hors-sujet cybersécurité.

### Interdits explicites (tells classiques d'un design "généré par IA" à éviter absolument)

- Dégradés bleu/violet/rose en fond de hero — cliché SaaS générique
- Icônes emoji ou icône générique "bouclier" pour représenter la cybersécurité
- Grilles de cartes identiques répétant icône + titre + description 3-4 fois
- Badges "pill" arrondis utilisés comme décoration plutôt que pour une vraie fonction
- Ombres portées douces génériques ("glassmorphism" par défaut)
- Jauge circulaire générique pour le score (voir motif signature ci-dessous à la place)
- Plus de 3 couleurs d'accent utilisées simultanément sur un même écran

### Identité visuelle obligatoire (déjà validée sur la présentation de soutenance)

**Palette**
```
Fond          #FAF8F2  (blanc cassé chaud)
Texte         #10202F  (navy profond)
Accent unique #0A7D68  (émeraude) — action principale, jamais décoratif
Or            #A9824C  (réservé aux données/optimisation, pas décoratif)
Corail        #D24A2E  (réservé aux alertes réelles, jamais décoratif)
```

**Typographie**
```
Titres    Fraunces (serif éditorial, PAS une sans-serif géométrique par défaut)
Corps     Inter
Données   IBM Plex Mono — réservé exclusivement aux scores et pourcentages
```

**Motif signature** : un pentagone géométrique (5 domaines = 5 côtés), qui structure la
navigation et se transforme en radar chart sur l'écran de résultats — jamais une jauge
circulaire générique. Déjà prototypé et fonctionnel dans la présentation de soutenance,
à reprendre à l'identique pour la cohérence de marque entre l'app, les rapports PDF et
la présentation.

### Discipline de mise en page

Suivre le niveau de retenue de Vanta/Linear : beaucoup d'espace blanc, une seule action
principale visible à la fois par écran, jamais 3 call-to-action concurrents. Règle de
justification : si un élément visuel (forme, couleur, ombre) ne peut pas être justifié
fonctionnellement, il ne doit pas être là.

### Écrans à concevoir

1. **Accueil** — nom de l'organisation (optionnel), secteur, sélecteur de mode (section /
   question par question), 3 profils de démonstration, un seul CTA principal
2. **Questionnaire — mode section** — 5 écrans, un par domaine, indicateur de progression
   en pentagone (pastilles reliées)
3. **Questionnaire — mode question** — 25 écrans, une question à la fois, même indicateur
4. **Résultats** — jauge de score animée (pentagone/radar, pas de jauge circulaire),
   détail par domaine, recommandations avec badge de sévérité coloré, export PDF
5. **Historique** (v2, si authentification activée) — liste des audits passés d'une PME,
   évolution du score dans le temps

### Ton général
Rassurant, clair, orienté action — un dirigeant de PME sans bagage technique doit comprendre
en un coup d'œil où il en est et quoi faire ensuite. Éviter tout jargon cybersécurité non
expliqué (chaque question a déjà un texte d'aide en base — à afficher, pas à supprimer).

---

## PARTIE D — CE QUI NE DOIT PAS RÉGRESSER

Points de qualité déjà atteints à préserver pendant la migration :
- 52 tests automatisés, 90% de couverture — objectif : maintenir ou dépasser côté backend
- Pipeline CI/CD (GitHub Actions) — à étendre pour couvrir aussi le frontend (lint + build)
- Les deux modes de questionnaire (section / question) — exigence explicite du cahier des
  charges, ne jamais en supprimer un au profit de l'autre
- La logique de recommandations : 2-3 recommandations **globales**, pas par domaine, avec
  sévérité adaptée au score réel de chaque domaine (pas de fausse alerte sur un domaine déjà bon)
