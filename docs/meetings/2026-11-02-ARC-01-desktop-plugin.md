# Revue de tâche — ARC-01 — plugin privé Desktop — 2 novembre 2026

## Identification

| Champ | Valeur |
|---|---|
| Tâche / ticket / objectif | Essayer une route plugin MCP locale pour qualifier ARC-01 après le badge WebMCP indisponible |
| Date et mode de revue | 2 novembre 2026 — revue asynchrone documentée dans le chat |
| Branche, commit ou diff examiné | `work/arc-01-qualification`, base `5ec1f41`; package `integrations/chatgpt-desktop` et preuves ajoutées |
| Build, environnement et hôte | Windows, Node.js 24.5.0; smoke local SDK MCP; ChatGPT Desktop réel non observé |
| Responsable de la réunion | Orchestrateur Codex |
| Preuves liées | [Package et tentative Desktop](../evidence/ARC-01/desktop-plugin-2026-11-02.md), [revue d'agents](../evidence/ARC-01/review-2026-11-02.md) |

## Participants et contributions

| Agent ou personne réelle | Rôle | Contribution reçue et référence | Présence / limite |
|---|---|---|---|
| Orchestrateur Codex | Implémentation/intégration | Ajout des manifestes/scripts de package; smoke de l'archive; création du plugin personnel privé; appel en lecture seule de `open_designer` dans le contexte Codex | Aucun contrôle de l'UI ChatGPT Desktop |
| Commanditaire | Propriétaire du produit | Capture Webroom montrant « WebMCP unavailable » | Capture limitée à cette session/page; cause non déterminée |
| `arc01_backend` | Revue backend / plateforme | Confirme le chemin de plugin local privé distinct de l'approbation de soumission publique et demande une preuve d'exécution réelle — [avis archivé](../evidence/ARC-01/review-2026-11-02.md) | Lecture seule; aucun compte/configuration modifié par l'agent |
| `arc01_design_review` | Revue UI/UX | Décrit la sélection `@Manifest`, l'envoi explicite de la demande et les limites de `/manifest` et du texte non envoyé — [avis archivé](../evidence/ARC-01/review-2026-11-02.md) | Lecture seule; aucun test visuel Desktop par l'agent |
| `arc01_qa` | QA distincte | A relevé `node` exact et `esbuild` direct; après correction, smoke local relancé avec variables fournisseur vidées — [avis archivé](../evidence/ARC-01/review-2026-11-02.md) | A inspecté le package local, pas l'enregistrement du compte ni le rendu Desktop |

## Démonstration du résultat

- Avant : Webroom affichait « WebMCP unavailable » dans la capture du commanditaire; le dépôt n'avait pas d'adaptateur WebMCP.
- Après : un package local Desktop reproductible contient les manifestes plugin/MCP, un serveur Node autonome et la vue HTML intégrée. Il a été enregistré comme plugin personnel **privé** via Plugin Creator. Aucune soumission publique n'a eu lieu.
- Le SDK a lancé l'exécutable du package avec la commande `node` configurée, listé les quatre outils M0, appelé `open_designer` sur `project-m0` version 0, puis lu `ui://design/editor.html` au MIME `text/html;profile=mcp-app`.
- Le tool `open_designer` apparaît et répond aussi dans le contexte Codex courant; cela n'est pas le ChatGPT Desktop de destination et n'atteste pas le rendu de la vue.
- Le package ouvre l'éditeur sans appel fournisseur. Les suggestions restent non vérifiées, car aucun modèle/fournisseur n'est configuré dans cette recette.

## Tests et critères d'acceptation

| Critère / scénario | Vérification exécutée et version | Résultat observé | Preuve | Reste à faire |
|---|---|---|---|---|
| Build de la vue et package local | `npm run package:desktop-plugin`, Node 24.5.0 | réussi; avertissements Vite non bloquants concernant `use client` | package reproductible ignoré `dist` | Aucun pour ce smoke |
| Serveur package / outils MCP | `npm run smoke:desktop-plugin`, SDK MCP, environnement fournisseur vide | réussi; quatre outils, `open_designer`, projet version 0 | [preuve ARC-01](../evidence/ARC-01/desktop-plugin-2026-11-02.md) | Reproduire dans ChatGPT Desktop |
| Ressource UI | `resources/read` sur `ui://design/editor.html` | réussi; `text/html;profile=mcp-app`, 2 198 111 octets | Même preuve | Prouver l'affichage par Desktop |
| Enregistrement privé et fichiers | Plugin Creator `create_plugin`, puis listing/lecture des fichiers par l'orchestrateur | réussi; plugin `PRIVATE`, package et manifestes de compatibilité présents | Même preuve; lien privé dans le chat uniquement | Vérifier l'activation et l'exécuteur Desktop |
| Appel dans le contexte Codex courant | tool `mcp__manifest_local__open_designer` en lecture seule | réussi; `project-m0`, version 0 | Sortie du tool dans le chat | Ne satisfait pas la cible ChatGPT Desktop |
| Revue indépendante bornée | `loop-verify-review`, 3 parties portant séparément package, preuve/statut, compte rendu | réussi; 3/3 critères sur chaque partie | Verdicts PASS reçus le 2 novembre | Même lignée Codex/OpenAI; ne prouve pas l'hôte |
| `@Manifest` suivi d'une ouverture interactive | Non exécuté dans ChatGPT Desktop | non exécuté | Aucune | Commanditaire : ouvrir une nouvelle conversation locale, choisir `@Manifest`, envoyer « Ouvre l'éditeur Manifest » et vérifier la vue |
| Modification et sauvegarde via l'hôte | Non exécuté | non exécuté | Aucune | Tester après l'ouverture de la vue; M0 conserve l'état en mémoire du processus |
| WebMCP dans Webroom | Capture fournie par le commanditaire | « WebMCP unavailable » visible | Capture du chat; non recopiée au dépôt public | Aucune pour cette capture |
| Prochain ticket éligible | `npm run team:next` | 0 ticket, registre révision 3 | Sortie CLI du 2 novembre | ARC-02 reste dépendant d'ARC-01 |

## Avis des spécialistes

- Le backend confirme que l'allowlist est rattachée à la soumission **publique** desktop-only, et que le plugin local privé est une voie distincte; sa seule création n'est pas une preuve de lancement.
- Le designer indique que `@` sert à sélectionner le plugin : une demande envoyée doit ensuite déclencher `open_designer`. Une commande slash native et la lecture du brouillon non envoyé du compositeur ne sont pas prouvées.
- QA a fait corriger la dépendance directe à esbuild et le smoke afin qu'il utilise la commande `node` de `mcp.json`. La relecture finale confirme le test local seulement.

## Dettes, risques et limites

Aucune dette technique nouvelle n'est retenue. Le stockage mémoire et l'absence de fournisseur restent des limites connues du prototype M0. Les éléments à prouver dans Desktop (lancement, UI, identité, sauvegarde) demeurent des critères ARC-01 bloquants, pas des dettes.

## Décisions et actions

| Décision ou action | Motif | Responsable unique | Ticket / preuve attendue | Échéance par jalon |
|---|---|---|---|---|
| Conserver ARC-01 en `blocked`, révision 3 | Hôte et identité ChatGPT non qualifiés | Orchestrateur | Mise à jour après test réel seulement | Avant ARC-02 |
| Dans l'app ChatGPT Desktop, ouvrir une nouvelle conversation locale, taper `@`, sélectionner Manifest et envoyer « Ouvre l'éditeur Manifest » | La sélection seule n'appelle pas l'outil; le smoke local ne prouve pas l'UI hôte | Commanditaire | Capture de l'appel et de la vue interactive, ou erreur exacte | Avant ARC-02 |
| Si la vue s'ouvre, modifier le Hero puis confirmer la sauvegarde; ne pas tester l'appel LLM sans configuration décidée | M0 garde l'état en mémoire et n'a pas de fournisseur dans ce package | Commanditaire | Version du brouillon avant/après et observation hôte | Avant validation ARC-01 |

## Verdict et prochaine étape

- **Verdict : bloqué.** Le package local et son transport passent; l'exécution/rendu dans ChatGPT Desktop reste à faire.
- Critères satisfaits : configuration cohérente, exécution stdio locale, outil de base et ressource UI lue via SDK.
- Critères manquants : ouverture MCP Apps dans ChatGPT Desktop, identité autorisée/invalide, édition et sauvegarde depuis l'hôte, matrice des capacités.
- État ARC-01 avant / après : `blocked` / `blocked`; révision du registre 3 / 3.
- Prochain ticket éligible : aucun (`npm run team:next`).
- Besoin utilisateur : test manuel dans l'application cible, car le skill de contrôle ordinateur interdit l'automatisation de l'interface ChatGPT.

## Synthèse partagée dans le chat

Le badge WebMCP de Webroom ne bloque pas la piste MCP Apps locale. Le plugin privé Manifest et son package sont prêts; le serveur fonctionne localement et `open_designer` est découvrable dans le contexte Codex. Il reste à constater l'ouverture et le rendu dans ChatGPT Desktop. ARC-01 demeure bloqué et aucun ticket suivant n'est éligible.
