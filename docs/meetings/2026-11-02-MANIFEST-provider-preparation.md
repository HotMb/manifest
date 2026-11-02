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
- Le contrat d'adaptateur doit encore valider la réponse modèle, les locks et le budget ; l'annulation, la sélection et l'obsolescence sont maintenant centralisées par `ModelSuggestionOrchestrator`.
- Le parcours fournisseur doit être ajouté à une suite E2E dédiée quand le serveur de test local sera stabilisé.

## Prochaine étape

L'adaptateur simulé déterministe est maintenant livré dans `packages/m0-contract/src/provider-simulator.ts`. Il ne contacte aucun fournisseur, exerce le contrat de requête/réponse, l'annulation et le stale guard, et sert de base aux tests avant l'ajout de clés ou de connexions réelles.

L'orchestrateur `ModelSuggestionOrchestrator` devient la seule porte d'entrée d'une suggestion dans l'éditeur. Il vérifie l'alignement registre/adaptateur/modèle avant l'appel, n'autorise qu'une requête active, annule la précédente lors d'une nouvelle pause d'écriture et étiquette `stale` toute réponse arrivée après un changement de génération ou de base. L'adaptateur conserve la responsabilité du protocole fournisseur ; l'orchestrateur ne reçoit ni clé ni secret. La prochaine réunion doit décider le premier adaptateur distant à implémenter derrière cette frontière et son budget de requêtes.

L'adaptateur `createOpenAICompatibleModelAdapter` est maintenant préparé derrière la même frontière. Il cible `/chat/completions`, fonctionne avec un endpoint OpenAI-compatible (donc compatible avec plusieurs fournisseurs), reçoit la clé par callback de session, force une sortie JSON, valide les opérations contre M0 et normalise les erreurs sans relayer le corps distant. Il reste inactif tant qu'un hôte ne fournit pas explicitement un registre configuré, un endpoint autorisé et une fonction de secret éphémère.
