# BRIEF DE RÉDACTION — Rapport de Stage PFA CMRPI
## Contenu source consolidé, mappé sur la structure IACS_Template.tex

Ce document rassemble tout le contenu déjà validé (par l'encadrant Dr. Rachid Abouettahir)
produit durant le stage, organisé selon la structure exacte du template LaTeX officiel
(chapters/chapter1.tex, chapter2.tex, chapter3.tex, conclusion.tex) — la même utilisée pour
le rapport PicLearn donné en exemple de référence (qualité/mise en forme cible).

**Objectif** : que Claude Code puisse rédiger directement dans les .tex existants sans avoir
à rechercher les informations ailleurs.

---

## MÉTADONNÉES DU RAPPORT

- **Titre proposé** : Conception et développement d'une plateforme d'auto-évaluation de la
  maturité cybersécurité pour les PME marocaines
- **Filière** : Cycle Ingénieur — Intelligence Artificielle et Cybersécurité (IACS)
- **Étudiant** : Youssef Ait Karroum
- **Organisme d'accueil** : CMRPI (Centre Marocain de Recherches Polytechniques et
  d'Innovation) — Espace Maroc Cyberconfiance (EMC)
- **Encadrant professionnel** : Dr. Rachid Abouettahir (CMRPI)
- **Encadrante académique** : Zakia Errabih, Enseignante-chercheuse, Chef de filière Techniques
  de Management (École Supérieure de Technologie-Fès, USMBA) — confirmé le 31/08/2026 comme la
  version exacte à retenir (le rapport main.tex l'utilisait déjà correctement ; c'est cette
  ligne du brief qui était obsolète)
- **Période de stage** : 15 juillet — 31 août 2026 (stage PFA, pas PFE — à adapter le
  gabarit "Projet de Fin d'Études" en "Stage PFA" si le règlement de la filière le distingue)
- **Repository code** : https://github.com/YOUSSEFKARROUM/PFA
- **Dossier Drive complet** :
  https://drive.google.com/drive/folders/1nOaB7aCobiuNqgMeI3F5Z_GEWabzWO4C

---

## REMERCIEMENTS — Ordre à respecter (cf. template)

1. Directeur ENSABM : Pr. Belaid BOUIKHALENE
2. Directeur adjoint ENSABM : Pr. Soufiane BELHOUIDEG
3. Coordonnateur filière IACS : Pr. Mohamed GOUSKIR
4. Encadrant professionnel CMRPI : Dr. Rachid Abouettahir
5. Encadrante académique : Pr. Zakia Errabih
6. Corps professoral et administratif ENSABM

---

# CHAPITRE 1 — CONTEXTE GÉNÉRAL ET PROBLÉMATIQUE
*(mappé sur chapters/chapter1.tex)*

## 1.1 Présentation de l'organisme d'accueil

### Historique et création du CMRPI
*(source : Rapport d'activités CMRPI 2012-2019, consulté et archivé)*

Le CMRPI (Centre Marocain de Recherches Polytechniques et d'Innovation) est une association
savante marocaine à but non lucratif, fondée en **juin 2012**.

- **Fondateur** : Pr. Youssef Bentaleb, enseignant-chercheur en analyse et modélisation
  mathématiques et informatique à l'Université Ibn Tofail de Kénitra, ex-cadre supérieur
  d'un département ministériel.
- **Membres fondateurs** (extrait) : Pr. Moulay Taib Belghiti, Pr. Khalid Chougdali
  (Université Ibn Tofail, Kénitra).

**Mission du CMRPI** :
- Rassembler les personnes physiques et morales concernées par les sciences et techniques
- Faciliter l'implication des chercheurs marocains (au pays et à l'étranger) dans le
  développement du Maroc
- Contribuer au transfert du savoir vers le milieu socio-économique national et international
- Distinguer les meilleurs spécialistes et favoriser les contacts entre chercheurs
- Développer une source d'informations spécialisées et d'expertise de haut niveau
- Représenter ses membres auprès d'autres sociétés scientifiques marocaines ou étrangères

**Positionnement** : carrefour entre recherche, développement et innovation — voie distincte
de l'industrie et des instances gouvernementales pour la diffusion des idées scientifiques.

### Formations cybersécurité du CMRPI (contexte d'expertise)
*(source : Catalogue des formations CMRPI 2012-2021)*

Depuis 2014, le CMRPI a mené la première campagne de sensibilisation/formation à la lutte
contre la cybercriminalité au Maroc, sous l'égide du Ministère de l'Industrie, de
l'Investissement, du Commerce et de l'Économie Numérique (Observatoire Cybersécurité et
Protection sur Internet, OCPI).

Deux campagnes nationales dirigées par Pr. Youssef Bentaleb :
- **CNLCC** — Campagne Nationale de Lutte Contre la Cybercriminalité (2014-2017)
- **CNMC** — Campagne Nationale Maroc Cyberconfiance (2018-2022)

Thématiques des ateliers par année (2014-2019) : détection de cybermenaces, gouvernance SI,
cyberattaques avancées, gestion d'incidents et de crise, blockchain et IA en cybersécurité,
sécurité Cloud — **directement en lien avec les 5 domaines retenus pour le questionnaire
d'auto-évaluation du projet** (Gouvernance, Accès, Infrastructure, Incidents, Sensibilisation).

### Espace Maroc Cyberconfiance (EMC)
*(source : Rapports EMC 2021, 2023, 2024)*

- **Lancement** : initiative du CMRPI depuis septembre 2020, avec l'appui du Conseil de l'Europe.
- **Mission** : plateforme nationale de référence pour la prévention et la protection
  numérique des enfants, jeunes et femmes au Maroc (sensibilisation, signalements de
  cyberviolence/cyberharcèlement).
- **Portail** : www.cyberconfiance.ma (trilingue AR/FR/EN), dispositifs EMC-Helpline et
  EMC-Stopline.
- **Partenaires technologiques** : Meta, TikTok, Kaspersky.
- **Partenaires institutionnels (2024)** : Conseil de l'Europe, Ministère de la Transition
  Numérique, Ministère de l'Éducation Nationale, Ministère de la Justice, DGSN, Gendarmerie
  Royale.
- **Faits marquants** : lancement officiel EMC-Helpline le 7 février 2023 ; extension
  "EMC Helpline for Women" en 2024.

**Statistiques de signalements EMC-Helpline (2021-2024)** — chiffres directement citables :

| Année | Signalements | Croissance |
|---|---|---|
| 2021 | 64 (démarrage, 6 mois) | — |
| 2022 | 548 | ×8,5 |
| 2023 | 1227 (pic — séisme Al Haouz) | ×2,2 |
| 2024 | 574 | repli post-pic |

⚠️ **Note pour Claude Code** : ces statistiques EMC concernent la cyberviolence envers les
particuliers (enfants/femmes), un périmètre différent du sujet du stage (maturité
cybersécurité des PME). À utiliser uniquement comme **contexte général** illustrant
l'engagement et la légitimité du CMRPI en cybersécurité — ne pas les présenter comme données
directement liées au projet PME.

### Structure organisationnelle
À compléter avec organigramme simple (Direction/Président Youssef Bentaleb → pôles
R&D, Formation, EMC) — utiliser le style TikZ déjà présent dans chapter1.tex
(`\node[box...]`) en remplaçant les libellés génériques par ceux du CMRPI.

---

## 1.2 Problématique et contexte du projet

**Constat** : les PME marocaines n'ont pas d'outil simple et accessible pour évaluer leur
propre niveau de maturité cybersécurité. Le CMRPI dispose d'un référentiel de bonnes
pratiques (guide CMRPI/AUSIM) mais celui-ci reste un document statique de 40 pages, non
opérationnalisé sous forme d'outil d'auto-diagnostic.

**Problématique formulée** (à styliser comme l'exemple PicLearn, en encadré) :

> Comment concevoir une plateforme simple et accessible permettant à une PME marocaine
> d'auto-évaluer sa maturité cybersécurité à partir du guide CMRPI/AUSIM, et d'obtenir des
> recommandations priorisées et actionnables ?

**Enjeux** : accessibilité pour un public non-technique (dirigeants de PME), fiabilité de la
méthodologie de scoring, pertinence des recommandations, simplicité de déploiement.

---

## 1.3 Cahier des charges

*(Contenu complet déjà rédigé et validé — cahier des charges 8 sections produit durant la
préparation du stage. Cf. Google Drive dossier "CMRPI PFA 2026", documents Section 1 à
Section 8. Reprendre en particulier :)*

### Objectifs du projet
**Objectif principal** : développer une plateforme d'auto-évaluation de la maturité
cybersécurité pour PME marocaines, basée sur le guide CMRPI/AUSIM, avec scoring automatisé et
recommandations personnalisées.

**Objectifs secondaires** :
- Auto-évaluation accessible sans compétence technique
- Scoring automatisé et reproductible (0-100)
- Rapports PDF personnalisés
- Conformité Loi 09-08 (protection des données personnelles)
- Sensibilisation des PME aux enjeux cybersécurité

### Périmètre (in/out of scope)
**Inclus** : questionnaire 25 questions, moteur de scoring, export PDF, interface Streamlit.
**Exclu du périmètre stage** (perspectives futures) : authentification multi-tenant en
production, benchmarking inter-PME, certification "PME Cyber-Sûre", API publique.

### Planning en 3 jalons (réalisé conforme au planning initial)
| Jalon | Période | Objectif | Statut |
|---|---|---|---|
| 1 | 15-31 juil 2026 | Analyse & conception (questionnaire, scoring) | ✅ Validé par l'encadrant |
| 2 | 1-15 août 2026 | Interface Streamlit fonctionnelle + tests | ✅ Complété |
| 3 | 16-31 août 2026 | Export PDF, tests bout-en-bout, documentation | ✅ Complété |

---

# CHAPITRE 2 — ÉTAT DE L'ART / RÉFÉRENTIELS ANALYSÉS
*(mappé sur chapters/chapter2.tex)*

⚠️ **Point d'attention pour Claude Code** : contrairement à PicLearn qui comparait des
outils concurrents existants (Notion AI, Quizlet, Anki...), ce projet n'a pas d'étude
comparative d'outils similaires déjà rédigée. Deux options :
1. Recentrer ce chapitre sur l'**analyse des référentiels normatifs** (ISO 27001, NIST CSF,
   guide CMRPI/AUSIM, Loi 09-08) — c'est le contenu disponible et déjà solide.
2. Ajouter en complément une petite étude de l'existant (outils d'auto-évaluation
   cybersécurité pour PME : ex. NIST Small Business Cybersecurity Corner, ANSSI
   MonServiceSécurisé, CyberVadis) — **à rechercher/rédiger, non disponible dans les sources
   actuelles**.

## 2.1 Référentiels normatifs analysés

### Guide CMRPI/AUSIM
Guide des Bonnes Pratiques, 40 pages — source : https://ausimaroc.com/guide-des-bonnes-pratiques-cmrpi/
5 domaines couverts, alignés avec les standards internationaux (voir ci-dessous).

### ISO/IEC 27001:2022
Référentiel de gestion de la sécurité de l'information. Les 14 sections du référentiel ont
été regroupées conceptuellement en 5 domaines pour la plateforme (clustering).

### NIST Cybersecurity Framework 2.0
5 fonctions (Govern, Protect, Detect, Respond, Recover) — correspondance conceptuelle établie
avec les 5 domaines du questionnaire.

### Loi 09-08 (Maroc)
Protection des données à caractère personnel — intégrée via consentement explicite dans
l'application (case à cocher obligatoire à l'inscription).

