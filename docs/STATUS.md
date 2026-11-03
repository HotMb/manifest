# Manifest — suivi du projet

Mise à jour : **3 novembre 2026**. Référence : dépôt [HotMb/manifest](https://github.com/HotMb/manifest), branche locale `work/arc-01`, registre **révision 14**. Les Issues GitHub sont des miroirs ; `docs/delivery/tickets.json` fait foi.

## État actuel

- **ARC-01 : bloqué** après livraison et revue du sous-ensemble local. Il reste à prouver le parcours dans ChatGPT Desktop, le bridge et l’identité OAuth, l’actualisation, les capacités d’hôte et une modification réelle. Voir [le compte rendu du 3 novembre](meetings/2026-11-03-ARC-01-review.md) et la [preuve d’implémentation locale](evidence/ARC-01/implementation-2026-11-03.md).
- `npm run team:next` doit afficher **0 nouveau ticket éligible**. ARC-02 dépend de la fin d’ARC-01. Ne pas contourner ce prérequis.
- Le cadrage de la direction Figma a été précisé le 3 novembre : une seule surface de travail, brief/proposition à gauche, candidat modifiable au centre et recherche catalogue à droite ; pas de navigation par étapes ni de page séparée de réglage de bloc. Cette direction cible n’est pas encore réalisée dans le prototype local, qui conserve son parcours M0 actuel. Le canevas d’un nouveau brouillon y est réellement vide et l’ancien brouillon Hero reste intact.

## Cadrage enregistré en révision 14

- Le lancement attendu distingue nouveau projet, nouvelle page dans un projet existant et modification d’une page existante ; il transmet la cible/version et la proposition déjà formulée par ChatGPT. Les Snapshots existants sont relus, un candidat est contrôlé contre sa version de base et reste éditable avant conservation. Un texte seul préremplit le champ mais ne lance pas de modèle avant activation automatique ou action manuelle. Manifest ne lit jamais le texte non envoyé du compositeur natif.
- Le champ principal sert au brief et à ses modifications réactives ; le catalogue à droite reste une recherche distincte, locale et sans appel de modèle. Survol, clavier et toucher permettent de voir les démonstrations sans modifier la page ; l’ajout reste une action explicite.
- L’intention de données est conservée dans `Snapshot.dataIntegrationSpecs` et suit la version du brouillon et la révision approuvée. `/validate` doit transmettre au modèle hôte cette spécification non secrète (source/référence, schéma, liaisons aux graphiques, transformations, rafraîchissement, aperçu synthétique/connecté et prérequis d’autorisation). Cela explique à ChatGPT l’intégration souhaitée ; le rapport ne confère pas lui-même l’accès et n’emporte aucun secret ou ligne sensible.
- Ces décisions sont inscrites dans le cadrage et les critères de UX-01, UI-01, UI-02, UI-03, DOM-01, DOM-02, AI-02, REV-01 et TEST-01. Elles sont à construire après levée des dépendances ; elles ne constituent pas une preuve d’implémentation. Les schémas JSON exécutables et les capacités réelles de l’hôte restent à aligner/qualifier par les tickets concernés.

## Ce qui est livré dans la tranche locale

- Champ principal décrivant la page et ses mouvements ; proposition manuelle ou analyse après activation, avec une pause de 1,5 s. Les propositions locales et le simulateur sont prévisualisés avant conservation.
- Ajout manuel d’une section M0, annuler/rétablir, sauvegarde navigateur et affichage mobile.
- Ajustements de hiérarchie, ouverture directe à 375 px dans l’étape Décrire, disparition du message vide sous un candidat et contraste des champs Puck vérifié à ≥ 4,5:1.
- Le paquet du plugin privé ChatGPT Desktop a été reconstruit et actualisé en version **0.1.1** ; le smoke local passe. Cela ne prouve pas son rendu dans l’hôte. Voir la [revue du rafraîchissement](meetings/2026-11-03-ARC-01-plugin-refresh-review.md) et la [preuve du paquet](evidence/ARC-01/plugin-refresh-2026-11-03.md).
- Les détails de compatibilité, résultats et limites figurent dans la [preuve datée](evidence/ARC-01/implementation-2026-11-03.md) et la [comparaison explicite à la maquette](evidence/ARC-01/figma-alignment-2026-11-03.md). Les références Figma antérieures restent dans [la revue de direction](meetings/2026-11-02-MANIFEST-design-direction.md).

## Ce qui n’est pas encore livré

- La surface cible unique, le catalogue à droite pour rechercher « menu » dans un vrai catalogue versionné, ses cartes de démonstration/provenance/licence, et l’ajout par glisser-déposer ou action accessible : UX-01/UI-01/UI-02/CAT-01/CAT-02.
- Le LaunchContext à trois opérations (nouveau projet, nouvelle page, modification de page) avec proposition de l’assistant et candidat/version, puis le comportement associé : UI-03/AI-02.
- La pièce jointe de référence sous le champ principal, la spécification d’intégration des données dans le rapport, `/validate` avec accusé et transmission au chat : UI-02/AI-02/REV-01.
- La création/modification générale de projets, plusieurs pages, un export d’application complète et un modèle réel. Le prototype actuel est borné à un projet/page et zéro ou un Hero ; aucun fournisseur n’a été appelé dans cette tranche.
- Le rendu final dans ChatGPT Desktop et la matrice de capacités réelles restent à vérifier. Le badge « WebMCP unavailable » observé précédemment n’est pas remplacé par une preuve de réussite.

Les tâches M1 sont encore `todo` en raison de leurs dépendances. L’absence de recherche catalogue n’est pas maquillée par un champ local factice ; ses critères sont dans UI-02/CAT-02 et l’architecture approuvée.

## Vérifications exécutées

| Vérification | Résultat |
|---|---|
| E2E navigateur | **17/17 réussis**, dont canevas vide, ajout manuel, prévisualisation, viewport 375 px et contraste |
| M0 backend/MCP/adaptateurs/jobs | **64/64 réussis** avec l’autorisation de serveur HTTP local |
| Fournisseurs et simulateur | **28/28 réussis**, aucun appel à une API de modèle |
| Tests UI du propriétaire frontend | **14 réussis** |
| `npm test` | **20 réussis, 1 ignoré** faute de droit de création de lien symbolique sous Windows |
| Typecheck, build, audit strict, `npm run check`, `git diff --check` | réussis ; avertissements de dépendances Vite/Puck documentés dans le compte rendu |
| Contrats Python | non exécutés : `jsonschema` est absent de cet environnement |

Une revue indépendante du code M0 et une revue design sur la capture finale ont été réalisées. Le compte rendu distingue les captures et simulateurs locaux de l’environnement hôte réel.

La relecture loop-verify a utilisé ses deux passes : la seconde a validé 4/5 critères, mais le paquet omettait le fichier de dettes contenant DEBT-004. Aucun PASS global n’est revendiqué ; la limite de tentatives est atteinte.

## Dettes et risques suivis

- DEBT-001 à DEBT-004 restent ouvertes dans [TECH-DEBT.md](TECH-DEBT.md), chacune liée à son propriétaire et jalon.
- Puck émet pendant les parcours un avertissement `setData` coûteux ; il n’a pas causé d’échec mais nécessite une mesure avant d’optimiser. Ce n’est pas encore une dette validée ni une mesure de performance.
- Le premier déploiement du test M0 sans autorisation locale a échoué `EACCES`; son rerun autorisé a réussi 64/64. Le problème concernait l’accès réseau loopback du banc de test, pas une requête fournisseur.

## Prochaine action

Dans ChatGPT Desktop, ouvrir Manifest avec le build poussé, vérifier l’ouverture depuis le chat, le chargement du projet et la lecture authentifiée, puis tenter une modification et relever les capacités visibles. Fournir une capture du résultat ou de l’erreur ; ne pas inclure de jeton ou secret. L’ARC-01 pourra être réouvert par l’orchestrateur à partir de cette preuve. Après obtention, terminer la matrice hôte/identité avant de démarrer ARC-02.

## Reprendre

Relire `AGENTS.md`, ce fichier et [ORCHESTRATION.md](delivery/ORCHESTRATION.md), puis lancer `npm run team:status` et `npm run team:next`. Voir [le tableau généré](delivery/BOARD.md), [la correspondance GitHub](delivery/GITHUB.md), [le compte rendu de fin de tâche](meetings/2026-11-03-ARC-01-review.md) et [les dettes](TECH-DEBT.md).
