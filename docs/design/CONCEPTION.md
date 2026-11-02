# Brief de conception et collaboration

Statut : direction validée par le commanditaire le 2 novembre 2026 ; le prototype M0 existe, mais cette direction n'est pas encore intégrée ni qualifiée dans l'hôte. Responsable : agent `designer`, en coordination avec `frontend`, `backend` et `qa`. Ce document applique [DESIGN.md](../../DESIGN.md) et [UX-CONTRACT.md](../../UX-CONTRACT.md) ; il ne remplace ni les [contrats métier](../spec/CONTRACTS.md), ni le [périmètre produit](../spec/PRODUCT.md).

## Intention de l'outil

Un atelier de composition où une personne voit les conséquences de sa demande, règle les composants et garde le contrôle de la version à produire. Le centre de gravité est la page manipulable. La conversation et le catalogue l'assistent sans réduire le résultat à une miniature.

Registre : produit de travail, interface française M1. Référence concrète : table de mise en page avec sélection d'objets, réglages et versions. Signature : la proposition courte et le bloc concerné se mettent en évidence ensemble. La couleur d'accent signale cette relation et l'action principale ; elle n'habille pas chaque panneau.

L'identité de l'éditeur vient exclusivement de DESIGN.md. Ne pas recopier ses valeurs dans des fichiers de thème indépendants. Le thème du site créé appartient au Snapshot et peut être très différent : un portfolio sombre ne rend pas l'inspecteur sombre. Les polices du site, ses rayons et ses animations n'héritent pas implicitement de ceux de l'éditeur.

## Écran de référence

```text
ChatGPT : /manifest (si routé) ou @Manifest -> carte « Ouvrir Manifest »
  +-------------------------------------------------------------------------+
  | Manifest / Projet / Page | Décrire — Composer — Transmettre | Modèle | ... |
  +--------------------------+----------------------------------+-------+-----+
  | Description et état      | Aperçu web réel                  | Suggestions    |
  | du prompt                |                                  |                |
  |                          | [Desktop] [Tablette] [Mobile]    | Liste membres  |
  | champ propre             |                                  | Prévisualiser  |
  | exemple de départ        | page blanche au départ, puis     |                |
  | pause de 1,5 s           | page composée                    | Apparition     |
  |                          |                                  | progressive   |
  |                          |                                  | Ajouter        |
  +--------------------------+----------------------------------+----------------+
  | Brouillon / Sauvegarde | Composer en cours | Préparer le rapport             |
  +-------------------------------------------------------------------------+
```

Les dimensions et seuils de repli restent ceux de DESIGN.md, à éprouver dans le vrai hôte. La vue étroite présente un panneau latéral à la fois et conserve l'accès au champ et aux actions. Le clavier virtuel ne doit pas masquer le focus. Chaque panneau possède son défilement ; sélectionner une proposition ne déplace pas arbitrairement l'utilisateur dans la page.

## Première tranche : M0 avec un bloc

Le premier prototype présente un seul bloc `Hero` simple, avec titre et couleur issus d'une définition contrôlée. Il sert à qualifier Puck dans la vue ChatGPT, la sélection, un réglage effectif, le bridge autorisé et les états d'attente/erreur. Aucun catalogue de dix blocs, génération libre de code, 3D ou export complet n'est nécessaire pour démontrer cette tranche.

Le champ propre de l'éditeur reste l'entrée de composition ; on ne lit ni ne modifie le texte non envoyé du compositeur de l'assistant. Le parcours de référence dans ChatGPT Desktop sélectionne `@Manifest`, puis ouvre la carte « Ouvrir Manifest ». `/manifest` est un raccourci souhaité, mais ne doit pas être présenté comme commande native disponible sans preuve dans l'hôte. Si la vue embarquée est indisponible, proposer un repli navigateur qui garde le même projet et le même backend autorisé, ou expliquer la limite ; ne jamais basculer silencieusement vers un faux projet local.