## 2.2 Les 5 domaines retenus et leur justification académique

| # | Domaine | Référence ISO 27001 | Référence NIST |
|---|---|---|---|
| 1 | Gouvernance | §5.1-5.2 (Leadership) | Govern |
| 2 | Accès & Identités | §8.1-8.3 (Access Control) | Protect |
| 3 | Infrastructure & Réseau | §8.2, §10.1 | Protect |
| 4 | Incidents & Continuité | §5.3, §17.1 | Detect/Respond |
| 5 | Sensibilisation & Formation | §6.3 | Govern |

**Justification du choix de 5 domaines / 25 questions** (déjà rédigée et académiquement
sourcée) :
- Fondements CMM/CMMI — Humphrey (1989), *Managing the Software Process* : les 5 niveaux de
  maturité inspirent les 5 seuils de scoring.
- Recherche sur les échelles de Likert — Dawes (2008) : l'échelle à 5 points est optimale
  pour ce type de questionnaire (compromis simplicité/granularité) par rapport à 7 ou 10 points.
- Règle empirique (Nielsen) : 5-10 participants/question → 25 questions optimal pour 5 domaines.

*(Ces références sont à formater en .bib comme dans le template PicLearn — actuellement
citées en texte simple dans les documents source, à convertir en entrées BibTeX.)*

