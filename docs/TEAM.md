# Équipe d'agents

Les agents sont des rôles avec leurs propres consignes et contextes. Ils héritent du modèle et des accès de la session Codex : ce ne sont pas sept abonnements ou fournisseurs différents. Le dépôt conserve leur configuration et la passation ; leur activité s'arrête avec la session. Aucune boucle de fond permanente n'est installée.

| Rôle | Responsabilité | Propriété habituelle |
|---|---|---|
| orchestrator | tickets éligibles, délégation, intégration, explications et passation | état du backlog, documentation livraison, Git |
| designer | parcours, hiérarchie, états, tokens et critères de qualité | DESIGN.md, UX-CONTRACT.md, docs/design/ |
| frontend | éditeur Puck, inspecteur, saisie et causalité | apps/, packages/editor/, packages/host-adapters/ |
| backend | domaine, stockage, commandes, MCP et modèles | services/api/, packages/domain/, packages/inference/ |
| platform | environnements, ressources et export isolé | services/worker/, packages/exporter-react/, configuration de livraison |
| qa | contrats, erreurs, régressions et recette indépendante | tests/, scripts de contrôle, docs/evidence/ |

Le designer peut travailler avant l'interface, puis vérifier le résultat du frontend. Backend et frontend peuvent avancer séparément après accord des contrats. La QA relit une version identifiée ; elle ne valide pas ses propres changements sous une autre étiquette. L'orchestrateur fusionne les résultats, traite les conflits et décrit ce qui fonctionne et ce qui reste à prouver.

## Boucle de travail

1. Lire le statut Git et la passation ; examiner `npm run team:next`.
2. Choisir un ticket dont les dépendances sont terminées, préciser ses chemins et le réclamer avec la révision courante du backlog.
3. Déléguer au rôle adapté, sans chevauchement d'écriture. Faire évoluer un contrat commun avant les consommateurs s'il doit changer.
4. Exécuter les contrôles utiles, déposer une preuve avec commandes/résultats/limites, puis soumettre à review.
5. Faire relire par un autre agent ; corriger avant done. Ne pas confondre un contrôle de schéma avec le fonctionnement de ChatGPT.
6. Mettre à jour le tableau, la passation et GitHub Issues ; committer le résultat cohérent avec l'ID du ticket.

## Lancer ou reprendre

Ouvrir **ce dossier** dans Codex et demander : « Agis comme orchestrator. Lis la passation et avance sur le prochain ticket éligible avec les agents du projet. » Les fichiers personnalisés sont découverts lors d'une nouvelle session, selon la version du client et sa confiance dans le projet. Ils ne changent pas rétroactivement les rôles déjà chargés dans un chat existant.

En terminal, `npm run team:brief` affiche le brief sans appeler de modèle. `npm run team:start` ouvre une session Codex interactive dans le dépôt avec ce brief et les permissions habituelles. Codex doit être installé et connecté ; cette commande utilise l'accès Codex de l'utilisateur, pas les clés API du futur produit. Elle ne lance pas un service permanent. La session principale orchestre directement ; elle peut déléguer avec les rôles enregistrés. Si un client ne charge pas les agents personnalisés, fournir leurs consignes comme briefs à des agents worker en conservant les mêmes responsabilités.

La configuration suit la [documentation officielle des sous-agents](https://learn.chatgpt.com/docs/agent-configuration/subagents). Les limites gérées par le compte ou le client restent prioritaires. Aucun modèle précis n'est figé par le dépôt.

## Git et revue

Une branche par ticket : `work/arc-01-qualification`, `work/ui-03-saisie`, etc. Chaque commit cite le ticket. Le dépôt initial constitue la base de bootstrap ; les fonctionnalités suivantes passent par une pull request avec tests, preuve et limites. Seul l'intégrateur effectue les mutations Git dans un checkout partagé. Des worktrees peuvent isoler des modifications qui nécessitent des branches séparées ; leurs chemins sont attribués avant de commencer.

GitHub Issues permet de suivre les discussions et les références. Les statuts de livraison sont décidés à partir des preuves et enregistrés dans tickets.json ; une issue fermée manuellement ne termine pas un ticket local. Les changements de statut sont répercutés explicitement, sans bot qui modifierait le backlog à distance sans contrôle.
