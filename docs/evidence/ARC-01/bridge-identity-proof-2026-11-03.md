# ARC-01 — preuves bridge et identité — 3 novembre 2026

## Verdict

**Preuves locales réussies ; gate ChatGPT Desktop et OAuth non qualifié. ARC-01 reste bloqué.** Ce document distingue ce qui est exécuté dans le dépôt et le paquet privé de ce qui doit être vu dans l’application hôte réelle.

## Ce que signifient « bridge » et « identité » ici

- Le **bridge MCP Apps** est le canal entre la page embarquée et son hôte. La vue construit App depuis @modelcontextprotocol/ext-apps, appelle connect(), reçoit les notifications de résultat d’outil et demande au serveur MCP de lire ou modifier le Snapshot. Le serveur publie la ressource ui://design/editor.html et ses outils. Une ressource HTML renvoyée par un smoke test prouve le paquet et le protocole MCP local ; elle ne prouve pas que ChatGPT Desktop a réellement affiché la page.
- L’**identité** est la preuve de quel utilisateur et de quels droits une lecture ou une modification utilise. Le paquet Desktop actuel démarre un processus local par stdio, avec un store en mémoire et sans identifiant utilisateur transmis au serveur. Le transport HTTP de développement utilise un jeton Bearer statique, limité à loopback. Le code le décrit explicitement comme non-OAuth. Aucun issuer, audience, scope, échange OAuth ou jeton d’identité de production n’est configuré.

## Preuves obtenues

| Élément | Résultat observé | Portée exacte |
|---|---|---|
| Plugin privé | Plugin Creator confirme manifest-desktop version **0.1.3**, release pluginrel_6aea039666b0819192b9d09d9f0749da, scope USER, visibilité PRIVATE. | Confirme la release attachée et courante, pas son chargement dans une fenêtre Desktop. |
| Paquet publié | .mcp.json lance node depuis le dossier du plugin vers server/services/api/dist/main.mjs avec l’option --stdio, environnement vide. Le manifeste indique qu’aucune clé fournisseur n’est incluse. | Confirme un serveur local stdio sans OAuth. |
| Bridge dans le code | createMcpTransport() crée App, attend app.connect(), écoute ontoolresult, utilise app.callServerTool() pour les lectures/écritures, et s’abonne au contexte explicite de lancement. | Implémentation de l’adaptateur officiel ; le test n’est pas une exécution dans l’hôte ChatGPT. |
| Ressource et outils | npm run smoke:desktop-plugin réussit : open_designer, read_project, commit_commands, get_provider_registry ; ressource text/html;profile=mcp-app, 2 233 292 octets. | Client MCP stdio local et bundle empaqueté. |
| Contexte de lancement | Le smoke vérifie que userRequest et backgroundColor #000000 ressortent dans _meta.launchContext, sans changement du Snapshot de base. Le test backend nommé « MCP lancement » réussit. | Vérifie la frontière serveur/outils locale, pas l’affichage du contexte par ChatGPT Desktop. |
| Lecture/modification authentifiées de développement | npm run test:m0 réussit 66/66, dont HTTP local : absence de jeton et jeton invalide refusés en 401, origine étrangère refusée en 403, jeton de test accepté par un client MCP et sauvegarde lue. | Bearer local statique avec serveur loopback de test ; ce n’est pas OAuth ni une identité ChatGPT. |
| Prévisualisation de lancement | npm run test:e2e réussit 28/28. Les tests de lancement couvrent texte reçu, aperçu noir conservable/annulable, version obsolète et conflit avec une retouche. | Le test injecte un adaptateur d’hôte simulé dans le navigateur ; aucun ChatGPT Desktop n’est contacté. |
| Outil de cette session | open_designer a renvoyé project-m0, draftVersion 0, storage memory-m0, revisionId null, receiptId null. | Le retour MCP ne constitue pas un reçu d’identité, une preuve d’affichage ou une persistance. |
| Contrôles généraux | npm run typecheck, npm test (20 réussis, 1 ignoré), npm run test:providers (28/28), npm run check (26 tickets, révision 14), npm run package:desktop-plugin et git diff --check réussissent. | Vérifications locales consignées avant le correctif documentaire ci-dessous. |

