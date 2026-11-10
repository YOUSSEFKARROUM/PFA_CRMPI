# Pentascore — Auto-évaluation de la maturité cybersécurité

Plateforme d'auto-évaluation de la maturité cybersécurité pour les PME marocaines, basée sur le guide CMRPI/AUSIM.
Développée dans le cadre d'un stage PFA au CMRPI — Espace Maroc Cyberconfiance (ENSA Béni Mellal), sous la
supervision du Dr. Rachid Abouettahir.

Pentascore est un **premier repère accessible** : une auto-évaluation déclarative, qui ne remplace pas un audit
réalisé par un expert. Cette limite est affichée sur l'écran de résultats et dans le rapport PDF.

## Fonctionnalités

- Questionnaire de 25 questions, 5 domaines (Likert 1-5, libellés contextualisés, texte d'aide par question)
- Deux modes : **par domaine** (5 écrans) ou **question par question** (25 écrans)
- Score par domaine et score global (0-100), niveau de maturité, radar pentagonal
- 2 à 3 recommandations **globales**, priorisées sur les domaines les plus faibles, sévérité adaptée au score réel
  de chaque domaine (47 recommandations référencées)
- Export du rapport PDF (identité Pentascore, mention « auto-évaluation déclarative »)
- 3 profils fictifs de démonstration (Finance 44/100, Commerce 20/100, Technologie 83/100)
- Compte facultatif : historique des évaluations et évolution du score
- Conformité loi 09-08 : consentement explicite et horodaté à l'inscription, suppression du compte et de toutes
  les données à la demande ; sans compte, aucune réponse n'est enregistrée côté serveur

## Fonctionnalités complémentaires (100 % locales, sans service externe)

| Fonctionnalité | Ce qu'elle apporte | Domaine renforcé |
|---|---|---|
| Fiche de poste RSSI junior (`src/templates.py`, `data/templates/fiche_poste_rssi.md`) | Si le domaine Gouvernance est sous 50, un modèle de fiche de poste rédigé à la main est proposé en PDF | Gouvernance : passer du constat « aucun responsable » à une action concrète |
| Points à revérifier (`src/consistency_checker.py`, `data/rules/consistency_rules.json`) | 30 règles déterministes de la forme « si la question A ≥ x, la question B devrait être ≥ y », en deux familles : réponses qui se contredisent (une réponse mentionne une pratique qu'une autre déclare absente) et prérequis manquants. Chaque point cite les deux réponses choisies et un repère ISO/IEC 27001:2022. Affiché à part des priorités et dans le PDF ; aucun effet sur les scores ni sur les recommandations | Tous les domaines : fiabilité de l'auto-évaluation déclarative |
| Recommandations pilotées par les réponses (`src/scoring.py`, colonnes Question/Seuil du classeur) | Chaque mesure est liée à la question qu'elle corrige et ne sort que si la réponse est sous son seuil : jamais de mesure pour une pratique déjà déclarée. Chaque priorité affiche « parce que vous avez répondu… », au plus 2 par domaine | Tous les domaines : pertinence et crédibilité des priorités |
| Références vérifiées (`data/recommendations/Recommendations_Database.xlsx`, `tests/test_recommendations_data.py`) | Double source par mesure : section réelle du *Guide AUSIM-CMRPI 2018* et contrôle ISO/IEC 27001:2022 ; un test bloque toute référence inexistante | Gouvernance et conformité : traçabilité des recommandations |
| Rapport PDF en 3 pages (`src/pdf_annex.py`) | Page 1 synthèse ; page 2 plan d'action classé par effort et bons réflexes en cas d'incident (guide, annexe 5.2) ; page 3 réponses déclarées, méthodologie et limites. Référence déterministe (empreinte des réponses) en pied de page | Incidents & Continuité, et crédibilité du rapport |
| Badge PNG partageable (`src/badge_generator.py`, `assets/fonts/`) | Image 1200 × 1200 générée localement avec Pillow (score, niveau, organisation, date, pentagone signature) ; mention « auto-évaluation déclarative — ne vaut ni audit ni certification » pour ne jamais passer pour une certification | Sensibilisation : faire connaître la démarche en interne et auprès des partenaires |
| Replay du score (`scoring.get_score_contributions`) | Panneau « Voir ce qui a le plus pesé sur votre score » : les 5 réponses qui ont coûté le plus de points. Chaque question pèse 4 points sur 100 ; la somme des points perdus vaut exactement 100 − score (vérifié par les tests) | Tous les domaines : comprendre et expliquer le score |
| QR code de réévaluation (`pdf_generator.qr_drawing`, `PENTASCORE_BASE_URL`) | QR code vectoriel généré en mémoire par ReportLab en page 1 du rapport, avec « Refaites votre évaluation dans 6 mois » ; un test décode le QR rendu pour vérifier l'URL | Gouvernance : amélioration continue (réévaluation périodique) |
| Fonctionnement hors connexion (`@fontsource/*`, CSP) | Polices de l'interface et du badge embarquées (licence OFL) : plus aucun appel à Google Fonts, CSP limitée à `'self'` ; un test E2E vérifie qu'aucune requête ne sort vers un domaine extérieur | Démonstration fiable sans réseau |
| Design « relevé de précision » (`docs/design/`, `lucide-react`) | Révélation chorégraphiée du résultat (radar gradué tracé, score, sceau de niveau), landing animée au défilement, questionnaire avec échelle graduée et raccourcis 1–5, historique avec courbe et pentagones avant/après ; même signature sur le PDF et le badge. `prefers-reduced-motion` respecté, aucune ressource distante | Crédibilité et lisibilité du résultat ; démonstration marquante |

## Références

- **Guide de bonnes pratiques** : AUSIM et CMRPI, *Les Petites et Moyennes Entreprises marocaines, comment faire
  face aux menaces cybernétiques ?*, édition 2018 (`Guide-de-bonnes-pratique.pdf`). Cité par section réelle
  (ex. « Guide AUSIM-CMRPI 2018, §3.1.4 »). Le guide se présente lui-même comme un guide de sensibilisation et non
  comme une référence normative : il est donc toujours associé à ISO/IEC 27001:2022.
- **ISO/IEC 27001:2022** : clauses 4 à 10 et contrôles de l'annexe A (A.5 à A.8).
- Le guide date de 2018 : il ne couvre ni le MFA, ni la segmentation, ni l'EDR, ni la loi 05-20 ; ces mesures ne
  citent que la norme.

## Architecture

```
┌──────────────────────────────┐        ┌───────────────────────────────────┐
│ frontend/  React + Vite + TS │  JSON  │ api/  FastAPI                     │
│ (compilé dans frontend/dist) │◄──────►│  réutilise src/ sans le dupliquer │
└──────────────────────────────┘        │  src/scoring.py · database.py     │
        servi par FastAPI               │  pdf_generator.py · auth.py       │
        (un seul processus)             └────────────────┬──────────────────┘
                                                         │
                                                  SQLite (app.db)
```

Le calcul du score existe **uniquement** dans `src/scoring.py` : le frontend envoie les réponses brutes et le
serveur recalcule toujours (score, recommandations, PDF, historique).

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/questionnaire` | 25 questions, domaines, nombre de recommandations |
| GET | `/api/profiles/demo` | 3 profils fictifs et leur score |
| POST | `/api/assessments/score` | Scores, niveau, 2-3 recommandations |
| POST | `/api/assessments/report` | Rapport PDF |
| POST | `/api/auth/register` · `/login` · `/logout` | Session (cookie HttpOnly, SameSite=Strict) |
| GET / DELETE | `/api/auth/me` | Compte courant / suppression du compte et des données |
| POST / GET | `/api/assessments` | Enregistrer une évaluation / historique |

## Démarrage rapide

Prérequis : Python 3.12+ et Node.js 22+.

```bash
pip install -r requirements.txt
cd frontend && npm ci && npm run build && cd ..
uvicorn api.main:app --port 8000
```

Ouvrir http://localhost:8000. La base `app.db` est créée et alimentée automatiquement au démarrage
(questions, guidance, 47 recommandations) ; `python scripts/init_db.py` reste disponible pour le faire à la main.

### Mode développement (rechargement à chaud)

```bash
uvicorn api.main:app --reload --port 8000      # terminal 1
cd frontend && npm run dev                     # terminal 2 → http://localhost:5173
```

### Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `PENTASCORE_SECRET_KEY` | Clé de signature des sessions (≥ 32 caractères) | clé éphémère en développement |
| `PENTASCORE_ENV` | `production` impose la clé secrète et les cookies `Secure` | `development` |
| `PENTASCORE_DB_PATH` | Chemin de la base SQLite | `app.db` |
| `PENTASCORE_SESSION_MINUTES` | Durée de session | `480` |
| `PENTASCORE_AUTH_RATE_LIMIT` | Tentatives d'authentification par minute et par IP | `10` |
| `PENTASCORE_PUBLIC_RATE_LIMIT` | Calculs de score / PDF sans compte, par minute et par IP | `60` |
| `PENTASCORE_BASE_URL` | Adresse publique encodée dans le QR code du rapport (http/https uniquement) | `http://localhost:8000` |

## Tests et qualité

```bash
pip install -r requirements-dev.txt
pytest --cov=src --cov=api                     # backend : 285 tests, 98 % de couverture
flake8 src api tests scripts

cd frontend
npm run typecheck && npm run lint
npm run test:coverage                          # frontend : 71 tests unitaires, 98 % de couverture
npm run test:e2e                               # Playwright : 13 parcours dans un vrai navigateur
```

Les tests E2E démarrent leur propre serveur sur une base SQLite jetable et couvrent : les deux modes de
questionnaire, le retour arrière, les 3 profils, l'export PDF, l'inscription avec consentement, l'historique,
la suppression du compte, la fiche de poste RSSI, les points à revérifier, le badge, le replay du score,
l'absence de toute requête vers un domaine extérieur, la navigation au clavier et l'affichage mobile.

Intégration continue (`.github/workflows/ci.yml`) : backend (flake8 + pytest, couverture ≥ 90 %), frontend
(typecheck, lint, tests unitaires, build), puis E2E Playwright.

## Structure

```
cmrpi-platform/
├── api/                    # FastAPI : config, sécurité, catalogue, services, routes
├── frontend/               # React + Vite + TypeScript (design Pentascore)
│   ├── src/components/     # landing, start, quiz, results, history, account, layout
│   ├── src/state/          # reducer du parcours (pur, testé)
│   ├── src/lib/            # géométrie du pentagone, présentation des niveaux
│   └── e2e/                # tests Playwright
├── src/                    # métier : scoring, base de données, PDF, authentification
├── data/                   # questions (FR/EN, guidance), recommandations, schéma SQL
├── tests/                  # tests unitaires et d'intégration (pytest)
├── docs/                   # Scoring_Rules_V1.md
└── scripts/                # init_db.py
```

## Limites assumées

- Auto-évaluation **déclarative** : le score reflète les réponses, il n'est pas vérifié sur le terrain.
- Méthodologie validée sur des profils fictifs ; pas encore éprouvée auprès de PME réelles.
- SQLite et limitation de débit en mémoire : adaptés à une instance unique, pas à une montée en charge.
  Derrière un reverse proxy, lancer uvicorn avec `--proxy-headers --forwarded-allow-ips=<ip du proxy>`.
- Session sans révocation côté serveur : la déconnexion efface le cookie, mais un jeton volé reste valide
  jusqu'à son expiration (8 h par défaut).

## Encadrement

- **Encadrant professionnel :** Dr. Rachid Abouettahir (CMRPI)
- **Co-encadrante académique :** Pr. Zakia Errabih (ENSA Béni Mellal)
- **Stagiaire :** Youssef Ait Karroum

## Licence

Propriétaire — CMRPI & ENSA Béni Mellal