Un scénario de suggestion simulée peut éprouver les états et les courses sans coût d'API ; son origine est indiquée comme simulation. Il ne prouve ni la qualité du modèle ni l'intégration fournisseur. Les appels réels utilisent l'API explicitement choisie, côté backend, avec réglages d'usage visibles ; ils ne présument pas l'accès aux crédits ou aux identifiants internes du modèle ChatGPT. Les appels réels viennent avec un essai contrôlé et leurs preuves distinctes.

La page autonome sert à diagnostiquer le rendu ou le réseau. Une réussite dans le navigateur ne clôt pas la qualification demandée dans ChatGPT. La grille [M0-REVIEW.md](M0-REVIEW.md) définit les observations à remplir.

## Parcours et comportements à développer

| Étape | Action / état visible | Règle observable |
|---|---|---|
| Ouvrir | projet, page et dernier brouillon confirmé | lecture autorisée, aucune version inventée |
| Activer | choix du modèle, limite d'usage, analyse automatique | transmission après pause expliquée, suspension disponible |
| Écrire | champ disponible et texte conservé | aucune génération par frappe, Enter garde sa fonction de nouvelle ligne |
| Attendre | pause de 1,5 s par défaut, hors composition IME | une seule demande éligible à 1 500 ms ; nouvelle frappe réinitialise le délai et invalide la génération précédente |
| Synchroniser | enregistrement des réglages manuels préalable | ne pas générer sur une base non confirmée ; conflit bloque le départ |
| Proposer | progression réelle, Arrêter accessible | champ et curseur restent utilisables ; pas de pourcentage fictif |
| Prévisualiser | proposition complète et valide ; états « Prévisualisée » / « Ajoutée » | candidat temporaire, provenance visible, aucune approbation implicite |
| Régler | inspecteur agit sur un bloc conservé ; l'intention peut être corrigée à tout moment | une proposition en lecture seule ne devient pas modifiable sans action explicite ; la promotion et le réglage sont atomiques si cette capacité est livrée |
| Conserver | brouillon sauvegardé après accusé serveur | groupe annulable, aucune double application sur retry |
| Valider la version | état visible éligible figé dans une révision immuable | pas de rapport ou export attribué à un candidat obsolète |
| Préparer / transmettre | rapport révisable puis envoi explicite au chat courant | révision/hash et provenance figés ; fallback copie/téléchargement si l'hôte ne sait pas transmettre |
| Exporter | préparation, compilation, contrôle, archive prête | mêmes composants et paramètres ; artefact attaché à la révision initiale |

Le rendu des suggestions n'attend pas une soumission au chat. Il attend une proposition complète validée, jamais un fragment de JSX. Une demande précise conduit à un candidat ciblé ; une intention exploratoire peut proposer jusqu'à trois alternatives complètes du même fournisseur choisi. Les cartes proviennent d'un catalogue filtré par capacité, cible, compatibilité et licence ; le modèle classe ou explique ces candidats sans inventer une dépendance absente du catalogue.

### Exemple de description et de moteur de suggestion

Description : « Crée un annuaire d'équipe responsive avec une recherche et une fiche de profil au survol. Les membres apparaissent progressivement avec un léger fondu et un mouvement vers le haut. »

Après 1,5 seconde de pause, l'aperçu central prépare la page. Le rail de droite peut proposer « Liste de membres — Card + Avatar, release et source », « Apparition progressive — Motion, délai réglable à 120 ms » et « Fiche de profil — panneau accessible au clavier ». Chaque carte explique pourquoi elle correspond, permet un aperçu, puis une action distincte pour l'ajouter. Si l'utilisateur modifie le délai à 180 ms, seule cette propriété change ; la dernière version stable reste visible tant que la nouvelle proposition est en préparation.

L'annuaire est une fixture de direction et de recette, pas une promesse que M0 produit déjà cette page multipage ou son export complet. La liste de bibliothèques des captures est un registre de candidates à admettre par release ; elle ne signifie pas que toutes sont installées dans chaque projet.

