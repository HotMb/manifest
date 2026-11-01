# Brief de conception et collaboration

Statut : brief de développement, sans interface implémentée ni recette exécutée. Responsable : agent `designer`, en coordination avec `frontend`, `backend` et `qa`. Ce document applique [DESIGN.md](../../DESIGN.md) et [UX-CONTRACT.md](../../UX-CONTRACT.md) ; il ne remplace ni les [contrats métier](../spec/CONTRACTS.md), ni le [périmètre produit](../spec/PRODUCT.md).

## Intention de l'outil

Un atelier de composition où une personne voit les conséquences de sa demande, règle les composants et garde le contrôle de la version à produire. Le centre de gravité est la page manipulable. La conversation et le catalogue l'assistent sans réduire le résultat à une miniature.

Registre : produit de travail, interface française M1. Référence concrète : table de mise en page avec sélection d'objets, réglages et versions. Signature : la proposition courte et le bloc concerné se mettent en évidence ensemble. La couleur d'accent signale cette relation et l'action principale ; elle n'habille pas chaque panneau.

L'identité de l'éditeur vient exclusivement de DESIGN.md. Ne pas recopier ses valeurs dans des fichiers de thème indépendants. Le thème du site créé appartient au Snapshot et peut être très différent : un portfolio sombre ne rend pas l'inspecteur sombre. Les polices du site, ses rayons et ses animations n'héritent pas implicitement de ceux de l'éditeur.

## Écran de référence

```text
+--------------------------------------------------------------------------------+
| Projet / Page  | Fournisseur + modèle | Aperçu | Annuler | Historique | Approuver |
+----------------------+------------------------------------+--------------------+
| Intention            |                                    | Réglages du bloc   |
| champ propre         |        Aperçu manipulable           | texte / disposition|
| Analyse auto / arrêt |        de la page                  | couleurs / mouvement|
| statut explicite     |                                    | verrouillages      |
|----------------------|                                    |                    |
| Suggestions          | indication candidat ou brouillon   | actions accessibles|
| Conserver / Refuser  |                                    | sans glisser       |
|----------------------|                                    |                    |
| Catalogue et pages   |                                    |                    |
+----------------------+------------------------------------+--------------------+
| État de sauvegarde et retour d'erreur utiles, sans message technique permanent  |
+--------------------------------------------------------------------------------+
```

Les dimensions et seuils de repli restent ceux de DESIGN.md, à éprouver dans le vrai hôte. La vue étroite présente un panneau latéral à la fois et conserve l'accès au champ et aux actions. Le clavier virtuel ne doit pas masquer le focus. Chaque panneau possède son défilement ; sélectionner une proposition ne déplace pas arbitrairement l'utilisateur dans la page.

## Première tranche : M0 avec un bloc

Le premier prototype présente un seul bloc `Hero` simple, avec titre et couleur issus d'une définition contrôlée. Il sert à qualifier Puck dans la vue ChatGPT, la sélection, un réglage effectif, le bridge autorisé et les états d'attente/erreur. Aucun catalogue de dix blocs, génération libre de code, 3D ou export complet n'est nécessaire pour démontrer cette tranche.

Le champ propre de l'éditeur reste l'entrée du produit ; on ne lit ni ne modifie le champ natif de l'assistant. Un scénario de suggestion simulée peut éprouver les états et les courses sans coût d'API ; son origine est indiquée comme simulation. Il ne prouve ni la qualité du modèle ni l'intégration fournisseur. Les appels réels viennent avec un essai contrôlé et leurs preuves distinctes.

La page autonome sert à diagnostiquer le rendu ou le réseau. Une réussite dans le navigateur ne clôt pas la qualification demandée dans ChatGPT. La grille [M0-REVIEW.md](M0-REVIEW.md) définit les observations à remplir.

## Parcours et comportements à développer

| Étape | Action / état visible | Règle observable |
|---|---|---|
| Ouvrir | projet, page et dernier brouillon confirmé | lecture autorisée, aucune version inventée |
| Activer | choix du modèle, limite d'usage, analyse automatique | transmission après pause expliquée, suspension disponible |
| Écrire | champ disponible et texte conservé | aucune génération par frappe, Enter garde sa fonction de nouvelle ligne |
| Attendre | pause de 900 ms par défaut, hors composition IME | délai configurable selon PRODUCT.md ; nouvelle frappe invalide la génération précédente |
| Synchroniser | enregistrement des réglages manuels préalable | ne pas générer sur une base non confirmée ; conflit bloque le départ |
| Proposer | progression réelle, Arrêter accessible | champ et curseur restent utilisables ; pas de pourcentage fictif |
| Prévisualiser | proposition complète et valide, Conserver / Refuser | candidat temporaire, aucune approbation implicite |
| Régler | inspecteur agit sur le bloc sélectionné | si candidat éligible, promotion et réglage sont une commande atomique |
| Conserver | brouillon sauvegardé après accusé serveur | groupe annulable, aucune double application sur retry |
| Approuver | état visible éligible figé dans une révision | pas d'export si approbation en échec |
| Exporter | préparation, compilation, contrôle, archive prête | mêmes composants et paramètres ; artefact attaché à la révision initiale |

