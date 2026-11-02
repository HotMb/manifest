# Réunion de fin de tâche — préparation des fournisseurs

Date : 2 novembre 2026  
Objet : préparer l'intégration de modèles sans activer de connexion réseau

## Décisions

- Le choix d'un fournisseur et d'un identifiant de modèle est une préférence de session, séparée du Snapshot et de la sauvegarde.
- Le registre partagé `ModelProviderRegistry` décrit les protocoles, statuts, capacités, limites et prix estimatifs sans exposer de secret.
- Le registre de l'éditeur est vide côté modèles et tous les fournisseurs sont `disconnected`.
- Un identifiant saisi librement reste une intention non vérifiée ; il ne devient jamais un modèle qualifié.
- Aucun adaptateur ne fait d'appel réseau dans cette étape. Le futur adaptateur devra implémenter `ModelProviderAdapter` et retourner des opérations structurées avec une base de document vérifiable.

## Preuves

- Typecheck de l'éditeur : PASS.
- Build de l'éditeur : PASS ; les avertissements `use client` viennent des dépendances bundlées.
- Tests fournisseur et préparation UI : 9 PASS.
- Tests métier/MCP existants : PASS lors de la précédente tranche.
- Le flux E2E a passé ses quatre premiers scénarios lors d'une relance puis le serveur Vite local s'est interrompu ; une seconde exécution a été interrompue par la même instabilité de serveur. Le problème observé est `ERR_CONNECTION_REFUSED`, pas une assertion de l'interface fournisseur.

## Dette technique

- Il manque un registre fourni par l'hôte et une politique d'authentification pour chaque fournisseur.
- Les capacités et prix ne seront fiables qu'avec un reçu d'usage ou une source datée ; ils restent donc déclaratifs.
- Le contrat d'adaptateur doit encore valider la réponse modèle, les locks, le budget, l'annulation et l'obsolescence d'une intention.
- Le parcours fournisseur doit être ajouté à une suite E2E dédiée quand le serveur de test local sera stabilisé.

## Prochaine étape

Implémenter un adaptateur simulé déterministe qui ne contacte aucun fournisseur, mais exerce le contrat de requête/réponse, l'annulation et le stale guard. Il servira de base aux tests avant l'ajout de clés ou de connexions réelles.
