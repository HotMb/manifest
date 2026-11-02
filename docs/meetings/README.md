# Réunions de fin de tâche

La demande du 1er novembre 2026 prévoit une réunion après chaque tâche pour vérifier le travail, les dettes et la suite. Le format initial est une **revue d'équipe asynchrone dans le chat, avec compte rendu versionné**. Il n'installe aucun événement calendrier, visioconférence ou envoi de message externe.

## Quand tenir la revue

L'orchestrateur ouvre la revue quand un lot possède un résultat démontrable, avant d'annoncer la tâche terminée. Une tentative bloquée ou un travail à reprendre fait aussi l'objet d'un compte rendu ; on n'attend pas un faux succès pour examiner les risques. Les petites étapes internes d'un même ticket peuvent être regroupées dans sa revue, tandis que chaque tâche livrée conserve son propre verdict.

Nom conseillé : `YYYY-MM-DD-<TICKET>-review.md`. Pour plusieurs revues le même jour, ajouter un suffixe ordonné. Partir de [TEMPLATE.md](TEMPLATE.md), puis remplacer tous les champs de travail. Le modèle n'est pas une réunion tenue.

Dernières revues : [ARC-01 plugin privé local ChatGPT Desktop — 2 novembre 2026](2026-11-02-ARC-01-desktop-plugin.md) · [renommage et reprise des agents — 2 novembre 2026](2026-11-02-MANIFEST-rename-review.md) · [suggestions réactives dans l’éditeur — 2 novembre 2026](2026-11-02-MANIFEST-live-suggestions.md).

## Participants et contributions réelles

| Rôle | Contribution attendue |
|---|---|
| Propriétaire de la tâche | ce qui a changé, démonstration, tests et limites |
| Reviewer / QA distinct | reproduction, défauts et critères non prouvés |
| Designer, si interface concernée | hiérarchie, comportements, accessibilité et écarts observés |
| Backend ou plateforme, selon impact | données, permissions, exploitation et conséquences d'architecture |
| Orchestrateur | synthèse, décision, attribution et prochaine tâche |

Nommer les agents ayant **effectivement contribué** et identifier leur commentaire, message ou preuve. Un agent absent reste absent ; le compte rendu ne lui invente ni intervention ni accord. Une même instance ne se présente pas comme un reviewer indépendant de son propre travail. La QA peut déclarer « non exécuté » pour un environnement indisponible.

Le commanditaire reçoit la synthèse dans le chat. Son absence de réponse n'est pas une approbation. Les décisions déjà autorisées et réversibles peuvent continuer sans réunion d'approbation supplémentaire ; les arbitrages qui nécessitent sa décision sont formulés clairement avec leur effet sur la suite.

## Ordre de la réunion

1. **Résultat** : scénario concret avant/après et version examinée. Démonstration réelle ou preuve reproductible ; une intention de développement n'est pas une démo.
2. **Vérification** : tests exécutés et résultats, contrôles non exécutés, erreurs connues. Séparer test de schéma, test mock, navigateur et vrai hôte.
3. **Qualité et architecture** : écarts aux contrats, accessibilité, conflits, risques opérationnels et impact sur les modules suivants.
4. **Dettes et limites** : relier les dettes réelles au [registre](../TECH-DEBT.md), avec propriétaire, coût/impact décrit et condition de levée. Une fonctionnalité future ou une qualification encore attendue reste un élément du backlog, pas une dette inventée.
5. **Décisions et actions** : responsable unique, livrable observable, ticket et échéance par jalon. Aucun point « à voir plus tard » sans propriétaire.
6. **Verdict** : terminé, à reprendre ou bloqué, avec justification par critères. L'état des tickets est mis à jour par le CLI de suivi et le tableau régénéré dans le même changement.

## Ce que l'utilisateur doit voir

Après chaque revue, l'orchestrateur donne dans le chat : ce qui est livré, les preuves principales, les dettes ou risques retenus, le verdict et la prochaine action. Le lien du compte rendu permet de suivre le détail sans relire les échanges internes des agents. Aucun PASS de modèle ne remplace une preuve d'exécution.

Une tâche ne passe pas `done` au seul motif qu'une réunion s'est tenue. Les règles de [CONTRIBUTING.md](../../CONTRIBUTING.md), les dépendances et les critères du ticket continuent de s'appliquer. Les fonctionnalités suivantes ne démarrent que si elles sont éligibles.
