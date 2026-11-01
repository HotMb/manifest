# Passation du projet

Date : 1er novembre 2026. État : **bootstrap de l'équipe et du dépôt**. Le nom Design Workbench est provisoire.

## Préparé

- Cadrage, architecture, contrats et recette intégrés et versionnables.
- Six rôles Codex persistants, dont un orchestrateur principal ; trois spécialistes maximum en parallèle.
- 26 tickets structurés, tableau lisible et commandes de suivi avec dépendances, révisions, propriété et revue.
- Brief de conception et grille M0 préparés par l'agent conception.
- Tests de l'outillage et contrôle des contrats automatisés ; [première CI réussie](evidence/CI-BOOTSTRAP.md) avec 21 tests Node et 8 tests Python.
- Dépôt [GitHub privé](https://github.com/HotMb/design-workbench) créé avec [26 issues liées](delivery/GITHUB.md).

Les résultats réellement exécutés et le statut distant sont consignés dans [la preuve de bootstrap](evidence/BOOTSTRAP.md). La CI n'est considérée passée qu'après observation de son résultat sur GitHub.

## État produit

ARC-01 est prêt ; les autres tickets attendent leurs dépendances. Aucun des 26 tickets n'est déclaré terminé. La préparation du dépôt avance une partie de l'outillage ARC-03 ; elle n'en termine ni les mocks locaux ni les qualifications préalables. Il n'y a encore ni éditeur fonctionnel, ni backend produit, ni déploiement.

## Prochain travail

L'orchestrateur prend **ARC-01** avec frontend, puis backend selon le besoin : préparer un éditeur minimal d'un bloc, le bridge officiel et l'essai authentifié dans le vrai ChatGPT. Utiliser [la grille M0](design/M0-REVIEW.md) pour consigner les observations, dont ce qui n'a pas pu être testé.

ARC-02 verrouille ensuite versions et identité à partir des résultats réels. ARC-03 termine les contrats partagés et les mocks avant le développement M1 en parallèle. Les clés et l'infrastructure réelles sont configurées hors Git ; aucun appel fournisseur payant n'est lancé par le bootstrap.

## Reprendre

Ouvrir ce dossier dans Codex ou lancer `npm run team:start`. Demander à l'orchestrateur de lire cette passation, `git status` et `npm run team:next`, puis de prendre le prochain ticket éligible. Les agents ne continuent pas seuls après la fermeture de la session.
