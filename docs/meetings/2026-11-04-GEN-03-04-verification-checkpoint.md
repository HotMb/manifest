# Revue de checkpoint — GEN-03 / GEN-04 — 4 novembre 2026

## Identification

| Champ | Valeur |
|---|---|
| Objectif | Vérifier la chaîne sélection de modèle → job après pause → proposition → aperçu, puis obtenir une preuve d’appel API réel. |
| Branche / version | `work/hotfix-01`, HEAD `f354c2ccdb154790122106e15b6e5907edce0546`, identique à la tête distante `work/arc-01-qualification`. |
| PR | [#27](https://github.com/HotMb/manifest/pull/27), ouverte en brouillon, non fusionnée. GitHub Actions Quality #94 réussit sur ce HEAD. |
| Registre | Révision 55. GEN-02 est le seul ticket actif ; GEN-03 dépend de GEN-02 et GEN-04 dépend de GEN-01/02/03. `npm run team:next` ne trouve aucun ticket éligible. |
| Responsable | `/root`, orchestration et vérification. Aucun fichier applicatif n’a été modifié pendant ce checkpoint. |

## Participants et contributions

| Participant | Rôle | Contribution reçue | Limite |
|---|---|---|---|
| `/root` | Orchestrateur / vérificateur | Exécution des suites, lecture du registre, du runtime, de l’adaptateur, du panneau de modèle et des preuves précédentes. | Aucun appel fournisseur réel ni essai dans ChatGPT Desktop. |
| Reviewer indépendant | QA | Non sollicité pour cette nouvelle révision. | Aucun verdict indépendant ne lui est attribué. |
| Designer | Design / UX | Non sollicité pour cette nouvelle révision. | Aucun avis de design n’est revendiqué. |

## Résultat observé

Le code présent sait présélectionner une cible si un seul fournisseur et un seul modèle sont configurés. Lorsqu’il y a plusieurs modèles, il attend le choix explicite. Une description stable déclenche ensuite le job après 1 500 ms ; les résultats structurés sont validés puis projetés dans le canevas comme candidat. Le brouillon n’est conservé qu’après l’action de confirmation.

Chromium confirme le rendu du dashboard synthétique, du fond nuageux, des graphiques et des mouvements locaux du catalogue. Les tests de sélection et d’E2E utilisent des réponses simulées. Ils ne prouvent pas qu’une API de modèle a reçu une requête ni généré cette page.

Le modèle reçoit le brief, le Snapshot et une liste des capacités du catalogue. Aucune capture du rendu, aucun DOM calculé ni viewport ne sont inclus dans la requête. La revue de rendu réel inspirée de la méthode Unslop n’est donc pas exécutée.

Le service lit ses variables fournisseur depuis l’environnement du processus. Aucune variable de fournisseur n’est présente dans l’environnement courant et aucun fichier `.env` n’est présent à la racine. L’outil local `open_designer` ouvre la vue et transmet le brief ; il n’appelle aucun modèle. La preuve de génération API réelle n’a pas pu être faite. Aucune clé n’a été demandée, affichée ou enregistrée.

Le runtime existant accepte seulement le protocole OpenAI-compatible, avec les fournisseurs `openai`, `deepseek` ou `custom`, et une cible unique par lancement du serveur. Il ne fournit pas encore les adaptateurs natifs Anthropic ou Google, ni une connexion implicite au modèle ChatGPT hôte. La vue locale ouverte directement dans le navigateur n’est pas une preuve du runtime MCP utilisé dans ChatGPT Desktop.

## Vérifications exécutées

| Vérification | Résultat | Portée et limite |
|---|---:|---|
| `npm run test:e2e -- --reporter=list` avec `MANIFEST_TEST_PORT=4199` | 43/43 réussis | Vrai Chromium local ; plusieurs scénarios fournisseur utilisent des transports simulés. |
| `npm run test:providers` | 31/31 réussis | Sélection, adaptateur HTTP, jobs et réponses simulées ; aucune connexion au fournisseur. |
| `npm run test:m0` | 75/75 réussis | La première tentative sandboxée a été refusée sur `127.0.0.1`; la relance locale autorisée a passé. |
| `npm run test:catalog` | 15/15 réussis | Validation, rendu catalogue, mouvements, mouvement réduit et test d’inventaire. |
| `npm run typecheck` | Réussi | Workspaces. |
| `npm run build` | Réussi | HTML autonome de 2 286,90 Ko (793,75 Ko gzip) ; avertissements Rolldown `use client`. |
| `npm run check` | Réussi | Registre valide, révision 55. |
| `git diff --check` | Réussi | Aucun espace ou marqueur de conflit signalé. |
| Vérification API GitHub | PR ouverte/draft ; Quality #94 réussit sur `f354c2c` | La CI prouve le build et les tests automatisés de cette révision, pas un appel fournisseur réel. |
| Appel fournisseur réel | Non exécuté | Configuration absente ; aucune preuve de génération réelle. |
| ChatGPT Desktop réel | Non exécuté | L’interface de l’hôte reste à vérifier séparément et manuellement. |

Les navigateurs affichent l’avertissement Puck selon lequel `setData` peut provoquer des rendus coûteux. Aucun échec n’y est associé et aucune mesure de performance n’a été faite. Le bundle de l’éditeur est volumineux ; aucune optimisation n’a été apportée dans ce checkpoint.

## Dettes, limites et critères non démontrés

| Type | Référence | Impact / condition de levée | Responsable |
|---|---|---|---|
| Prérequis bloquant | GEN-02 | Provenance/licence, empreinte de source et mesure de coût du catalogue restent à établir. GEN-03/04 ne sont pas éligibles avant sa livraison. | Backend / catalogue |
| Preuve manquante demandée | GEN-03 | Configurer le fournisseur API localement sans déposer la clé dans Git ou le chat, puis faire une requête réelle après debounce et conserver des métadonnées expurgées. | Orchestrateur avec le commanditaire |
| Capacité non livrée | GEN-04 | Définir une entrée contrôlée pour la revue du rendu réel ; aujourd’hui le modèle ne reçoit que du texte et le Snapshot. | Frontend + backend |
| Capacité de fournisseur | GEN-03 | Ajouter et qualifier les adaptateurs natifs demandés au-delà d’OpenAI-compatible avant de revendiquer « n’importe quel modèle ». | Backend |
| Qualification d’hôte | ARC-01 | Rejouer ouverture, génération et aperçu dans ChatGPT Desktop ; les captures navigateur locales et mocks ne suffisent pas. | Orchestrateur + commanditaire |

## Décisions et actions

| Action | Motif | Responsable | Prochaine preuve |
|---|---|---|---|
| Garder GEN-02 `in_progress`, GEN-03/04 `todo`, ARC-01 `blocked` | Éviter de contourner la dépendance et de convertir des tests simulés en preuve réelle. | Orchestrateur | Registre à la révision 55, inchangé. |
| Ne pas annoncer de génération live | Aucune configuration fournisseur n’est disponible dans l’environnement courant. | Orchestrateur | Réponse fournisseur réelle, avec identifiant et usage expurgés des secrets. |
| Reprendre après configuration locale | La clé doit rester dans le processus hôte ; elle ne doit pas être envoyée dans le chat. | Commanditaire + orchestrateur | Fournisseur activé dans le serveur MCP et une requête réelle réussie. |
| Implémenter l’inspection post-rendu | Le modèle n’a pas d’information du rendu visuel calculé. | Backend / frontend | Contrat révisé, preuve E2E et revue QA/design distincte. |

## Verdict

**GEN-03/04 : à reprendre ; génération réelle non prouvée.** Les tests de logique, le debounce de 1 500 ms et le rendu des composants locaux sont verts dans les environnements simulés et Chromium. Les tickets n’ont pas été soumis ni clos, GEN-02 est encore en cours, aucune clé fournisseur n’est configurée et aucune capture d’aperçu n’est analysée par le modèle.

Cette revue n’emploie pas `loop-verify` : les deux tentatives mentionnées dans la revue de tranche précédente avaient déjà atteint la limite de cette séquence. Aucun verdict externe n’est revendiqué.
