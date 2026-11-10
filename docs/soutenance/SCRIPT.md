# Script de soutenance — Pentascore

Durée visée : **9 min 15**, ce qui laisse plus d'une minute de marge sur 10 minutes.
Ce texte s'affiche aussi dans la présentation : touche **N**. La durée indiquée dans chaque titre sert aussi d'objectif au chronomètre (touche **T**).

Repères : **[→]** = appuyer sur la flèche droite · **[1] [2] [3]** = touches des profils.
Parler lentement. Une phrase par idée. Regarder le jury, pas l'écran.

## Script

### 01 · Couverture — 15 s
Bonjour Mesdames et Messieurs les membres du jury. Je m'appelle Youssef Ait Karroum, en cycle ingénieur IACS à l'ENSA de Béni Mellal.
Je vous présente mon projet de fin d'année, réalisé au CMRPI : une plateforme qui permet à une PME marocaine d'évaluer elle-même sa maturité en cybersécurité.

### 02 · Sommaire — 15 s
Ma présentation suit cinq parties, comme les cinq sommets du pentagone que vous verrez en haut à droite : le contexte, la méthode, la réalisation, le produit en démonstration, puis la conclusion.

### 03 · Organisme d'accueil — 40 s
J'ai effectué mon stage au CMRPI, le Centre Marocain de Recherches Polytechniques et d'Innovation : une association savante fondée en 2012 à l'initiative du Pr. Youssef Bentaleb.
Le CMRPI fait le lien entre la recherche et le terrain. À travers l'Espace Maroc Cyberconfiance, il traite des signalements de cyberviolence : 1 227 rien qu'en 2023.
Il a aussi publié, avec l'AUSIM, un guide de bonnes pratiques de cybersécurité pour les PME. C'est ce guide qui est au cœur de mon projet.
J'y ai été encadré par le Dr. Rachid Abouettahir.

### 04 · Le constat — 30 s
Commençons par le contexte. En 2025, la DGSSI a traité 879 incidents de cybersécurité. 109 d'entre eux ont demandé une intervention directe du maCERT : ce sont les points rouges.
C'est 36 % de plus qu'en 2024.
Face à ces chiffres, un dirigeant de PME se pose une question simple : et moi, où est-ce que j'en suis ?

### 05 · Le problème — 50 s
Le paradoxe, c'est que le Maroc est bien classé : il figure au premier niveau, le Tier 1, du Global Cybersecurity Index de l'UIT.
Le guide CMRPI/AUSIM existe, mais c'est un document d'une quarantaine de pages : on peut le lire, pas se mesurer avec.
[→] D'où ma problématique : comment permettre à une PME d'auto-évaluer sa maturité à partir de ce guide, et d'obtenir des recommandations priorisées ? Dans un périmètre clair : une auto-évaluation déclarative, ni un audit, ni une surveillance du réseau.
Elle pose cinq défis : des réponses déclaratives, donc à contrôler ; un score lisible ; des priorités utiles ; la confidentialité des réponses ; et la simplicité pour un dirigeant non technique. La suite de ma présentation répond à chacun.

### 06 · Le référentiel — 55 s
Deuxième partie, la méthode. J'ai transformé le guide en référentiel de cinq domaines : gouvernance, accès et identités, infrastructure et réseau, incidents et continuité, sensibilisation et formation.
[→] Chaque domaine est aligné sur l'ISO 27001 version 2022 et sur le NIST CSF 2.0 ; la loi 09-08 impose le consentement.
25 questions, cinq par domaine, notées de 1 à 5. La formule ramène la moyenne sur 100, avec quatre niveaux : critique, faible, moyen, avancé.
[→] Cinq domaines, un score : d'où le nom, Pentascore.

### 07 · Le moteur validé — 55 s
Pour valider la méthode, mon encadrant m'a demandé de tester trois PME fictives.
[1] La PME Finance obtient 44 sur 100 : niveau faible. Son point le plus faible est la sensibilisation, à 30 % : c'est donc là que portent les trois priorités, à droite.
[2] La PME Commerce : 20, critique ; ses priorités portent sur les incidents. [3] La PME Technologie : 83, avancé ; il ne reste que des pistes d'amélioration.
Un seul moteur, trois diagnostics différents.

