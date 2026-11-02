# ARC-01 — plugin privé local ChatGPT Desktop — 2 novembre 2026

## Observation de la capture

La capture fournie par le commanditaire montre la page `webroom.openai.chatgpt.site` avec le badge **« WebMCP unavailable »**. Elle établit que les outils WebMCP n'étaient pas disponibles dans cette session/cette page au moment de la capture. Elle ne permet pas d'établir la cause, ni une indisponibilité générale, ni que le navigateur affiché est le navigateur intégré de ChatGPT Desktop.

## Route de qualification retenue

Les documents OpenAI décrivent séparément les plugins locaux qui lancent un serveur MCP stdio dans l'application Desktop et la soumission publique desktop-only, qui exige une approbation de partenaire. Le test de cette tâche utilise le chemin privé et local; aucune publication publique n'a été faite.

Le package `integrations/chatgpt-desktop` fournit `plugin.json`, `mcp.json` et un script reproductible qui intègre le serveur M0 avec esbuild et copie la vue HTML autonome. Le manifeste MCP invoque `node ${PLUGIN_ROOT}/server/services/api/dist/main.mjs --stdio`. Le package ne contient ni `node_modules`, ni credential de fournisseur. Il demande Node.js 24 ou plus sur l'ordinateur exécutant le plugin.

Le ZIP a été enregistré via Plugin Creator comme plugin personnel privé, version `0.1.0`. La page privée est référencée dans le chat de travail; son identifiant et son URL ne sont pas recopiés dans ce dépôt public. La relecture de la liste des fichiers enregistrés confirme les deux manifestes et les deux artefacts serveur/UI. Le créateur a également généré des manifestes de compatibilité `.codex-plugin/plugin.json` et `.mcp.json`.

## Vérifications réalisées

| Vérification | Résultat observé | Portée |
|---|---|---|
| `npm run package:desktop-plugin` | Réussi; build Vite de la vue et bundle esbuild Node 24 préparés. Vite a émis des avertissements non bloquants sur des directives `use client` de dépendances. | Construction locale du package, pas l'hôte. |
| `npm run smoke:desktop-plugin` | Réussi; processus stdio empaqueté lancé par le SDK MCP, quatre outils listés, `open_designer` retourne `project-m0` version 0, ressource `ui://design/editor.html` reçue en `text/html;profile=mcp-app` (2 198 111 octets). | Processus et ressource locale, pas rendu ChatGPT Desktop. |
| Enregistrement privé Plugin Creator + lecture de fichiers | Réussi; statut `PRIVATE`, portée utilisateur, version `0.1.0`; fichiers de package présents. | Enregistrement dans le compte uniquement, pas démarrage local du MCP par Desktop. |
| Outil `open_designer` rendu disponible dans le contexte Codex courant | Réussi; projet M0 version 0 retourné. | Connexion d'outil dans ce contexte Codex; ne prouve pas la vue MCP Apps ni ChatGPT Desktop. |
| Capture Webroom | « WebMCP unavailable » visible. | Constat borné à la session/page capturée. |
| Appel d'un modèle fournisseur | Non exécuté. | Aucun appel inférence ou coût fournisseur pour ces vérifications. |

## Ce qui reste à prouver dans ChatGPT Desktop

Le commanditaire doit utiliser l'application **ChatGPT Desktop** (pas seulement Webroom dans un navigateur), démarrer une nouvelle conversation exécutée localement, taper `@`, sélectionner `Manifest`, puis envoyer « Ouvre l'éditeur Manifest ». La mention seule ne lance pas l'éditeur; la demande doit entraîner l'appel `open_designer`. La preuve attendue est l'ouverture effective de la vue interactive, pas seulement le texte du résultat d'outil. S'il n'y a pas de vue ou si l'outil n'apparaît pas, une capture du résultat permettra de distinguer chargement du plugin, exécution locale, activation de l'extension UI et état du compte.

Le plugin n'implémente pas une commande native `/manifest`. L'appel par `@Manifest` est une entrée de plugin à tester. Le champ réactif est à l'intérieur de l'éditeur; cette intégration ne capture pas le brouillon non envoyé du compositeur ChatGPT et ne garantit pas une réponse du modèle à chaque pause. La prévisualisation s'ouvre sans fournisseur configuré; la génération de suggestions reste non prouvée et aucune clé de fournisseur n'est incluse.

**Verdict : ARC-01 reste `blocked`.** Le package et l'enregistrement privé sont prêts, mais le démarrage du MCP, la vue dans le vrai ChatGPT Desktop, l'identité de l'hôte et les scénarios d'édition/sauvegarde ne sont pas encore observés dans la cible.

## Sources officielles consultées

- [Plugins dans ChatGPT — OpenAI Help](https://help.openai.com/en/articles/20001256-plugins-in-chatgpt) — plugins locaux, Desktop, mention `@` et limites web/mobile.
- [Package your plugin — OpenAI Developers](https://developers.openai.com/plugins/build/plugins) — packaging local, marketplaces privées et installation dans Desktop.
- [Submit desktop-only plugins — OpenAI Developers](https://developers.openai.com/plugins/deploy/desktop-only) — restriction d'allowlist liée au parcours de soumission publique desktop-only.
- [MCP Extensions specification — OpenAI](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md) — prise en charge Desktop des vues MCP Apps et composer mentions.