## États et contenu d'interface

| Situation | Texte et retour attendus | Action utile |
|---|---|---|
| Aucun contenu | champ vide « Décris la page que tu imagines… » ; canevas initial blanc avec « Votre page apparaîtra ici » | exemple de départ activable ; aucun faux composant dans l'aperçu |
| Frappe / attente de pause | indication discrète, sans déplacement de contrôles | continuer d'écrire |
| Génération active | « Recherche de propositions » | Arrêter, continuer à saisir |
| Suggestion trouvée | bibliothèque, version, raison et statut « Suggestion » | Prévisualiser |
| Proposition seule | statut « Prévisualisée » | Ajouter à la composition / Ignorer |
| Nouvelle intention | « Proposition précédente » si son image reste visible | attendre une réponse actuelle ; pas d'approbation de l'ancien candidat |
| Sauvegarde active | « Enregistrement » | poursuivre les réglages, file ordonnée |
| Accusé reçu | « Sauvegardé » | poursuivre ; aucune confirmation supplémentaire |
| Hors ligne / erreur | cause et contenu conservé | reprise contrôlée, sans perte de la saisie |
| Version concurrente | « Le projet a changé dans une autre vue » | comparer, recharger ou récupérer une copie |
| Refus / quota | catégorie compréhensible, pas un coût supposé nul | modifier la demande, changer volontairement de modèle ou attendre |
| Catalogue sans résultat | recherche conservée | effacer le filtre ou changer la catégorie |
| Rapport prêt | révision, empreinte, contenu et limites visibles | relire puis Transmettre au chat |
| Envoi du rapport | envoi confirmé, échec ou résultat incertain | aucun succès affiché sans reçu de l'hôte |
| Fonction indisponible | raison près du contrôle | solution réelle ou sortie explicite, jamais faux succès |

Les erreurs importantes restent visibles près de l'action concernée. Une notification éphémère ne porte pas seule la solution d'un conflit. Les retours sémantiques utilisent texte et icône en plus de la couleur. Les statuts ne récitent pas chaque événement du réseau.

Les cartes du rail droit privilégient une vignette rendue depuis le vrai composant ou l'animation proposée ; un schéma générique est clairement étiqueté. Les visuels décoratifs appartiennent à la page de l'utilisateur, pas à la coque Manifest. Pour une scène illustrative (par exemple une plage au coucher du soleil), utiliser une ressource autorisée avec contraste du texte vérifié, et garder une alternative sans image.

## Contrôle, verrouillages et fidélité

La sélection est un état de l'éditeur ; son contour, les poignées et les labels ne sont jamais exportés. Les dimensions de l'aperçu ne réécrivent pas les règles responsive de la page. Un contrôle affiché doit modifier le rendu réel et être pris en charge par l'export de la release.

Un verrouillage est identifiable sur le bloc ou la propriété, avec un libellé accessible. L'IA ne déverrouille pas la cible et n'élargit pas une demande locale en changement de thème global. Expliquer une impossibilité sans modifier silencieusement un autre bloc. Déverrouiller reste une action humaine distincte selon le contrat.

Comparer aperçu et export aux mêmes dimensions, polices chargées, contenu et états interactifs. Vérifier aussi les liens, le menu mobile, la FAQ et le formulaire dans les phases où ces blocs existent. Un formulaire sans serveur d'envoi reste explicitement non connecté. Une ressemblance de capture ne prouve ni l'interactivité ni l'accessibilité.

## Propriété canonique et critères visuels

Les propriétaires futurs sont ceux de la carte de UX-CONTRACT.md : IntentComposer, SelectionController, DraftSync, FeedbackProvider, primitives Select/Dialog et DocumentController. Avant de coder une capacité, frontend confirme son propriétaire et réutilise celui existant. Aucune variante de panneau ne recrée son propre système de sauvegarde, notification ou temporisation.

