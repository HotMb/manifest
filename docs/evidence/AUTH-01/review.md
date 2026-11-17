# AUTH-01 — preuve de revue indépendante

Date : 6 novembre 2026
Branche locale : `work/auth-01`
Base : `63a63ac`

## Relecteurs et constats

- **Revue indépendante du code — `/root/arc01_code_review`** : a relevé qu’un refresh OAuth retirant `chatgpt.tokens.use.direct` pouvait encore remettre un jeton au runtime, et qu’une lecture temporairement impossible du coffre empêchait une nouvelle tentative. Ces deux défauts ont été corrigés et couverts par des tests. Le reviewer a ensuite confirmé qu’il ne restait aucun finding P0–P2 dans le code relu.
- **Revue du coffre et du paquet — `/root/arc01_code_review`** : a demandé une preuve du DPAPI Windows et un build post-correction. Le test utilise un faux credential, valide le chiffrement/lecture de retour et supprime son répertoire temporaire. Après reconstruction, le reviewer a confirmé que le ZIP inclut le script PowerShell corrigé, le chemin de modules borné, le contrôle de scopes après refresh et qu’il ne contient aucun faux jeton. Verdict paquet : GO.
- **Revue de conception UI — `/root/auth_design_review`** : a relevé une présélection de ChatGPT alors qu’une API payante coexistait, puis l’absence d’annonce live du statut principal. La sélection est maintenant vide dès qu’il existe plusieurs choix configurés ; le statut utilise `aria-live="polite"` et `aria-atomic="true"`. Le test UI couvre ces états. Verdict UI final : acceptable, aucun blocage.
- **Revue de code après les constats loop-verify — `/root/arc01_code_review`** : a revu les correctifs OIDC et de sélection ; confirme le rejet de tout `azp` incohérent, des claims `nbf`/`iat` non numériques ou non finis, et l’absence de présélection en présence de plusieurs modèles configurés. Aucun finding P0–P2 ; tests non relancés par le reviewer. Verdict : GO.

Les agents d’implémentation `auth_backend` et `auth_frontend` ont atteint leur limite d’usage et n’ont pas participé à la revue finale. La responsabilité du ticket a été transférée à l’orchestrateur par la révision versionnée 63.

## Verdict et limite

La revue de code indépendante accepte les correctifs et le paquet local. Le second contrôle loop-verify a rendu **FAIL** avant ces corrections, en détectant les deux défauts OIDC et la présélection ambiguë ; il a aussi demandé davantage d’extraits sur PKCE/callback/absence de jetons. Ces défauts ont été corrigés, les tests complets ont passé, et le reviewer distinct est GO. Les deux appels loop-verify autorisés ont été consommés : aucun PASS indépendant après correctif n’est revendiqué. Aucun relecteur n’a ouvert de compte ChatGPT ni qualifié le vrai hôte ; cette étape reste explicitement attribuée à ARC-01.
