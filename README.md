# Manifest

Manifest est un atelier de conception web assisté par IA. Ce dépôt contient son cadrage, l'équipe d'agents réutilisable et le prototype React/Puck avec serveur MCP. **Le prototype local ne qualifie pas encore l'expérience dans le vrai ChatGPT.**

[Dépôt GitHub public](https://github.com/HotMb/manifest) · [Tickets](https://github.com/HotMb/manifest/issues)

L'expérience cible : ouvrir un éditeur dans ChatGPT, écrire dans son champ propre, voir une proposition après une pause, ajuster le design, approuver une version puis exporter un projet React fidèle. L'API du modèle choisi est appelée depuis le backend. Claude, d'autres fournisseurs et la 3D viennent par étapes.

## Commencer

- [Installation et première session](docs/START.md)
- [Équipe et responsabilités](docs/TEAM.md)
- [Statut et prochaine action](docs/STATUS.md)
- [Tableau des 26 tickets](docs/delivery/BOARD.md)
- [Correspondance avec les Issues GitHub](docs/delivery/GITHUB.md)
- [Règles d'orchestration](docs/delivery/ORCHESTRATION.md)
- [Cadrage produit](docs/spec/PRODUCT.md), [architecture](docs/spec/ARCHITECTURE.md), [contrats](docs/spec/CONTRACTS.md)
- [Conception](docs/design/CONCEPTION.md) et [recette M0 à remplir](docs/design/M0-REVIEW.md)
- [Réunions après chaque tâche](docs/meetings/README.md) et [dettes techniques](docs/TECH-DEBT.md)

```sh
npm ci
npm run team:status
npm run team:next
npm run team:brief
```

`npm run team:start` ouvre ensuite une session Codex interactive d'orchestration. Aucun modèle n'est appelé par les commandes de statut, de test ou de brief. Les agents ne travaillent pas en permanence après fermeture de la session.

Les règles sont dans [AGENTS.md](AGENTS.md) et les six rôles dans `.codex/agents/`. La session principale tient généralement le rôle orchestrateur ; jusqu'à trois spécialistes peuvent travailler en parallèle. Les modèles sont hérités de la session, sans fournisseur supplémentaire imposé.

## Suivre les changements

Le Git local et le dépôt GitHub public conservent les commits. Les Issues reprennent les tickets ; `docs/delivery/tickets.json` reste la source des statuts. Les passages en revue et clôture demandent des preuves, une révision attendue du backlog et un reviewer distinct. Voir [CONTRIBUTING.md](CONTRIBUTING.md).

Le premier ticket est **ARC-01** : un bloc modifiable dans le vrai ChatGPT, un échange autorisé et une matrice des capacités observées. La présence de ce dépôt, d'agents ou d'une CI ne remplace pas cette preuve.

Le [guide de démarrage](docs/START.md#démonstration-locale-m0) explique comment ouvrir le prototype avec `npm run dev` et lancer ses contrôles. Les réunions de revue recueillent les contributions réelles des agents ; leurs comptes rendus et actions restent dans Git.
