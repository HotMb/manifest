# AUTH-01 — preuve d’implémentation

Date : 6 novembre 2026
Branche locale : `work/auth-01`
Base examinée : `63a63ac`
Révision du suivi au moment de la revue : 63
Révision du suivi après clôture : 65
Commit applicatif : `0b702a4`
Pull request : [#28 — AUTH-01](https://github.com/HotMb/manifest/pull/28), empilée sur la PR #27

## Résultat livré

Manifest propose « Continuer avec ChatGPT » dans son panneau de modèles. L’utilisateur lance le flux officiel depuis l’atelier, ouvre lui-même la page d’autorisation, accepte l’usage du forfait et revient dans l’application. Le flux local vérifie PKCE, state, nonce, signature/issuer/audience/expiration du jeton OpenID et les scopes avant d’autoriser l’inférence. Si `azp` est présent, il doit correspondre au client ; `nbf` et `iat` mal typés sont rejetés. Le callback loopback est annulable, limité à `127.0.0.1`, vérifie le chemin, le port, l'en-tête Host et le state, et rejette les retours tardifs. Le panneau et le résultat de lancement ne rendent pas de jeton.

Le coffre Windows chiffre les credentials du compte courant avec DPAPI. Le test DPAPI utilise uniquement des jetons fictifs dans un répertoire temporaire supprimé après le round-trip. Les scripts PowerShell utilisent les modules Windows intégrés, et leurs blocs `try/finally` sont séparés par des retours à la ligne.

Après autorisation, l’adaptateur Responses demande une sortie structurée avec `stream=true` et `store=false`, attend la réponse complète et valide les opérations contre M0 avant de proposer le rendu. Le code libre du modèle n’est jamais exécuté. Une présélection du modèle ChatGPT n’est permise que s’il est le seul modèle configuré tous fournisseurs confondus et que son usage est autorisé ; les API facturées à part restent un choix explicite. Aucune expiration, révocation ou erreur OAuth ne bascule automatiquement vers l’API payante.

Le test PKCE vérifie le challenge `S256`, la redirection `http://127.0.0.1:<port>/auth/callback`, l'absence de `id_token_hint` et l'absence de jetons dans le résultat de connexion. Le test E2E confirme que, lorsque le modèle ChatGPT et l'API distincte coexistent, le fournisseur reste vide jusqu'au choix explicite.

## Vérifications locales

| Contrôle | Résultat | Portée |
|---|---|---|
| `npm test` | Réussi : 23 tests de suivi, 15 tests du catalogue, 25 tests OAuth/Responses/runtime (63 au total) | Jetons factices ; le test DPAPI a chiffré puis relu un faux secret avec le DPAPI Windows courant |
| `npm run test:e2e` | Réussi : 46/46 après les correctifs `azp` et de sélection | Scénarios Chromium simulés, dont le debounce de 1 500 ms, l’invalidation, les parcours mobiles et les flux d’autorisation simulés |
| `npm run test:e2e -- tests/e2e/chatgpt-sign-in-preview.spec.ts` | Réussi : 3/3 après l’ajout de la région live d’accessibilité | Consentement simulé, coexistence forfait/API, sélection unique et statut annoncé |
| `npm run test:providers` | Réussi : 32/32 | Inclut la régression de sélection ChatGPT/API sans présélection ambiguë |
| `npm run typecheck` | Réussi | Workspaces éditeur et API |
| `npm run check` | Réussi avant soumission du ticket, révision 63 | Le tableau et la preuve de clôture sont mis à jour par les commandes de suivi ensuite |
| `python scripts/check_contracts.py` | Réussi | Schémas et exemples valides, 11 fixtures négatives rejetées, 15 opérations OpenAPI valides |
| `python -m unittest discover -s tests -p 'test_*.py'` | Réussi : 8/8 | Fichiers temporaires redirigés vers le dossier temporaire local du dépôt |
| `git diff --check` | Réussi | Aucun espace fautif ; Git n’a émis que des avertissements CRLF/LF |
| `npm run package:desktop-plugin` | Réussi | Package Desktop `0.1.3` construit ; avertissements Vite `use client` provenant de dépendances tierces |
| `npm run smoke:desktop-plugin` | Réussi | Démarrage stdio local, 16 outils, ressource HTML MCP Apps et ouverture sur projet vierge |

L’archive installable locale est `integrations/chatgpt-desktop/dist/manifest-desktop.zip`, 1 178 440 octets. Son SHA-256 est `0DD0198973D71A9BA1E35E73C45B43B7B93B86A25E88CA942B14B6376C362E1D`. L’inspection confirme neuf fichiers attendus (bundle HTML, serveur, manifeste et configuration MCP). Le package est un build local ; il n’a pas été installé dans ChatGPT Desktop pour ce contrôle.

## Vérification indépendante loop-verify

Deux tentatives ont été consommées, sans nouvelle tentative après cette limite. La seconde a évalué les extraits source réels et les preuves disponibles ; verdict global **FAIL**. Les critères DPAPI, scopes/refresh, Responses/M0 et résultats de build/tests ont été marqués OK. Le contrôleur a relevé une vérification manquante de `azp`, l’acceptation de `nbf`/`iat` mal typés, une présélection en cas de plusieurs fournisseurs, et des extraits insuffisants pour PKCE/callback/absence de jetons dans l'UI. Les trois premiers défauts de code ont été corrigés avec des tests de régression ; les preuves PKCE, callback et UI sont maintenant décrites plus haut. Le dernier résultat loop-verify demeure FAIL car le nombre maximal de tentatives est atteint. Une revue de code distincte après correctifs a conclu GO sans constat P0–P2.

## Limites de preuve

Aucun compte ChatGPT réel n’a été connecté, aucune autorisation réelle n’a été demandée et aucune requête Responses facturable n’a été faite. Les tests d’inférence utilisent un fournisseur simulé. L’ouverture, le retour OAuth et la modification dans le vrai hôte ChatGPT Desktop doivent encore être observés manuellement sous ARC-01 ; cette preuve ne prétend pas clore ce ticket.

L’avertissement Puck `setData` apparaît encore pendant plusieurs parcours E2E. Il n’a causé aucun échec et aucune mesure de performance ne permet de le qualifier comme dette. Les avertissements Vite sur `use client` dans des dépendances restent aussi sans échec de build.
