# ARC-01 — bilan de vérification et relecture

Date : 1er novembre 2026. Portée : incrément local, avant qualification dans le vrai ChatGPT. La [réunion](../../meetings/2026-11-01-ARC-01-review.md) contient les avis et décisions de l'équipe.

## Résultats exécutés

| Contrôle | Résultat constaté |
|---|---|
| TypeScript des workspaces | réussi |
| Build React/Puck singlefile | réussi, 2 132 768 octets ; hash SHA-256 ci-dessous |
| Tests M0 intégrés | **31 réussis** : 14 backend/domaine/MCP/HTTP, 16 adaptateurs, 1 ressource MCP du véritable build |
| E2E Chrome Windows | **8 réussis**, aucun ignoré, 34,0 s ; [preuve QA](ui-qa.md) |
| Suivi des tickets | 21 tests : 20 réussis et 1 ignoré localement faute de droit de création d'un lien ; ce même cas avait passé la CI Linux du bootstrap |
| Contrats | schéma, trois exemples, dix variantes invalides, OpenAPI/15 opérations et liens locaux contrôlés |
| Mutation des contrats | 8 tests Python réussis sur le socle ; les schémas et le validateur n'ont pas été modifiés par cet incrément |
| Audit premium strict | zéro constat statique sur le périmètre déclaré ; ne vaut pas test d'accessibilité complet |
| Audit npm des dépendances de production | aucune vulnérabilité répertoriée au contrôle, sans garantie générale d'absence de risque |
| Aperçu de développement | HTTP 200 et entrée React confirmés sur localhost:5173 |

Empreinte du build local final : `4002f3a9d3bcebdadb9fc7507ced480055fec9bab1dbb4ae8e858bddf107c8dc`. Les dépendances sont verrouillées dans package-lock.json. Les fontes sont embarquées ; la vérification de ressource utilise le vrai SDK MCP et retrouve exactement le HTML construit. Une lecture de ressource ne prouve pas son rendu dans le vrai hôte.

L'interface n'a pas changé après ses huit E2E. Les dernières corrections portaient sur les reçus d'adaptateur, puis les 31 tests intégrés et le build ont été exécutés. La CI Linux rejoue la suite complète du commit poussé ; son état est suivi dans la pull request.

## Relecture loop-verify

Deux appels ont été effectués, dans la borne du skill loop-verify-review, avec Codex/OpenAI. Ce n'est pas une revue indépendante entre fournisseurs. **Les deux verdicts sur extraits sont FAIL ; aucun PASS global n'est revendiqué.**

La première passe a identifié la perte de clé lors d'une vérification de sauvegarde incertaine, la réinitialisation implicite d'un document expiré et l'absence de comparaison réelle du hash à la lecture. Le frontend a conservé la commande en attente, ajouté la reprise explicite et recalculé le SHA-256. Deux E2E de récupération et des tests d'adaptateurs vérifient ces chemins. L'orchestrateur a aussi ajouté une copie défensive à la frontière du store ; le helper clonait déjà le document et les tests d'atomicité existaient.

La deuxième passe accepte la causalité de sauvegarde et la transaction mémoire, puis relève deux autres cas : comparaison des commandes dépendante de l'ordre des clés JSON et reçu en cache renvoyé avant vérification du stockage courant. Ils ont été corrigés par sérialisation canonique et contrôle du record présent, intègre, non expiré et non régressé. Cinq tests ciblés passent sur ces cas ; aucun refus ne réécrit le stockage.

Deux critères de la deuxième passe restent non validés par le vérificateur faute de sources serveur/vue/config complètes dans cet extrait borné. Ces parties avaient été fournies partiellement à la première passe ; leurs tests SDK et UI sont exécutés séparément. Cette limitation de couverture n'est pas présentée comme un PASS ni comme une certification d'absence de secret. Aucun troisième appel n'a été effectué ; les dernières corrections ont reçu les tests ordinaires indiqués.

## Limites et décision

Replay navigateur garanti dans une instance d'adaptateur, sans reçu durable après rechargement ; serveur M0 et reçus mémoire perdus au redémarrage. Ces limites sont nommées dans les README. Elles ne sont pas les garanties de persistance M1.

Non exécutés : ouverture de l'éditeur dans le vrai ChatGPT/Claude, identité OAuth réelle, capacités de l'hôte, coupure réseau MCP après commit dans ce vrai hôte, lecteur d'écran, appareil mobile physique et mesure terrain de performance. Le choix du client à connecter est demandé au commanditaire ; aucun paramètre global n'a été modifié pour fabriquer cette preuve.

Verdict d'intégration : incrément local à conserver sur branche de qualification et pull request en brouillon. **ARC-01 ne passe pas done.** Les dettes et actions de sortie restent dans [TECH-DEBT.md](../../TECH-DEBT.md).