---

# CHAPITRE 3 — CONCEPTION ET RÉALISATION
*(mappé sur chapters/chapter3.tex)*

## 3.1 Méthodologie et démarche

Démarche en 3 jalons itératifs (cf. planning ch.1), avec points de contrôle hebdomadaires
avec l'encadrant (Dr. Rachid Abouettahir), rapports de progression écrits à chaque fin de
jalon (3 rapports produits et envoyés, disponibles intégralement).

## 3.2 Architecture du système

### Stack technique retenue (MVP)
- **Frontend/Backend** : Streamlit (Python) — framework unique pour prototypage rapide
- **Base de données** : SQLite (schéma 7 tables : pme, domain, question, audit,
  audit_response, recommendation, audit_log)
- **Génération PDF** : ReportLab
- **Authentification** : bcrypt (module développé, non intégré au flux principal — voir 3.6)
- **Tests** : pytest + streamlit.testing.v1.AppTest (tests de bout en bout sans navigateur)

### Justification des choix technologiques
*(à mettre en forme comme les tableaux comparatifs PicLearn 3.2.1-3.2.4, style
`\begin{tabularx}`)*

**Streamlit vs Django/Flask+React** : rapidité de prototypage pour un MVP à interface
simple, pas besoin de séparation frontend/backend pour ce périmètre, boucle de développement
courte adaptée à un stage de 6 semaines.