### 08 · La réalisation — 50 s
Troisième partie, la réalisation. J'ai d'abord validé le moteur sur un prototype Streamlit, puis j'ai construit l'application finale.
L'interface est en React ; l'API en FastAPI recalcule toujours le score côté serveur ; toute la logique est dans un moteur Python testable seul ; les données sont dans SQLite.
Côté qualité : 285 tests côté serveur, 71 côté interface, 13 parcours testés de bout en bout, et 98 % de couverture.
Enfin, l'application fonctionne entièrement hors ligne : aucune requête externe, et un test le vérifie.

### 09 · Le film — 135 s
Quatrième partie : le produit. Voici l'application en deux minutes.
[→] D'abord l'accueil et les cinq domaines. Puis la préparation : le nom de l'entreprise, son secteur, et le consentement.
Le dirigeant répond aux 25 questions, une à une, avec une aide pour chacune.
Voici le résultat : le score, le niveau, le pentagone.
On peut rejouer le score : on voit quelle réponse a coûté des points. Et les réponses contradictoires sont signalées.
Puis les priorités, et le rapport PDF, avec son QR code pour se réévaluer dans six mois.
Enfin le badge à partager, et l'historique, qui montre la progression d'une évaluation à l'autre.

### 10 · Pour agir — 40 s
Ce qu'il faut retenir du produit : un score seul ne change rien, il faut pouvoir agir.
Le rapport PDF donne un plan d'action. Rejouer le score montre d'où viennent les points perdus. Trente règles signalent les réponses incohérentes. Et l'historique permet de suivre ses progrès.
Le badge le rappelle : c'est une auto-évaluation, ni un audit, ni une certification.

### 11 · Limites et perspectives — 40 s
Cinquième partie : le recul. Pentascore est un premier repère, pas encore une référence.
L'évaluation est déclarative : demain, on pourra demander des preuves et proposer une évaluation accompagnée par le CMRPI.
Le moteur a été validé sur trois PME fictives : la prochaine étape est un pilote avec de vraies PME, comparé à l'avis d'un auditeur.
Les poids sont égaux et les seuils fixes : ce pilote permettra de les calibrer. Enfin, une version arabe et une comparaison par secteur.

### 12 · Conclusion — 20 s
Pour conclure : évaluer, comprendre, agir. Une PME peut désormais savoir où elle en est, pourquoi, et par quoi commencer.

### 13 · Merci — 10 s
Merci pour votre attention. Je suis prêt à répondre à vos questions.

## Justifier chaque valeur, chaque règle, chaque choix

Cette partie ne se lit pas pendant l'oral (elle ne s'affiche pas avec **N**). Elle sert à répondre au jury quand il demande « d'où vient ce chiffre ? » ou « pourquoi ce choix ? ». Pour chaque valeur : **d'où elle vient**, puis **pourquoi**.

### Les chiffres du contexte (diapositives 03 à 05)
- **CMRPI, fondé en 2012 ; 1 227 signalements en 2023** : chiffres publiés par le CMRPI et l'Espace Maroc Cyberconfiance (cités dans le rapport). Ils montrent que l'organisme connaît le terrain, ce qui légitime le projet.
- **879 incidents en 2025, dont 109 traités directement par le maCERT, +36 % par rapport à 2024** : rapport annuel de la DGSSI (cité dans le rapport). C'est une source officielle marocaine, plus parlante pour le jury qu'une statistique internationale.
- **Tier 1 du Global Cybersecurity Index de l'UIT** : classement public de l'UIT. Il sert à montrer le paradoxe : le pays est bien préparé, mais les PME restent sans outil de mesure.
- **Guide CMRPI/AUSIM d'une quarantaine de pages** : c'est le fichier `Guide-de-bonnes-pratique.pdf` du projet. C'est la matière première : je n'ai pas inventé les bonnes pratiques, je les ai rendues mesurables.
- **Périmètre « auto-évaluation déclarative »** : choix volontaire. Un audit demande un auditeur et un accès au système d'information ; une PME n'a ni le budget ni le temps. L'outil mesure ce que la PME déclare, et le dit clairement.