Le rendu des suggestions n'attend pas une soumission au chat. Il attend une proposition complète validée, jamais un fragment de JSX. Une demande précise conduit à un candidat ciblé ; une intention exploratoire peut proposer jusqu'à trois alternatives complètes du même fournisseur choisi.

## États et contenu d'interface

| Situation | Texte et retour attendus | Action utile |
|---|---|---|
| Aucun contenu | « Décris la page que tu veux composer » | commencer une intention ou ajouter le bloc disponible |
| Frappe / attente de pause | indication discrète, sans déplacement de contrôles | continuer d'écrire |
| Génération active | « Recherche de propositions » | Arrêter, continuer à saisir |
| Proposition seule | « Proposition à conserver » | Conserver / Refuser |
| Nouvelle intention | « Proposition précédente » si son image reste visible | attendre une réponse actuelle ; pas d'approbation de l'ancien candidat |
| Sauvegarde active | « Enregistrement » | poursuivre les réglages, file ordonnée |
| Accusé reçu | « Sauvegardé » | poursuivre ; aucune confirmation supplémentaire |
| Hors ligne / erreur | cause et contenu conservé | reprise contrôlée, sans perte de la saisie |
| Version concurrente | « Le projet a changé dans une autre vue » | comparer, recharger ou récupérer une copie |
| Refus / quota | catégorie compréhensible, pas un coût supposé nul | modifier la demande, changer volontairement de modèle ou attendre |
| Catalogue sans résultat | recherche conservée | effacer le filtre ou changer la catégorie |
| Fonction indisponible | raison près du contrôle | solution réelle ou sortie explicite, jamais faux succès |

Les erreurs importantes restent visibles près de l'action concernée. Une notification éphémère ne porte pas seule la solution d'un conflit. Les retours sémantiques utilisent texte et icône en plus de la couleur. Les statuts ne récitent pas chaque événement du réseau.

## Contrôle, verrouillages et fidélité

La sélection est un état de l'éditeur ; son contour, les poignées et les labels ne sont jamais exportés. Les dimensions de l'aperçu ne réécrivent pas les règles responsive de la page. Un contrôle affiché doit modifier le rendu réel et être pris en charge par l'export de la release.

Un verrouillage est identifiable sur le bloc ou la propriété, avec un libellé accessible. L'IA ne déverrouille pas la cible et n'élargit pas une demande locale en changement de thème global. Expliquer une impossibilité sans modifier silencieusement un autre bloc. Déverrouiller reste une action humaine distincte selon le contrat.

Comparer aperçu et export aux mêmes dimensions, polices chargées, contenu et états interactifs. Vérifier aussi les liens, le menu mobile, la FAQ et le formulaire dans les phases où ces blocs existent. Un formulaire sans serveur d'envoi reste explicitement non connecté. Une ressemblance de capture ne prouve ni l'interactivité ni l'accessibilité.

## Propriété canonique et critères visuels

Les propriétaires futurs sont ceux de la carte de UX-CONTRACT.md : IntentComposer, SelectionController, DraftSync, FeedbackProvider, primitives Select/Dialog et DocumentController. Avant de coder une capacité, frontend confirme son propriétaire et réutilise celui existant. Aucune variante de panneau ne recrée son propre système de sauvegarde, notification ou temporisation.

Il n'existe pas encore d'implémentation de référence ni de workflow voisin vérifié. La première tranche doit donc produire cette référence avec ses preuves ; aucune conformité runtime n'est revendiquée par le présent brief.

- La page domine visuellement et son état candidat/conservé reste lisible.
- Les choix esthétiques de l'éditeur suivent DESIGN.md ; les choix du site servent son sujet et son contenu.
- Les états d'attente et les polices tardives ne déplacent pas les actions principales.
- Tout réglage fonctionne au clavier, le focus reste visible et le drag possède une alternative.
- Les menus sont vérifiés ouverts, pas seulement fermés dans une capture.
- Le mouvement explique sélection, apparition ou conservation ; le mode réduit retire le mouvement non essentiel.
- Les textes longs, images manquantes et écrans étroits sont des cas de conception à couvrir.
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
