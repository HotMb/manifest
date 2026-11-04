# HOTFIX-01 — revue indépendante

Date : 4 novembre 2026
Ticket : HOTFIX-01
Périmètre : brief au lancement, page blanche sans demande, hauteur du viewport, défilement interne, navigation mobile et préservation du brouillon.

## Relectures reçues

| Rôle | Contribution | Résultat et limite |
|---|---|---|
| `/root/arc01_code_review` — revue de code | A revu le delta final après l’ajout du test de persistance. | Aucun défaut P0–P2 pour des contextes MCP valides. A signalé P3 que le cas vide/`undefined` contournait le contrat; ce test a été retiré, car le validateur rejette un champ vide et JSON omet `undefined`. La priorité du brief réel reste couverte par l’E2E. Pas de vérification ChatGPT Desktop. |
| `/root/arc01_qa` — QA distincte | A exécuté le nouveau test de réouverture du transport : sauvegarde d’un contenu identifiable, nouvelle session, lecture du même contenu/version/hash. | GO sur ce delta; 1/1 réussi. Son fixture de stockage est simulée et ne représente pas un redémarrage dans l’hôte réel. |
| `/root/gen01_qa` — revue QA du diff | A relu les critères de lancement, les captures 736×704, le défilement et la navigation clavier/tactile. | GO, aucun P0–P2. Le résultat de la suite complète était alors encore attendu; il ne remplace pas les exécutions listées dans la preuve d’implémentation. |
| `/root/arc01_design_review` — revue design/accessibilité | A examiné la capture compacte et les tailles de texte du format intégré. | Aucun finding P0–P2. Pas d’observation dans ChatGPT Desktop. |
| `/root` — orchestration et vérifications | A exécuté les 27 E2E ciblés, les 75 tests M0, le typecheck, le build et le contrôle du backlog. | Résultats consignés dans [implementation.md](implementation.md). |

## Vérificateur additionnel

Le contrôle `loop-verify` a utilisé ses trois appels maximum. Il n’a pas rendu de PASS global : les premières passes ont demandé une assertion de préservation de brouillon puis une stricte distinction de propriétés `userRequest` invalides; la dernière a confirmé les critères de viewport, canevas vide, réouverture du brouillon et limites de l’hôte, mais conservait le critère trop strict sur `userRequest: undefined`. Le code reviewer a confirmé que ce cas ne passe pas le contrat MCP valide : `userRequest` vide est rejeté et `undefined` est omis lors de la sérialisation JSON. Le test artificiel a été retiré et le comportement revient à prioriser le texte utilisateur valide, avec repli vers une proposition d’assistant déjà présente. Par respect de la limite de tentatives, le vérificateur n’a pas été relancé après cette clarification. Aucun PASS `loop-verify` n’est revendiqué.

## Conclusion de revue

GO pour les critères locaux de HOTFIX-01 selon la revue code/QA et les parcours reproduits. Le diff final ne prétend pas résoudre le gate ARC-01 : l’identité, l’ouverture, les permissions et la modification dans ChatGPT Desktop restent à observer dans l’hôte réel. Le transport des parcours navigateur est simulé; aucune API de modèle réelle n’a été appelée.
