# Passation du projet

Date : 2 novembre 2026. État : **boucle de suggestion MCP intégrée au prototype local ; hôte ChatGPT et fournisseur réel restent à qualifier**. Branche de travail : `work/arc-01-qualification`. Le nom Design Workbench est provisoire.

## Préparé

- Cadrage, architecture, contrats et recette intégrés et versionnables.
- Six rôles Codex persistants, dont un orchestrateur principal ; trois spécialistes maximum en parallèle.
- 26 tickets structurés, tableau lisible et commandes de suivi avec dépendances, révisions, propriété et revue.
- Brief de conception et grille M0 préparés par l'agent conception.
- Tests de l'outillage et contrôle des contrats automatisés ; [première CI réussie](evidence/CI-BOOTSTRAP.md) avec 21 tests Node et 8 tests Python.
- Dépôt [GitHub public](https://github.com/HotMb/design-workbench) avec [26 issues liées](delivery/GITHUB.md).
- Prototype React/Puck à un Hero, transports navigateur/MCP, sauvegarde automatique du brouillon et commandes manuelles du sous-ensemble M0.
- Registre fournisseur lu depuis MCP ; choix explicite du modèle, debounce 1,5 s, jobs, suivi d'événements, annulation, aperçu candidat en lecture seule et actions serveur idempotentes conserver/ignorer.
- Adaptateur OpenAI-compatible déjà présent, activable par configuration hôte hors Git. Le flux distant n'a pas encore été exécuté avec une clé réelle ; le runtime supporte pour l'instant les fournisseurs `openai`, `deepseek` et `custom` via ce protocole.
- **52 tests M0**, **24 tests fournisseurs** et **8 E2E navigateur** réussis ; `npm test` : 20 réussis et 1 ignoré pour une restriction de création de liens Windows. Build et typecheck réussis. Le dernier loop-verify reste FAIL après corrections locales post-revue ; [compte rendu de revue du 2 novembre](meetings/2026-11-02-MANIFEST-live-suggestions.md).
- [Première revue d'équipe](meetings/2026-11-01-ARC-01-review.md) tenue dans le chat, avec contributions réelles et [trois dettes attribuées](TECH-DEBT.md).

Les résultats réellement exécutés et le statut distant sont consignés dans [la preuve de bootstrap](evidence/BOOTSTRAP.md). La CI n'est considérée passée qu'après observation de son résultat sur GitHub.

## État produit

Le registre est en révision 3 : ARC-01 est passé par review puis blocked, avec preuve du lot local. Aucun des 26 tickets n'est déclaré terminé. Le blocage concerne l'essai dans le vrai hôte et l'identité réelle, pas le démarrage du navigateur local. ARC-02/03 restent dépendants de ces preuves.

Il existe un éditeur et un serveur MCP de qualification. Le serveur peut exécuter une suggestion si un fournisseur compatible est configuré hors Git ; le chemin par défaut reste sans clé et les tests utilisent des simulateurs. Il n'existe pas de persistance de production, d'OAuth réel, d'alternatives de modèle, d'adaptateurs Anthropic/Google natifs ni d'export de code. Le stockage serveur est en mémoire ; le diagnostic navigateur a sa portée et ses limites propres. Le comportement dans le vrai ChatGPT et l'appel facturable restent des preuves manquantes.

## Prochain travail

L'hôte souhaité est l'application ChatGPT sur ce PC. Préparer son accès et une configuration fournisseur de test à coût contrôlé, puis rouvrir **ARC-01** par le CLI avec un motif et la révision courante. Remplir [la grille M0](design/M0-REVIEW.md) avec le vrai essai, dont toute capacité non exécutée. Une connexion Codex diagnostique ne remplace pas silencieusement le critère ChatGPT : consigner la cible effectivement observée et l'éventuel arbitrage produit.

La boucle locale est maintenant reliée ; le prochain travail est la qualification réelle dans ChatGPT et le premier essai fournisseur contrôlé. ARC-02 verrouille ensuite versions et identité à partir des résultats réels. ARC-03 termine les contrats partagés et les mocks avant le développement M1 en parallèle. Les clés et l'infrastructure réelles sont configurées hors Git ; aucun appel fournisseur payant n'a été lancé pendant cette tranche.

## Reprendre

Ouvrir ce dossier dans Codex ou lancer `npm run team:start`. Demander à l'orchestrateur de lire cette passation, `git status` et `npm run team:next`, puis de prendre le prochain ticket éligible. Les agents ne continuent pas seuls après la fermeture de la session.

Pour voir le lot local, lancer `npm run dev` et ouvrir localhost:5173. Les détails d'installation et de transport sont dans [START.md](START.md). Le lot a été poussé sur `origin/work/arc-01-qualification` au commit `1dd0df6` ; aucun déploiement public ni modification des paramètres globaux n'a été effectué.
