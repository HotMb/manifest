# Revue d’équipe — ARC-01 — preuves du bridge et de l’identité — 3 novembre 2026

## Identification

| Champ | Valeur |
|---|---|
| Tâche | Produire les preuves possibles pour le bridge MCP Apps, l’identité, le paquet privé et le parcours local |
| Dépôt | HotMb/manifest, branche work/arc-01 |
| HEAD observé avant intégration | bfce80a ; le code testé est alors encore dans l’arbre local |
| Ticket et registre | ARC-01 bloqué, révision 14 ; ARC-02 dépend d’ARC-01 |
| Compte rendu de preuve | [Dossier bridge et identité](../evidence/ARC-01/bridge-identity-proof-2026-11-03.md) |
| PR | [#27](https://github.com/HotMb/manifest/pull/27), brouillon |

## Participants et contributions réelles

| Participant | Contribution | Limite |
|---|---|---|
| /root — orchestrateur et intégrateur | Relit le ticket et les transports, vérifie la release privée 0.1.3, exécute typecheck, tests Node, backend/MCP, providers, navigateur, build, smoke et check ; consigne les preuves et leur portée. | Aucun message ni interaction n’a été effectué dans l’interface native ChatGPT. |
| /root/launchcontext_code_review — reviewer indépendant | Revue lecture seule du bridge, du serveur MCP, du transport HTTP et de la portée des tests. Confirme que les tests locaux vérifient la couche transport/ressource et que les E2E remplacent le transport par un hôte simulé. | N’a pas exécuté ChatGPT Desktop ni relancé les tests. |
| Designer | Non requis pour cette tâche : aucun choix ou fichier d’interface n’a été modifié. | La revue design antérieure reste liée à la revue du composant. |

## Résultats démontrés

- Le plugin privé courant est 0.1.3. Son manifeste démarre Node par stdio et ne contient ni identifiants de fournisseur ni configuration OAuth.
- Le bridge dans le code s’appuie sur MCP Apps App.connect(), les notifications de résultat d’outil et app.callServerTool(). Le serveur MCP expose ui://design/editor.html et ajoute un LaunchContext uniquement quand les arguments sont explicitement fournis par l’hôte.
- Le smoke du paquet local passe : quatre outils MCP sont listés, le brouillon mémoire s’ouvre, le contexte explicite est vérifié et la ressource HTML autonome est lue.
- Le test backend passe 66/66. Il couvre l’auth Bearer de développement, le refus d’un jeton invalide, les contrôles d’origine, MCP stdio et la lecture/écriture du store mémoire.
- La suite providers passe 28/28 sans appel à un fournisseur réel. Les E2E passent 28/28, incluant contexte reçu, aperçu noir, conflit de version, recherche et tailles responsive ; la frontière d’hôte est simulée.
- Le test général passe 20/20 avec un test ignoré parce que Windows ne permet pas la création de lien symbolique. Typecheck, build/package, smoke, check de backlog et git diff --check passent. Les contrats Python ne démarrent pas, jsonschema manquant.

## Bridge et identité — décision technique

Le bridge est le transport de messages/outils entre la page embarquée et son hôte. Le code client MCP Apps est implémenté, mais seul un essai dans l’hôte réel prouve que ChatGPT Desktop le charge, ouvre l’iframe et transmet les arguments du modèle.

L’identité décrit quel utilisateur appelle le service et quels droits s’appliquent à la lecture/écriture. Le paquet Desktop est local stdio avec une instance de store en mémoire ; il ne transporte pas de principal OAuth. L’autre serveur est un endpoint loopback avec Bearer statique de développement, explicitement non-OAuth. Le test de jeton invalide prouve ce garde local, pas une session OAuth ChatGPT.

## Dettes, limites et décisions

- L’outil connecté de cette session a retourné project-m0, draftVersion 0, memory-m0, sans revisionId ni receiptId ; ce n’est ni un reçu de sauvegarde durable ni une preuve d’affichage dans Desktop.
- L’observation de la fenêtre native a échoué : minimisée, puis détection d’une interaction utilisateur. Le skill computer-use interdit l’automatisation de l’interface native ChatGPT. Aucun message n’a été envoyé et aucune donnée d’identité ou clé n’a été exposée.
- L’audit strict UI antérieur signale ownership.native-select-undecided dans model-provider-panel.tsx:21. Des contrastes gris intermédiaires et l’action de rejeu en mouvement réduit restent aussi documentés dans les revues précédentes.
- Les avertissements Vite use client et Puck setData restent à surveiller ; aucune mesure de performance n’a été faite.
- Décision : garder ARC-01 bloqué et la PR en brouillon. Les preuves obtenues ne démontrent pas l’hôte Desktop ni OAuth. Ne pas fusionner et ne pas lancer ARC-02.

## Actions suivantes

| Responsable | Action | Critère de fin |
|---|---|---|
| Commanditaire / opérateur Desktop | Ouvrir Manifest 0.1.3 dans ChatGPT Desktop et fournir une capture du lancement, du brief visible, de l’aperçu et d’une modification, sans secret. | L’hôte réel affiche et retransmet le contexte, lit puis conserve une modification ; capacités d’hôte consignées. |
| Backend / architecture, après clarification du modèle de livraison | Résoudre le besoin d’identité pour le serveur : stdio local par utilisateur ou service distant avec OAuth ; définir l’audience, les scopes et le refus des jetons invalides si OAuth est requis. | Contrat accepté et test négatif d’identité dans l’environnement visé, sans secret commité. |
| Orchestrateur | Refaire CI sur le commit contenant le code courant et rafraîchir les preuves PR. | Checks verts sur le HEAD actuel, reviewers et critères ARC-01 satisfaits avant merge. |

## Verdict

**À reprendre — gate externe encore bloquant.** Les preuves locales sont réussies et relues ; la PR #27 n’est pas prête à fusionner. Le registre reste à la révision 14 et npm run team:next ne propose aucun ticket éligible.