**SQLite vs PostgreSQL** : aucune infrastructure serveur nécessaire, suffisant pour le
volume (usage mono-utilisateur par audit), migration vers PostgreSQL documentée comme
perspective (voir 3.9).

**ReportLab** : génération PDF pure Python, contrôle fin de la mise en page (jauge SVG,
graphique en barres, tableaux), pas de dépendance à un service externe.

## 3.3 Modélisation

### Schéma de données
7 tables : `pme`, `domain`, `question`, `audit`, `audit_response`, `recommendation`,
`audit_log`. Relations : 1 PME → N audits ; 1 audit → 25 réponses ; 5 domaines → 25 questions
(5 chacun) ; recommandations rattachées à un domaine avec sévérité (Critical/High/Medium/Low).

*(Diagramme de classes / ER à produire en TikZ, sur le modèle de la Figure 2.3 du rapport
PicLearn — le schema.sql complet existe dans le repo GitHub : `data/schema.sql`)*

### Questionnaire — 25 questions, 5 domaines
Contenu intégral disponible (FR + EN + guidance) dans le repo GitHub :
`data/questions/questions_fr.json`, `questions_en.json`, `guidance.json`.

**Format retenu** : échelle de Likert à 5 niveaux avec libellés spécifiques par question
(pas juste 1-5 numérique — chaque niveau a un libellé contextualisé, ex. "Non" / "Partiellement"
/ "Approuvée (1-2 ans)" / "Approuvée + revue annuelle" / "Approuvée + revue + communiquée").

### Méthodologie de scoring (cœur méthodologique du projet)

**Formule — Score par domaine** :
```
Domain Score = ((moyenne_Likert - 1) / 4) × 100
```

**Formule — Score global** :
```
Global Score = moyenne des 5 scores de domaine
```

**Seuils de maturité** :
| Plage | Niveau |
|---|---|
| 0-25% | Critique |
| 25-50% | Faible |
| 50-75% | Moyen |
| 75-100% | Avancé |

**Logique de sélection des recommandations** (affinée au Jalon 3 pour respecter
précisément le brief encadrant "2-3 recommandations selon les réponses faibles") :
```
Pour chaque domaine, du plus faible au plus fort :
    Si score_domaine < 60% : interroger sévérités [Critical, High]
    Sinon : interroger sévérités [Medium, Low]
Sélectionner un total global de 2-3 recommandations, domaines faibles priorisés
```
Implémentée dans `src/scoring.py::generate_top_recommendations()`.