Le prototype M0 fournit déjà un éditeur de qualification à bloc unique. Il ne constitue pas encore le flux complet décrit ici : la direction à trois zones, les révisions persistantes, la transmission du rapport et sa qualification dans le vrai ChatGPT Desktop restent à réaliser ou à prouver. Aucune conformité runtime n'est revendiquée par le présent brief.

- La page domine visuellement et son état candidat/conservé reste lisible.
- Les choix esthétiques de l'éditeur suivent DESIGN.md ; les choix du site servent son sujet et son contenu.
- Les états d'attente et les polices tardives ne déplacent pas les actions principales.
- Tout réglage fonctionne au clavier, le focus reste visible et le drag possède une alternative.
- Les menus sont vérifiés ouverts, pas seulement fermés dans une capture.
- Le mouvement explique sélection, apparition ou conservation ; le mode réduit retire le mouvement non essentiel.
- Les textes longs, images manquantes et écrans étroits sont des cas de conception à couvrir.
- À 375 px et dans la largeur réelle du panneau ChatGPT, aucune action nécessaire ne disparaît ; les tiroirs restaurent le focus et ne provoquent pas de débordement horizontal.
- Le rapport de transmission reprend la provenance du candidat qui a été conservé, pas le modèle sélectionné ensuite ; un résultat obsolète ne peut pas être marqué « à jour ».
- La qualité est évaluée sur plusieurs compositions ; le nombre d'effets n'est pas un critère de goût.

## Trois briefs de référence

Les données sont fictives, réutilisables pour la recette et sans recours à des contenus privés.

| Sujet / audience / objectif | Direction propre au site | Séquence de demandes de test |
|---|---|---|
| Restaurant « Les Tables du Canal », habitants et visiteurs ; consulter la carte puis réserver via un lien configuré | caractère de cuisine de quartier, hiérarchie autour des plats et horaires ; une carte lisible prime sur les effets | « Mets la carte avant les photos », puis « Plus vivant », puis verrouiller les horaires et demander une nouvelle disposition |
| Portfolio « Maëlle Roussel, photographie documentaire », directeurs artistiques ; parcourir les séries puis contacter | images et légendes au premier plan, rythme variable entre séries, typographie discrète ; aucune galerie uniforme imposée | « Fond clair et grande première image », puis « Essaye sombre », puis revenir au clair pendant la génération |
| Produit fictif « Relais, planning d'équipe », petites structures ; comprendre l'usage et essayer une démo | information concrète, scénario et aperçu de planning, bénéfices vérifiables ; pas de chiffres ni témoignages inventés | « Montre d'abord un exemple », puis « Rends le titre plus court », puis demander une animation et tester mouvement réduit |

Le M0 n'implémente que le Hero de l'un de ces sujets. M1 étend les trois briefs avec les blocs admis. QA conserve contenus et dimensions de référence pour comparer les comportements et exports.

## Collaboration et passage de relais

1. L'orchestrateur ouvre un ticket prêt, nomme le propriétaire et le périmètre des fichiers. Le designer fournit le scénario, les états et les critères visuels de la capacité, sans changer le domaine.
2. Frontend traduit ces critères en composants partagés et tests, en accord avec les contrôles et données du catalogue. Backend confirme les états et erreurs réellement disponibles.
3. QA choisit les cas applicables, prépare les fixtures et consigne des preuves datées. Le designer relit le parcours et les captures dans leurs états réels, en particulier erreur, conflit et vue étroite.
4. Une divergence produit/contrat est remontée à l'orchestrateur et au tech lead. Elle ne se résout pas par une propriété JSON improvisée ou une exception locale non documentée.
5. Une décision esthétique durable se répercute dans DESIGN.md et son futur mapping runtime dans le même changement. Un choix propre à un site reste dans le Snapshot ; il ne reconfigure pas le shell.

Pour chaque revue : ticket, commit, source de vérité utilisée, périmètre testé, résultat, preuve et limites. Les critères non observés restent « non exécuté ». La revue M0 prépare les tickets suivants ; elle n'autorise pas à annoncer l'outil complet.
