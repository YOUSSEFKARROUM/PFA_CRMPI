# Recherche design — Pentascore (novembre 2026)

Objectif : rendre Pentascore mémorable sans perdre la crédibilité d'un outil d'audit
cybersécurité. Contraintes : 100 % hors ligne, WCAG 2.2 AA, `prefers-reduced-motion`,
aucune copie d'un site existant.

> Les sources sont majoritairement des blogs d'agences et des analyses tierces :
> les chiffres cités (durées, tailles de bundle) sont des ordres de grandeur à vérifier
> sur nos propres mesures, pas des vérités.

## 1. Ce que disent les sources

### 1.1 Tendances 2026 : le mouvement doit « travailler »
- Le consensus 2026 : micro-interactions **fonctionnelles** (retour d'état, progression,
  confirmation) plutôt que décoratives ; les animations en boucle sont perçues comme du bruit.
  Durées conseillées : ~300–500 ms, `prefers-reduced-motion` respecté.
  — [merveilleUX](https://www.merveilleux.design/en/blog/article/ui-ux-trends-2026),
  [Design Studio](https://www.designstudiouiux.com/blog/top-saas-design-trends/),
  [SaaSFrame](https://www.saasframe.io/blog/10-saas-landing-page-trends-for-2026-with-real-examples)
- Retour de la personnalité visuelle : typographie expressive (« kinetic type »), grilles
  moins rigides. — [Envato](https://elements.envato.com/learn/web-design-trends)
- Dashboards : hiérarchie centrée sur la donnée, focus visibles, navigation clavier.
  — [Peiko](https://peiko.space/blog/article/top-ui-trends-in-2026-that-actually-improve-ux-us-saas-marketplaces)

**Transposable** : la révélation du score est un *retour d'état* (calcul terminé), elle
justifie une chorégraphie. Le reste de l'interface doit rester calme.
**À éviter** : effets « glow » et dégradés à la mode, qui datent vite et affaiblissent le
sérieux attendu d'un outil CMRPI.

### 1.2 Produits « premium » (Linear, Stripe, Vercel) — principes, pas copie
- Points communs : densité d'interaction (tout répond au survol, au focus, au clavier),
  typographie comme marque, couleur retenue (base quasi monochrome + un accent),
  micro-états soignés. — [Mantlr](https://mantlr.com/blog/stripe-linear-vercel-premium-ui),
  [Pixeldarts](https://www.pixeldarts.com/en/post/four-design-principles-behind-stripe-linear-and-vercel)
- Mouvement rapide et serré : ~200 ms pour les petites interactions, ~350 ms pour les
  transitions de vue, cascades de ~20 ms par élément, `scale(0.97)` à l'appui.
  — [925studios](https://www.925studios.co/blog/linear-design-breakdown),
  [DesignMD](https://www.designmd.co/blog/linear-vs-vercel-motion)
- Police d'interface + police technique monospace, nettement séparées.

**Transposable** : Pentascore a déjà cette base (Inter + IBM Plex Mono + un accent émeraude).
Le gain est dans les **micro-états** et le **rythme**, pas dans une nouvelle palette.
**À éviter** : le mode sombre violet « SaaS IA », la typographie géante vide de sens.

### 1.3 Sites primés et data visualisation
- Awwwards Sites of the Year 2025 : la récompense va à la cohérence d'un concept porté
  jusqu'au détail (mouvement, son, typographie). — [Awwwards SOTY](https://www.awwwards.com/websites/sites_of_the_year/)
- Catégorie Data Visualization : le récit de la donnée (révélation progressive, échelle
  humaine) prime sur la quantité de graphiques.
  — [Awwwards Data Viz](https://www.awwwards.com/websites/data-visualization/?page=5),
  [étude de cas](https://vivishin.medium.com/sites-of-the-year-on-awwwards-data-visualization-case-study-6cfe5d3c7296)
- Cybersécurité : les nominés jouent une métaphore visuelle unique, tenue partout
  (ex. points reliés pilotés par le curseur). — [HackVector.io](https://www.awwwards.com/sites/hackvector-io-cybersecurity)

**Transposable** : Pentascore a **déjà** une métaphore forte et propriétaire : le
**pentagone** (5 domaines). Il doit devenir le fil conducteur : logo, progression du quiz,
révélation du score, historique, PDF, badge.

### 1.4 Révélation d'un score
- Technique éprouvée : tracé SVG par `stroke-dasharray`/`stroke-dashoffset` synchronisé
  avec un compteur `requestAnimationFrame` ; segments remplis en cascade.
  — [infographie animée](https://intro-web-tech.pages.dev/media/svg/examples/04_animated-infographic.html),
  [Babbel](https://bytes.babbel.com/en/articles/2015-03-19-radial-svg-progressbar.html),
  [shadcn blocks](https://www.shadcn.io/blocks/stats-concentric-rings-card)
- Pas d'exemple de référence pour un **radar** tracé : on combinera tracé de la grille
  (dashoffset) et croissance des sommets depuis le centre (`scale` par axe) — c'est
  notre signature, pas un emprunt.

### 1.5 Questionnaire
- « Une chose par page » et indicateur simple (« Question 3 sur 5 ») recommandés par les
  services publics britannique et albertain ; les barres de progression ne sont utiles que
  si elles sont honnêtes. — [GOV.UK](https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/),
  [Alberta](https://design.alberta.ca/patterns/question-page)
- La recherche sur une question par écran vs défilement est mitigée.
  — [SoundRocket](https://soundrocket.com/survey-design-best-practices/)

**Transposable** : garder les deux modes existants (par domaine / question par question),
rendre la progression **par domaine** lisible (pentagone qui se remplit), ajouter les
raccourcis clavier 1–5.

### 1.6 Outils de mouvement (2026)
- Répartition recommandée : View Transitions API pour les changements d'écran, CSS piloté
  au scroll derrière `@supports (animation-timeline: scroll())`, `motion` pour les sorties,
  séquences et layout. N'animer que `transform`/`opacity`.
  — [react.dev 19.3](https://react.dev/blog/2026/09/09/react-19-3),
  [Motion](https://motion.dev/blog/reacts-experimental-view-transition-api),
  [Codeminer42](https://blog.codeminer42.com/what-you-need-to-know-about-view-transitions-in-react/)
- `motion` : ~43 Ko complet, ~5 Ko initial avec `LazyMotion` + `m`, `domAnimation` entre
  17 et 30 Ko selon les sources. — [motion.dev](https://motion.dev/docs/react-reduce-bundle-size)

**Décision** : le budget est de +40 Ko gzip. La révélation et les transitions sont faisables
en CSS + Web Animations API natives (0 Ko). On n'ajoute `motion` (via `LazyMotion`) que si
une sortie animée l'exige réellement, mesure à l'appui.

### 1.7 Icônes
- `lucide-react` : ISC, ~1 400 icônes, trait 2 px cohérent, import par icône (tree-shaking).
  `@phosphor-icons/react` : MIT, 6 graisses, plus lourd à typer.
  — [Hugeicons (comparatif)](https://hugeicons.com/blog/reactjs/react-icon-libraries),
  [DEV](https://dev.to/svgicons/best-svg-icon-libraries-for-react-developers-in-2026-47a6)

**Décision** : `lucide-react` (trait fin et régulier, s'accorde avec les lignes du pentagone,
licence permissive, paquet npm = hors ligne). Trait réglé à 1.5 px.

## 2. Dix principes pour Pentascore

1. **Un seul héros visuel : le pentagone.** Logo, progression, score, historique, PDF, badge.
2. **Le mouvement annonce un changement d'état**, jamais une boucle décorative.
3. **Un seul grand moment chorégraphié** : la révélation du résultat (≈ 1,2 s). Le reste ≤ 300 ms.
4. **Rythme serré** : 150 ms (micro-état), 280 ms (transition), 520 ms (révélation), cascade 60 ms.
5. **N'animer que `transform` et `opacity`** ; tracés SVG via `stroke-dashoffset`.
6. **Réduit = respecté** : sous `prefers-reduced-motion`, l'état final s'affiche directement.
7. **Couleur = sens** : émeraude pour l'action, or pour la donnée, corail pour l'alerte réelle.
   Pas de nouvel accent décoratif.
8. **Chiffres en `tabular-nums`**, monospace pour toute donnée, serif pour les titres.
9. **Chaque élément interactif a 5 états** : repos, survol, focus-visible, appui (`scale .97`), désactivé/chargement.
10. **Zéro dépendance réseau** : polices, icônes et bibliothèques empaquetées par Vite.
