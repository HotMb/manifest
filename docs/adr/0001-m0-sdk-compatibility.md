# ADR 0001 — Combinaison de SDK pour l'essai M0

Date : 1er novembre 2026. Statut : retenu pour l'essai local ARC-01 ; qualification hôte et verrouillage final au ticket ARC-02.

## Constat

La consultation du registre npm a renvoyé Puck 0.24.0, React 19.3.1, MCP SDK 1.32.2 et MCP Apps 2.0.4. Les peerDependencies de MCP Apps 2.0.4 demandent les paquets MCP v2 séparés core/client/server ; elles ne correspondent pas au serveur SDK v1 du quickstart consulté. Ce n'est pas une preuve qu'une génération de SDK serait meilleure pour tous les cas.

## Décision

Employer MCP Apps **1.1.2** avec SDK **1.32.2** pour cet essai : le registre confirme un peer SDK `^1.24.0`, React 18/19 et Zod 3/4. Installer des versions exactes et conserver le lockfile. React/Puck alimentent le même composant dans le navigateur et dans la ressource MCP. Le snapshot et les commandes restent ceux du domaine ; le transport ne définit pas un deuxième modèle de page.

L'essai reste limité à un Hero et au sous-ensemble manuel de commandes. Le stockage mémoire et le bearer de développement sont des limites assumées de l'essai, pas une stratégie de production. Les appels fournisseur, l'OAuth de production et la persistance restent des travaux explicites des tickets suivants.

## Conséquences et sortie

ARC-01 doit produire un build et des tests avec cette combinaison. ARC-02 doit éprouver les capacités dans le vrai hôte et décider de maintenir cette branche ou de qualifier MCP v2. Le choix ne constitue pas une preuve de compatibilité ChatGPT. Toute migration doit préserver les contrats de document, les tests d'autorisation et les contrôles de causalité.

Sources : [quickstart officiel ChatGPT](https://developers.openai.com/plugins/build/app-quickstart), [quickstart MCP Apps](https://apps.extensions.modelcontextprotocol.io/api/documents/Quickstart.html), métadonnées npm des versions mentionnées (peerDependencies consultées pendant le développement).
