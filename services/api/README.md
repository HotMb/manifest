# Serveur de qualification M0

Ce serveur teste le parcours d'un seul projet, d'une page et d'un Hero. Il utilise le SDK MCP officiel et les helpers MCP Apps. Il ne constitue ni un backend de production ni une preuve d'ouverture dans le vrai ChatGPT.

## Transport local

Installer les dépendances depuis la racine du dépôt et construire la vue avec la commande de build de l'éditeur avant de lire la ressource UI. Lancer le transport stdio depuis la racine :

```sh
node --import tsx services/api/src/main.ts --stdio
```

Le client MCP doit appeler Node directement avec cette commande : `npm run` ajoute des en-têtes sur stdout et n'est donc pas adapté au transport protocolaire sans option silencieuse. Le processus Node réserve stdout au protocole MCP ; les messages de démarrage utilisent stderr. L'accès à ce processus dépend des permissions du client qui le lance. Sans configuration optionnelle, aucune clé de fournisseur IA n'est demandée ou employée.

Pour activer le fournisseur compatible dans un environnement local de confiance, fournir hors Git les variables `MANIFEST_PROVIDER`, `MANIFEST_MODEL`, `MANIFEST_API_BASE_URL` et `MANIFEST_API_KEY`. Les quatre sont exigées ensemble ; `MANIFEST_PROVIDER` accepte `openai`, `deepseek` ou `custom`. La clé reste côté processus hôte et ne rejoint ni le Snapshot, ni le job, ni les métadonnées MCP. Les fournisseurs Anthropic/Google natifs nécessiteront leurs adaptateurs dédiés. Ne pas exposer le transport HTTP loopback sur Internet.

Le transport HTTP se lance avec `npm run start --workspace @design-workbench/api`, après configuration **hors Git** de `M0_ACCESS_TOKEN` (au moins 32 caractères sans espace). `PORT` est facultatif, par défaut 8787. Le serveur écoute uniquement `127.0.0.1` et n'affiche pas le jeton. Ne pas recopier un jeton réel dans une issue, un prompt ou une capture.

`GET /health` fournit seulement l'état du prototype. `/mcp` requiert le jeton Bearer, un Host local et une Origin absente ou du même serveur. Le corps JSON est limité à 64 Kio. Ce contrat local n'implémente pas OAuth et ne doit pas être exposé par un tunnel public tel quel. Le test dans le vrai hôte et la stratégie d'identité restent à qualifier.

## Outils et ressource

| Outil | Entrée | Effet |
|---|---|---|
| `open_designer` | `userRequest?`, `assistantProposal?` (1–6 000 caractères), `backgroundColor?` (`#RRGGBB`) ; objet vide compatible | ouvre `ui://design/editor.html`, lit le projet M0 et transmet `_meta.launchContext` sans modifier le brouillon ni appeler un modèle |
| `read_project` | `projectId` | lit le brouillon sans rouvrir l'interface |
| `commit_commands` | commande `apply_ops` canonique | enregistre atomiquement les modifications manuelles admises |
| `get_provider_registry` | objet vide | retourne uniquement les fournisseurs et modèles publics configurés, sans secret |

Quand la configuration fournisseur est complète, des outils MCP réservés à la vue sont aussi disponibles : `start_suggestion`, `get_job`, `get_job_updates`, `cancel_job`, `read_proposal`, `mark_proposal_stale`, `keep_proposal` et `reject_proposal`. Ils suivent le contrat suggestion/job déjà décrit dans `docs/spec/contracts/domain.schema.json`. Le prototype garde jobs, événements et propositions en mémoire ; le client prévisualise le candidat puis appelle explicitement garder ou ignorer. Un changement d’intention ou de version peut marquer un candidat comme ancien, sans le rejeter à la place de l’utilisateur. `keep_proposal` applique atomiquement les opérations à la version source et renvoie le brouillon vérifié. Les credentials restent dans le processus hôte et ne sont jamais inclus dans le job, les métadonnées MCP ou le rapport de conception.

La ressource utilise `text/html;profile=mcp-app` et lit `apps/editor-web/dist/index.html`. Seul l'outil d'ouverture porte `resourceUri`. Les outils de données déclarent une visibilité `app` ; le respect de cette visibilité dépend de l'hôte et ne remplace aucune autorisation.

`structuredContent` contient uniquement le résumé : identifiant, version, hash, stockage `memory-m0`, révision approuvée nulle et éventuel reçu. Le document complet est dans `_meta.project`, réservé à la vue. Les erreurs métier ont `isError: true` et `_meta.error` avec code, message, requestId et retryable. Une erreur de schéma du SDK peut ne fournir que le contenu textuel d'erreur.

## Limites volontaires du prototype

- Un principal de développement, un projet `project-m0`, une page `/`, un bloc `Hero` ; aucune identité multi-utilisateur.
- Opérations admises : `update_props` sur titre, corps, token de fond et animation ; `update_theme` sur les trois couleurs. Les autres mutations sont refusées explicitement.
- Seuls `none` et `fade` sont disponibles ; les couleurs acceptent `#RRGGBB`. Aucun HTML, callback ou asset externe n'est exécuté.
- Le Snapshot reste celui du contrat de domaine. Les références de catalogue et de politique de l'exemple sont **fictives** et ne deviennent pas une release M1 par leur utilisation dans cet essai.
- Les verrous empêchent les modifications des propriétés concernées, y compris manuelles dans ce M0 conservateur. Le déverrouillage ne fait pas partie de l'essai.
- Stockage et reçus en mémoire, perdus au redémarrage. Le store garde jusqu'à 1 000 reçus puis refuse les nouvelles commandes ; il n'évince pas silencieusement des reçus nécessaires au replay.
- Les jobs de suggestion facultatifs s'exécutent en mémoire et nécessitent un adaptateur compatible configuré. Sans variables fournisseur, seul `get_provider_registry` répond avec un registre vide ; les outils d'inférence ne sont pas enregistrés. Les fournisseurs Anthropic/Google natifs, jobs durables, approbation, export et persistance PostgreSQL restent absents.

La transaction M0 ne contient aucun `await` ni accès disque : comparaison de version, calcul SHA-256, validation et assignation se terminent dans le même tour JavaScript du processus unique. Une base et plusieurs workers exigeront la vraie transaction décrite dans les contrats, pas la réutilisation de cette hypothèse d'exécution.

## Vérifier

Depuis la racine :

```sh
node node_modules/typescript/bin/tsc --noEmit -p services/api/tsconfig.json
node --import tsx --test tests/m0-backend.test.ts
```

Les tests emploient le vrai client SDK MCP, les transports en mémoire et HTTP local, sans appel à un modèle. Le test de ressource utilise un HTML de test temporaire ; seul un essai de l'éditeur construit dans le vrai hôte prouvera son rendu. Les restrictions réseau du poste peuvent nécessiter l'autorisation habituelle d'accès au serveur local ; ne pas remplacer un test refusé par une prétendue réussite.