### Le référentiel (diapositive 06)
- **5 domaines** (gouvernance, accès, infrastructure, incidents, sensibilisation) : ce sont les grands thèmes du guide. Cinq, c'est assez pour couvrir l'essentiel et assez peu pour qu'un dirigeant les retienne. Cela donne aussi le pentagone et le nom « Pentascore ».
- **ISO/IEC 27001:2022** : la norme internationale de référence. Chaque recommandation et chaque règle de cohérence cite une mesure de son annexe A (exemple : A.8.5 pour l'authentification). Cela rend l'outil comparable à un futur audit.
- **NIST CSF 2.0** : le second cadre le plus utilisé. Ses fonctions (gouverner, identifier, protéger, détecter, répondre, rétablir) se retrouvent dans les 5 domaines.
- **Loi 09-08** : loi marocaine sur les données personnelles. C'est elle qui impose le consentement explicite avant l'évaluation.
- **25 questions, 5 par domaine** : même nombre de questions par domaine pour que chaque domaine pèse pareil. 25 questions se remplissent en 10 à 15 minutes : au-delà, un dirigeant abandonne.
- **Échelle de 1 à 5 (Likert)** : format classique des questionnaires de maturité (Dawes, 2008). Assez fin pour nuancer, assez simple pour répondre vite. Chaque niveau est décrit par une phrase concrète, pour limiter l'interprétation.
- **Formule du domaine : ((moyenne − 1) / 4) × 100** : on retire 1 parce que la note minimale est 1, et on divise par 4 parce qu'il y a 4 écarts entre 1 et 5. Résultat : « tout à 1 » donne exactement 0, « tout à 5 » donne exactement 100.
- **Score global = moyenne des 5 domaines (20 % chacun)** : poids égaux pour que le calcul reste vérifiable à la main. Une pondération par secteur demanderait des données réelles que je n'avais pas.
- **4 niveaux : Critique < 25, Faible < 50, Moyen < 75, Avancé ≥ 75** : quatre quarts égaux de l'échelle, inspirés des modèles de maturité CMM/CMMI (Humphrey, 1989). Des seuils réguliers sont faciles à expliquer et ne favorisent aucun profil.

### Le moteur validé (diapositive 07)
- **3 PME fictives** : demande de mon encadrant. Trois profils très différents (faible, critique, avancé) vérifient que le moteur donne trois diagnostics différents, et pas un résultat moyen pour tout le monde. Ils sont codés dans `src/test_profiles.py` et testés automatiquement.
- **PME Finance : 44/100, sensibilisation à 30 %** : les valeurs se recalculent à la main avec la formule ci-dessus.
- **Règles des priorités** :
  - un domaine **sous 60 %** fait remonter des recommandations critiques ou hautes ; au-dessus de 60 %, seulement des pistes d'amélioration. On n'affiche jamais une alerte « haute » à une PME déjà bonne sur ce domaine ;
  - **3 priorités au maximum** : un dirigeant agit sur trois choses, pas sur trente ;
  - **2 au maximum par domaine** : pour ne pas tout concentrer sur un seul domaine ;
  - **jamais une pratique déjà déclarée** : une recommandation n'apparaît que si la réponse à sa question est sous son seuil ;
  - **le domaine le plus faible d'abord**, puis la gravité.
- **47 recommandations** : écrites à partir du guide, chacune avec une gravité et une référence ISO.

### La réalisation (diapositive 08)
- **Streamlit d'abord** : pour valider vite le moteur et le parcours avec l'encadrant, sans perdre de temps sur l'interface.
- **React ensuite** : une interface plus soignée et plus claire pour un dirigeant non technique.
- **FastAPI recalcule toujours le score** : on ne fait jamais confiance à un score envoyé par le navigateur, qui pourrait être modifié. Le serveur reste la seule source de vérité.
- **Moteur Python séparé de l'interface** : le même calcul sert à l'écran, au rapport PDF et aux tests. On peut le tester seul, sans lancer l'application.
- **SQLite, 7 tables** : une base dans un seul fichier, sans serveur à installer, adaptée à un prototype et au hors-ligne. Passer à PostgreSQL pour un déploiement en ligne ne change pas le moteur.
- **285 tests serveur, 71 tests interface, 13 parcours de bout en bout, 98 % de couverture** : le score est un résultat que la PME va croire. Une erreur de calcul ferait perdre la confiance, d'où une couverture bien au-dessus du seuil habituel de 80 %.
- **Hors ligne, aucune requête externe** : les réponses d'une PME sur ses failles sont sensibles ; elles ne doivent partir vers aucun service tiers. Un test automatique vérifie l'absence d'appel externe.

### Le produit (diapositives 09 et 10)
- **Rejouer le score : chaque question pèse 4 points** : 100 points ÷ 5 domaines ÷ 5 questions = 4 points par question. Chaque cran perdu sur l'échelle coûte donc 1 point. Le dirigeant voit exactement d'où viennent ses points perdus.
- **30 règles de cohérence** (fichier `data/rules/consistency_rules.json`) : une auto-évaluation peut contenir des réponses contradictoires. Deux types :
  - **11 règles « déclaration »** : deux réponses qui se contredisent (exemple : MFA déclaré sur l'annuaire mais absent à la question MFA) ;
  - **19 règles « prérequis »** : une pratique avancée déclarée sans sa base (exemple : formation annuelle pour 80 % du personnel, mais aucun volet hameçonnage).
  - Chaque règle cite sa mesure ISO 27001. Une règle signale, mais ne modifie jamais le score : elle invite à vérifier la réponse. Un profil uniforme (tout au même niveau) ne déclenche jamais de règle.
- **Rapport PDF de 3 pages** : une page résultat, une page plan d'action, une page de référence. Assez court pour être lu, assez complet pour être transmis à un prestataire.
- **QR de réévaluation à 6 mois** : délai assez long pour mettre en place les priorités, assez court pour garder l'élan. L'historique montre ensuite la progression.
- **Badge « auto-évaluation »** : il permet de partager sa démarche, mais affiche clairement qu'il ne s'agit ni d'un audit, ni d'une certification, pour ne pas tromper un client ou un partenaire.
- **Consentement et compte facultatif** : exigés par la loi 09-08 ; la PME peut s'évaluer sans créer de compte et supprimer ses données.

## Questions probables du jury

- **Pourquoi d'abord Streamlit, puis React ?** Streamlit a permis de valider vite le moteur et le parcours. React et FastAPI ont permis une interface plus soignée, une API qui recalcule le score, et un fonctionnement hors ligne.
- **Une auto-évaluation est-elle fiable ?** Non, pas totalement : elle est déclarative. C'est pourquoi l'outil signale les réponses contradictoires et ne se présente jamais comme un audit.
- **Pourquoi des poids égaux entre domaines ?** Pour que le score reste lisible et vérifiable à la main. Une pondération par secteur est une piste d'évolution.
- **Et les données personnelles ?** Consentement explicite (loi 09-08), compte facultatif, suppression possible, aucun envoi vers un service tiers.
- **Quelles limites, quelles suites ?** Valider avec de vraies PME pilotes, déployer en ligne avec PostgreSQL, ajouter un benchmark par secteur.

## Avant de passer

- Ouvrir `Pentascore_soutenance.html` dans Chrome, touche **F** pour le plein écran.
- Touche **T** pour afficher le chronomètre, **N** pour afficher ce script.
- Si les animations n'apparaissent pas, ajouter `?motion` à la fin de l'adresse.
