# Passation du projet

Date : 1er novembre 2026. État : **premier incrément ARC-01 livré localement, qualification du vrai hôte à poursuivre**. Branche de travail : `work/arc-01-qualification`. Le nom Design Workbench est provisoire.

## Préparé

- Cadrage, architecture, contrats et recette intégrés et versionnables.
- Six rôles Codex persistants, dont un orchestrateur principal ; trois spécialistes maximum en parallèle.
- 26 tickets structurés, tableau lisible et commandes de suivi avec dépendances, révisions, propriété et revue.
- Brief de conception et grille M0 préparés par l'agent conception.
- Tests de l'outillage et contrôle des contrats automatisés ; [première CI réussie](evidence/CI-BOOTSTRAP.md) avec 21 tests Node et 8 tests Python.
- Dépôt [GitHub privé](https://github.com/HotMb/design-workbench) créé avec [26 issues liées](delivery/GITHUB.md).
- Prototype React/Puck à un Hero, transports navigateur/MCP, serveur local et commandes manuelles du sous-ensemble M0.
- **31 tests M0 réussis** et **8 E2E Chrome réussis** ; build et typecheck exécutés. [Bilan de vérification](evidence/ARC-01/review.md).
- [Première revue d'équipe](meetings/2026-11-01-ARC-01-review.md) tenue dans le chat, avec contributions réelles et [trois dettes attribuées](TECH-DEBT.md).

Les résultats réellement exécutés et le statut distant sont consignés dans [la preuve de bootstrap](evidence/BOOTSTRAP.md). La CI n'est considérée passée qu'après observation de son résultat sur GitHub.

## État produit

Le registre est en révision 3 : ARC-01 est passé par review puis blocked, avec preuve du lot local. Aucun des 26 tickets n'est déclaré terminé. Le blocage concerne l'essai dans le vrai hôte et l'identité réelle, pas le démarrage du navigateur local. ARC-02/03 restent dépendants de ces preuves.

Il existe un éditeur et un serveur MCP de qualification. Il n'existe pas encore de persistance de production, d'OAuth réel, de suggestion IA ni d'export de code. Le stockage serveur est en mémoire ; le diagnostic navigateur a sa portée et ses limites propres. Ces écarts sont nommés, sans les maquiller en fonctions livrées.

## Prochain travail

Le choix de l'hôte à connecter a été demandé au commanditaire : application ChatGPT sur ce PC, ChatGPT web ou Codex local d'abord. Préparer le transport correspondant et les accès réels, puis rouvrir **ARC-01** par le CLI avec un motif et la révision courante. Remplir [la grille M0](design/M0-REVIEW.md) avec le vrai essai, dont toute capacité non exécutée. Une connexion Codex diagnostique ne remplace pas silencieusement le critère ChatGPT : consigner la cible effectivement observée et l'éventuel arbitrage produit.

ARC-02 verrouille ensuite versions et identité à partir des résultats réels. ARC-03 termine les contrats partagés et les mocks avant le développement M1 en parallèle. Les clés et l'infrastructure réelles sont configurées hors Git ; aucun appel fournisseur payant n'est lancé par le bootstrap.

## Reprendre

Ouvrir ce dossier dans Codex ou lancer `npm run team:start`. Demander à l'orchestrateur de lire cette passation, `git status` et `npm run team:next`, puis de prendre le prochain ticket éligible. Les agents ne continuent pas seuls après la fermeture de la session.

Pour voir le lot local, lancer `npm run dev` et ouvrir localhost:5173. Les détails d'installation et de transport sont dans [START.md](START.md). Le code de qualification reste sur sa branche et la pull request en brouillon ; aucun déploiement public ni modification des paramètres globaux n'a été effectué.
