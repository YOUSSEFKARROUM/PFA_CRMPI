# Direction artistique retenue — « Cartographie de précision » (+ priorités éditoriales)

Choix validé le 10/11/2026 parmi trois propositions (`docs/design/directions.html`).
Recherche et principes : `docs/design/RESEARCH.md`.

## Intention
Le résultat Pentascore se présente comme un **relevé d'expert** : le pentagone est un
instrument de mesure (grille, graduations, tracé), les données sont en monospace, les titres
en serif. Les priorités empruntent à la mise en page éditoriale (grands numéros 01/02/03).

## Tokens (`frontend/src/styles/tokens.css`)
| Rôle | Token | Valeur |
|---|---|---|
| Micro-état (survol, appui) | `--duration-fast` | 150 ms |
| Transition | `--duration-base` | 280 ms |
| Apparition | `--duration-slow` | 520 ms |
| Tracé du radar | `--duration-reveal` | 900 ms |
| Cascade | `--stagger` | 60 ms |
| Sortie | `--ease-out` | cubic-bezier(0.16, 1, 0.3, 1) |
| Sceau | `--ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) |
| Trame | `--grid-line`, `--grid-size` | encre 5,5 %, 32 px |

Couleurs inchangées : émeraude = action et niveau satisfaisant, or = donnée et niveau faible,
corail = alerte réelle.

## Règles de mouvement
- Une seule chorégraphie longue : la révélation du résultat (≈ 1,3 s) — grille tracée anneau
  par anneau, score qui compte, forme qui croît, libellés en cascade, sceau de niveau en dernier.
- Tout le reste ≤ 280 ms. Appui : `scale(0.97)`.
- Uniquement `transform`, `opacity` et `stroke-dashoffset`.
- `prefers-reduced-motion` : animations et transitions ramenées à 0,01 ms, état final affiché.
- Utilitaires : `.reveal` + `--i` (rang) + `--reveal-delay` ; `.surface-grid` (trame estompée).

## Icônes
`lucide-react` 0.468.0 (ISC), empaqueté par Vite (hors ligne). Trait 1,5 px (`ICON_STROKE`).
Toujours décoratives (`aria-hidden`) : le texte porte le sens.
| Domaine | Icône |
|---|---|
| Gouvernance | Landmark |
| Accès & identités | LockKeyhole |
| Infrastructure & réseau | Server |
| Incidents & continuité | Siren |
| Sensibilisation & formation | Users |

États de bouton : FileDown / BadgeCheck au repos, LoaderCircle (rotation) pendant la
génération, Check une fois terminé.

## Avancement
- [x] Écran de résultats : révélation chorégraphiée, sceau de niveau, icônes de domaine, priorités éditoriales
- [x] Landing : héros radar gradué, chiffres qui comptent, axe du radar lié au domaine survolé,
      apparitions au défilement (`animation-timeline: view()`, repli statique), cartes de démo avec marque de score
- [x] Préparation : apparition en cascade, bouton fléché
- [x] Questionnaire : transition d'étape, échelle graduée sur chaque réponse, pentagone qui se remplit,
      raccourcis 1–5 et Entrée (mode question par question)
- [x] Historique : zones de niveau, courbe tracée, comparaison des pentagones première/dernière, tendance iconée
- [x] Compte : bénéfices iconés, onglets à indicateur glissant, affichage du mot de passe, jauge de longueur
- [x] En-tête : soulignement animé, logo qui s'installe au chargement
- [x] PDF : radar gradué (graduations tous les 10 points), filet de pied de page
- [x] Badge : trame estompée et axes gradués

## Mesures (10/11/2026)
| | Valeur |
|---|---|
| JS initial (gzip) | 64,5 Ko (61,3 Ko après l'étape résultats) |
| CSS (gzip) | 9,1 Ko |
| Requêtes externes | 0 (test E2E « hors connexion ») |
| `prefers-reduced-motion` | état final affiché immédiatement (vérifié dans Chromium) |
| Tests | backend 285 (98 %), frontend 71 (98 %), E2E 13/13 |

Non mesuré : score Lighthouse (outil non installé localement) ; navigateurs autres que Chromium.