Le contrôle python scripts/check_contracts.py et la suite Python n’ont pas pu s’exécuter : jsonschema n’est pas installé dans Python 3.14. Le build affiche des avertissements de bundling « use client » ; Playwright signale aussi que Puck.setData peut être coûteux.

## Vérification GitHub après publication de bd21c25

GitHub Actions a exécuté deux jobs `contracts-and-orchestration` sur le HEAD `bd21c25780e2d92d4a31081c52e4a08265234e43` (runs 41714496715 et 41714490176). Dans les deux jobs, les 28 E2E ont réussi ; `scripts/check_contracts.py` a ensuite échoué uniquement parce que les six liens de sources de ce rapport remontaient d’un seul niveau insuffisant (`../../packages`, `../../services`, `../../integrations`, `../../tests`). Les chemins sont corrigés dans la version locale de ce rapport ; cette correction n’est pas encore poussée et son résultat CI reste donc à confirmer.

## Critères encore sans preuve

| Critère ARC-01 | État |
|---|---|
| ChatGPT Desktop charge effectivement la release 0.1.3 et ouvre la vue MCP Apps | **Non observé** |
| Le brief réellement envoyé par le modèle hôte s’affiche dans le champ Manifest | **Non observé** ; seuls les contrats et mocks locaux sont testés |
| La vue lit le projet réel via le bridge dans l’hôte et permet d’enregistrer une modification | **Non observé** |
| Le jeton ou contexte de l’identité de production est validé et un jeton invalide est rejeté par cette identité | **Non implémenté/non observé** ; le test Bearer actuel est local et explicitement non-OAuth |
| Matrice réelle des capacités (rafraîchissement, stockage, iframe, clavier et dimensions de l’hôte) | **À relever dans l’hôte** |

## Revue indépendante

Le reviewer **/root/launchcontext_code_review** a relu le bridge et les transports sans modifier de fichier ni relancer les tests. Il confirme que le code utilise MCP Apps, enregistre le gestionnaire de résultat avant connect(), valide et rejoue le LaunchContext, puis appelle les outils MCP via app.callServerTool(). Il n’a pas trouvé de défaut de protocole local qui invalide les tests. Il confirme également que les E2E remplacent le transport hôte par un faux : ils ne prouvent donc pas le bridge ChatGPT Desktop. Aucun transport actuel n’implémente OAuth.

Le test visuel dans ChatGPT Desktop exige une action manuelle dans l’application. Le skill computer-use interdit l’automatisation de l’interface native ChatGPT ; l’observation de la fenêtre a indiqué qu’elle était minimisée, puis l’outil a signalé une interaction utilisateur en cours. Aucun message n’a été saisi dans l’application. Le lancement MCP depuis ce runtime Codex ne remplace pas cette preuve.

## Décision

Ne pas marquer ARC-01 prêt et ne pas fusionner la PR #27. La release 0.1.3, le bridge côté code, les tests locaux et l’authentification Bearer de développement sont documentés. Il manque une exécution visible dans le vrai hôte et une décision/test de l’identité adaptée au mode de livraison. ARC-02 reste dépendant d’ARC-01 ; npm run team:next retourne zéro ticket éligible.

### Sources dans le dépôt

- [packages/host-adapters/src/index.ts](../../../packages/host-adapters/src/index.ts)
- [services/api/src/mcp.ts](../../../services/api/src/mcp.ts)
- [services/api/src/http.ts](../../../services/api/src/http.ts)
- [integrations/chatgpt-desktop/README.md](../../../integrations/chatgpt-desktop/README.md)
- [tests/m0-backend.test.ts](../../../tests/m0-backend.test.ts)
- [tests/e2e/launch-context.spec.ts](../../../tests/e2e/launch-context.spec.ts)
