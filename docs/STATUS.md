# Manifest — suivi du projet

Mise à jour : **3 novembre 2026**. Référence : dépôt [HotMb/manifest](https://github.com/HotMb/manifest), branche locale `work/arc-01`, registre **révision 14**. Les Issues GitHub sont des miroirs ; `docs/delivery/tickets.json` fait foi.

**Dernière vérification ARC-01 :** PR [#27](https://github.com/HotMb/manifest/pull/27) toujours en brouillon, HEAD `bd21c25780e2d92d4a31081c52e4a08265234e43`. Les deux jobs CI ont terminé en échec après 28/28 E2E réussis, à cause de six liens Markdown mal relatifs dans la nouvelle preuve ; les chemins sont corrigés localement et le rerun CI attend le prochain push. Les preuves ChatGPT Desktop/OAuth restent manquantes. L’arbre local ne contient que ce correctif documentaire non commité à cette étape.

## État actuel

- **ARC-01 : bloqué** après livraison et revue du sous-ensemble local. Il reste à prouver le parcours dans ChatGPT Desktop, le bridge et l’identité OAuth, l’actualisation, les capacités d’hôte et une modification réelle. Voir [l’audit de disponibilité et des PR du 3 novembre](meetings/2026-11-03-ARC-01-delivery-review.md), le [compte rendu du lot local](meetings/2026-11-03-ARC-01-review.md) et la [preuve d’implémentation locale](evidence/ARC-01/implementation-2026-11-03.md).
- La release privée 0.1.3 est confirmée comme courante. Le smoke stdio, les tests du bridge local, l’authentification Bearer de développement et le préremplissage simulé passent ; aucun n’établit un rendu dans ChatGPT Desktop ou une identité OAuth. Voir les [preuves bridge et identité](evidence/ARC-01/bridge-identity-proof-2026-11-03.md).
- `npm run team:next` doit afficher **0 nouveau ticket éligible**. ARC-02 dépend de la fin d’ARC-01. Ne pas contourner ce prérequis.
- Le cadrage de la direction Figma a été précisé le 3 novembre : une seule surface de travail, brief/proposition à gauche, candidat modifiable au centre et recherche catalogue à droite ; pas de navigation par étapes ni de page séparée de réglage de bloc. L’incrément ARC-01 de cette branche ajoute un champ de recherche et sept démos codées en dur. Ce n’est pas le catalogue versionné avec ajout/glisser-déposer, et le transfert `/validate` manque. Le canevas et les autres critères restent soumis aux tickets et au gate ARC-01.

## Cadrage enregistré en révision 14

- Le lancement attendu distingue nouveau projet, nouvelle page dans un projet existant et modification d’une page existante ; il transmet la cible/version et la proposition déjà formulée par ChatGPT. Les Snapshots existants sont relus, un candidat est contrôlé contre sa version de base et reste éditable avant conservation. Un texte seul préremplit le champ mais ne lance pas de modèle avant activation automatique ou action manuelle. Manifest ne lit jamais le texte non envoyé du compositeur natif.
- Le champ principal sert au brief et à ses modifications réactives ; le catalogue à droite reste une recherche distincte, locale et sans appel de modèle. Survol, clavier et toucher permettent de voir les démonstrations sans modifier la page ; l’ajout reste une action explicite.
- L’intention de données est conservée dans `Snapshot.dataIntegrationSpecs` et suit la version du brouillon et la révision approuvée. `/validate` doit transmettre au modèle hôte cette spécification non secrète (source/référence, schéma, liaisons aux graphiques, transformations, rafraîchissement, aperçu synthétique/connecté et prérequis d’autorisation). Cela explique à ChatGPT l’intégration souhaitée ; le rapport ne confère pas lui-même l’accès et n’emporte aucun secret ou ligne sensible.
- Ces décisions sont inscrites dans le cadrage et les critères de UX-01, UI-01, UI-02, UI-03, DOM-01, DOM-02, AI-02, REV-01 et TEST-01. Elles sont à construire après levée des dépendances ; elles ne constituent pas une preuve d’implémentation. Les schémas JSON exécutables et les capacités réelles de l’hôte restent à aligner/qualifier par les tickets concernés.

## Ce qui est livré dans la tranche locale

- Champ principal décrivant la page et ses mouvements ; proposition manuelle ou analyse après activation, avec une pause de 1,5 s. Les propositions locales et le simulateur sont prévisualisés avant conservation.
- Ajout manuel d’une section M0, annuler/rétablir, sauvegarde navigateur et affichage mobile.
- Ajustements de hiérarchie, ouverture directe à 375 px dans l’étape Décrire, disparition du message vide sous un candidat et contraste des champs Puck vérifié à ≥ 4,5:1.
- Le plugin privé ChatGPT Desktop a la release courante **0.1.3** (scope utilisateur, visibilité privée). Son paquet local passe le smoke MCP stdio ; son rendu réel dans l’hôte reste à observer. Voir la [revue du rafraîchissement](meetings/2026-11-03-ARC-01-plugin-refresh-review.md), la [preuve du paquet](evidence/ARC-01/plugin-refresh-2026-11-03.md) et les [preuves bridge/identité](evidence/ARC-01/bridge-identity-proof-2026-11-03.md).
- Les détails de compatibilité, résultats et limites figurent dans la [preuve datée](evidence/ARC-01/implementation-2026-11-03.md) et la [comparaison explicite à la maquette](evidence/ARC-01/figma-alignment-2026-11-03.md). Les références Figma antérieures restent dans [la revue de direction](meetings/2026-11-02-MANIFEST-design-direction.md).

## Ce qui n’est pas encore livré

- Le vrai catalogue versionné à droite avec provenance/licence et l'ajout par glisser-déposer ou action accessible restent absents. Une recherche locale avec sept exemples/démos est visible, mais elle n’insère rien au canevas : UX-01/UI-01/UI-02/CAT-01/CAT-02.
- Le LaunchContext à trois opérations (nouveau projet, nouvelle page, modification de page) avec proposition de l’assistant et candidat/version, puis le comportement associé : UI-03/AI-02.
- La pièce jointe de référence sous le champ principal, la spécification d’intégration des données dans le rapport, `/validate` avec accusé et transmission au chat : UI-02/AI-02/REV-01.
- La création/modification générale de projets, plusieurs pages, un export d’application complète et un modèle réel. Le prototype actuel est borné à un projet/page et zéro ou un Hero ; aucun fournisseur n’a été appelé dans cette tranche.
- Le rendu final dans ChatGPT Desktop et la matrice de capacités réelles restent à vérifier. Le badge « WebMCP unavailable » observé précédemment n’est pas remplacé par une preuve de réussite.

Les tâches M1 sont encore `todo` en raison de leurs dépendances. L’absence de recherche catalogue n’est pas maquillée par un champ local factice ; ses critères sont dans UI-02/CAT-02 et l’architecture approuvée.

## Vérifications exécutées

| Vérification | Résultat |
|---|---|
| E2E navigateur | **28/28 réussis**, dont contexte de lancement, aperçu de fond, recherche, canevas vide, mobile et sauvegarde ; adaptateur d’hôte simulé |
| M0 backend/MCP/adaptateurs/jobs | **66/66 réussis** avec loopback local autorisé ; couvre stdio/MCP et le Bearer de développement |
| Fournisseurs et simulateur | **28/28 réussis**, aucun appel à une API de modèle |
| Tests UI du propriétaire frontend | **14 réussis** |
| `npm test` | **20 réussis, 1 ignoré** faute de droit de création de lien symbolique sous Windows |
| Typecheck, build/package, smoke stdio, `npm run check`, `git diff --check` | réussis ; les avertissements Vite/Puck sont documentés. L’audit UI strict antérieur conserve ses findings listés plus bas. |
| Contrats Python | non exécutés : `jsonschema` est absent de cet environnement |

Une revue indépendante du code M0 et une revue design sur la capture finale ont été réalisées. Le compte rendu distingue les captures et simulateurs locaux de l’environnement hôte réel.

L’audit de disponibilité du 3 novembre a relancé les tests backend et navigateur avec l’accès loopback requis, vérifié le smoke MCP et interrogé l’inventaire complet des PR ouvertes. GitHub Actions Quality run 56 est vert sur le HEAD commité `f95c297`. L’inventaire ne contient qu’une PR ouverte, la #27, encore en brouillon ; sa description renvoie à l’ancienne révision 3 au lieu du registre 14. Au moment de ce premier contrôle, la provenance de changements applicatifs locaux n’était pas établie ; la revue de réalisation suivante les attribue à `/root`, `/root/handoff` et `/root/design_review`. Ils ne font pas partie de la PR ni de la CI verte. La relance locale passe le typecheck, le build, 20 tests généraux (1 ignoré), 66 tests M0, 28 tests providers, 25 tests E2E, le smoke MCP et `npm run check`. Dans l’interpréteur Python courant, les contrats n’ont pas pu être relancés, faute de `jsonschema`. L’audit UI strict signale aussi un propriétaire non défini pour un `<select>` natif dans le panneau fournisseur/modèle. Le code reviewer relève un contraste insuffisant pour certains fonds gris. Voir la [preuve d’audit](evidence/ARC-01/delivery-readiness-2026-11-03.md), la [revue d’équipe d’audit](meetings/2026-11-03-ARC-01-delivery-review.md) et le [correctif local espace unique](meetings/2026-11-03-ARC-01-single-workspace-review.md).

La relecture loop-verify a passé 6/6 critères sur le rapport d’audit en français avant que les changements applicatifs locaux non attribués ne soient découverts. Ce résultat porte sur le rapport initial, pas sur ce code local, et ne remplace pas la preuve d’exécution dans ChatGPT Desktop ni ne lève ARC-01. La revue ARC-01 précédente conserve séparément son résultat historique.

La relecture loop-verify a utilisé ses deux passes : la seconde a validé 4/5 critères, mais le paquet omettait le fichier de dettes contenant DEBT-004. Aucun PASS global n’est revendiqué ; la limite de tentatives est atteinte.

## Dettes et risques suivis

- DEBT-001 à DEBT-004 restent ouvertes dans [TECH-DEBT.md](TECH-DEBT.md), chacune liée à son propriétaire et jalon.
- Puck émet pendant les parcours un avertissement `setData` coûteux ; il n’a pas causé d’échec mais nécessite une mesure avant d’optimiser. Ce n’est pas encore une dette validée ni une mesure de performance.
- Le premier déploiement du test M0 sans autorisation locale a échoué `EACCES`; son rerun autorisé a réussi 64/64. Le problème concernait l’accès réseau loopback du banc de test, pas une requête fournisseur.

## Prochaine action

Dans ChatGPT Desktop, ouvrir Manifest avec le build poussé, vérifier l’ouverture depuis le chat, le chargement du projet et la lecture authentifiée, puis tenter une modification et relever les capacités visibles. Fournir une capture du résultat ou de l’erreur ; ne pas inclure de jeton ou secret. L’ARC-01 pourra être réouvert par l’orchestrateur à partir de cette preuve. Après obtention, terminer la matrice hôte/identité avant de démarrer ARC-02.

## Reprendre

Relire `AGENTS.md`, ce fichier et [ORCHESTRATION.md](delivery/ORCHESTRATION.md), puis lancer `npm run team:status` et `npm run team:next`. Voir [le tableau généré](delivery/BOARD.md), [la correspondance GitHub](delivery/GITHUB.md), [le compte rendu de fin de tâche](meetings/2026-11-03-ARC-01-review.md) et [les dettes](TECH-DEBT.md).


## Correctif espace unique et lancement — 3 novembre 2026

La modification locale est attribuée à `/root`, avec `/root/handoff` et `/root/design_review`. Le paquet privé Manifest 0.1.2 a été actualisé : surface unique, demande explicitement transmise au brief et aperçu noir exact, conservation/abandon/reprise vérifiés. [Revue et preuves](meetings/2026-11-03-ARC-01-single-workspace-review.md). Le code reste non commité et n’a pas été poussé ; un commit de suivi documentaire seul (`8d54f58`) a été poussé ensuite. Le schéma de l’outil encore chargé dans ce chat reste celui de l’ancienne release ; rechargement hôte à qualifier. Une relance de l’audit strict trouve un Select natif sans décision de propriété documentée, et les tons gris intermédiaires du fond restent sous 4,5:1 ; ces points empêchent de considérer le correctif comme prêt à intégrer. ARC-01 et les dépendances restent bloqués.


Ajout local du champ de recherche à droite : sept exemples de composants/animations, démos locales et filtre indépendant du brief. La revue fraîche confirme que l’essai couvre la recherche/démo mais pas l’insertion au canevas ni le vrai hôte. 28 E2E, 66 M0, 28 providers, typecheck, build et smoke réussis ; `npm test` 20/1 ignoré, `npm run check` et `git diff --check` réussis. Contrats Python indisponibles faute de `jsonschema`. L’audit UI strict trouve encore `ownership.native-select-undecided` dans `model-provider-panel.tsx:21` ; le bouton « Rejouer l’animation » est sans effet quand le mouvement est réduit. Voir la [revue](meetings/2026-11-03-ARC-01-component-examples-review.md) et la [preuve](evidence/ARC-01/component-examples-2026-11-03.md). PR #27 : run 60 vert sur le HEAD commité `97e9b97`, qui ne contient pas ce code local. Le vérificateur supplémentaire n’a pas produit de verdict exploitable sur deux essais antérieurs. Qualification hôte, registre révision 14 et gate ARC-01 inchangés.