**Validation par 3 profils de test** (fictifs, permettant de vérifier la cohérence) :

| Profil | Secteur | Score global | Niveau |
|---|---|---|---|
| PME Finance | Finance | 44,0 % | Faible |
| PME Commerce | Commerce | 20,0 % | Critique |
| PME Technologie | Technologie | 83,0 % | Avancé |

*(Note méthodologique honnête à conserver si le rapport aborde la genèse : les premiers
calculs manuels du Jalon 1 comportaient une erreur d'addition, corrigée et revérifiée
automatiquement lors du codage du moteur de scoring au Jalon 2 — bon exemple à valoriser
comme "rigueur de validation croisée manuel → automatisé" dans la section limites/tests.)*

### Diagrammes UML
8 diagrammes déjà produits au Jalon 1 (Mermaid.js, à reconvertir en TikZ ou à inclure comme
images) : cas d'utilisation (3 acteurs, 9 cas), séquence (audit PME, benchmark admin),
classes (7 classes), activité, état (5 états d'un audit), composants (4 tiers), déploiement.
Disponibles dans Google Drive, document Section 4.5.

## 3.4 Réalisation

### Interface applicative (Streamlit)
3 écrans : accueil (sélection du mode d'affichage), questionnaire, résultats.

**Point notable — respect strict du brief encadrant** : le brief spécifiait "une question
par écran **ou** par section". Un sélecteur a été ajouté pour proposer **les deux modes**
au choix de l'utilisateur (5 écrans de 5 questions, ou 25 écrans d'1 question), plutôt que
de n'implémenter qu'une seule option — bon exemple à valoriser dans le rapport comme preuve
de lecture attentive du cahier des charges.

**Système de design** : palette CMRPI (navy #14213D, teal #0E7C7B, sable #C9A46A),
typographie Space Grotesk/Inter/JetBrains Mono, radar chart SVG sur-mesure pour visualiser
les 5 scores de domaine (signature visuelle, plus pertinente qu'un simple bar chart pour ce
type d'évaluation structurée en 5 axes).

### Export PDF
Rapport généré par ReportLab : en-tête CMRPI, tableau d'identification, jauge en arc colorée
selon le niveau, graphique en barres des 5 scores, tableau détaillé, 2-3 recommandations
prioritaires avec badge de sévérité coloré (français : Critique/Haute/Moyenne/Basse).
Captures d'écran réelles disponibles (3 profils testés) dans le rapport Jalon 3
(`Rapport_Progression_Jalon3_CMRPI.pdf`, section 2.2).

### 3 profils fictifs de test intégrés
Chargement en un clic depuis l'écran d'accueil pour démonstration rapide
(`src/test_profiles.py`), exigence explicite du brief Jalon 2 ("tester avec 2-3 profils
fictifs de PME").

## 3.5 Tests et validation

- **54 tests automatisés**, 90 % de couverture de code (pytest + pytest-cov)
- Tests unitaires : scoring, authentification, base de données, génération PDF, questionnaire
- Tests de bout en bout (`streamlit.testing.v1.AppTest`) : simulent un utilisateur réel
  cliquant dans l'application, sans navigateur — parcours complet questionnaire → score → PDF
  vérifié pour les deux modes d'affichage
- **0 erreur flake8** (qualité de code PEP8)
- CI/CD : workflow GitHub Actions (`.github/workflows/ci.yml`) exécutant lint + tests à
  chaque push, sur environnement Python 3.12 neuf

**Incident de qualité corrigé** (bon contenu pour section "difficultés rencontrées") : une
vérification d'installation sur environnement vierge a révélé 3 régressions de dépendances
(`pandas` non utilisé mais cassant l'installation sur Python 3.12 ; `streamlit` épinglé trop
ancien cassant les tests AppTest ; `flake8` trop ancien générant de faux positifs sur les
f-strings). Corrigées, revérifiées de bout en bout, et prévenues à l'avenir par le workflow CI.

## 3.6 Fonctionnalités développées au-delà du périmètre strict (bonus)

- Authentification (bcrypt) et persistance multi-audits (historique)
- Export PDF (devenu périmètre officiel au Jalon 3)

*(Ces éléments illustrent une anticipation au-delà du brief — à valoriser avec mesure, sans
prétendre qu'ils sont pleinement intégrés au flux principal validé.)*

## 3.7 Résultats obtenus

- Plateforme fonctionnelle de bout en bout : questionnaire → score → PDF
- Validée par l'encadrant à chaque jalon (Jalon 1 : "bravo, un livrable de qualité" ;
  Jalon 2 : "merci pour les résultats")
- Code source public et documenté : https://github.com/YOUSSEFKARROUM/PFA
- Qualité logicielle : 54 tests, 90 % couverture, CI/CD, 0 dette technique de lint

## 3.8 Limites observées

- Périmètre mono-utilisateur (pas de multi-tenant complet en production)
- Base SQLite non adaptée à une montée en charge (>50 utilisateurs concurrents) — PostgreSQL
  identifié comme évolution nécessaire
- Pas de benchmarking inter-PME (anonymisé) encore implémenté
- Documentation technique et guide de déploiement à finaliser

## 3.9 Perspectives d'amélioration

- Migration Streamlit → Django/FastAPI + React pour une version production multi-utilisateurs
- Migration SQLite → PostgreSQL
- Déploiement Streamlit Community Cloud (identifié, non encore réalisé au moment du rapport)
- Benchmarking sectoriel anonymisé entre PME
- Certification "PME Cyber-Sûre" (piste évoquée avec l'encadrant)
- Extension du questionnaire à des tracks sectoriels spécialisés (Finance, Santé, E-commerce)

---

# CONCLUSION GÉNÉRALE
*(mappé sur chapters/conclusion.tex)*

Points à synthétiser :
- Stage PFA de 6 semaines (15 juillet - 31 août 2026) au CMRPI/EMC
- Livrable : plateforme fonctionnelle d'auto-évaluation cybersécurité pour PME marocaines,
  validée à chaque étape par l'encadrant professionnel
- Démarche rigoureuse en 3 jalons, avec documentation continue et tests systématiques
- Compétences mobilisées : analyse de référentiels normatifs (ISO 27001, NIST), conception
  d'une méthodologie de scoring justifiée académiquement, développement full-stack Python,
  tests automatisés, gestion de projet et communication avec un encadrant professionnel
- Impact potentiel : sensibilisation des PME marocaines à leur maturité cybersécurité,
  alignement avec la mission du CMRPI

---

## ANNEXES DISPONIBLES (à joindre)

- Code source complet : https://github.com/YOUSSEFKARROUM/PFA
- Les 3 rapports de progression (Jalon 1, 2, 3) — détail jour par jour
- Guide CMRPI/AUSIM (PDF source)
- Schéma de base de données complet (`data/schema.sql`)
- Captures d'écran de l'application et des 3 PDF d'exemple

---

## NOTE MÉTHODOLOGIQUE POUR CLAUDE CODE

1. Respecter le style du template : boîtes `\iacsnote{}`, `\iacswarning{}`,
   `\iacsdefinition{}{}`, tableaux `tabularx`/`booktabs`, figures TikZ pour les diagrammes,
   glossaire (`config/glossary.tex`) pour les acronymes (IA, OCR→non pertinent ici, mais
   ISO, NIST, RGPD/loi 09-08, MFA, RBAC, JWT, CISO, BCP/DRP, SM-2→non pertinent, etc.)
2. Le rapport PicLearn joint (`main.pdf`, 40 pages) est la référence de qualité/mise en
   forme — même niveau de détail et de rigueur attendu, adapté au contenu réel de ce
   projet (rester honnête : ne pas gonfler artificiellement le contenu pour atteindre un
   nombre de pages, le projet CMRPI a un périmètre différent de PicLearn).
3. Toutes les données chiffrées ci-dessus sont réelles (issues des rapports de jalons déjà
   rédigés et pour partie déjà envoyés/validés par l'encadrant) — ne pas inventer de
   nouvelles métriques.
4. Compiler avec `latexmk -pdf -shell-escape main.tex` et vérifier l'absence d'erreurs
   avant de considérer un chapitre terminé.
