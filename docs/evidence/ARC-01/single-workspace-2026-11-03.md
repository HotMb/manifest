# Espace unique, demande du chat et fond noir — 3 novembre 2026

Correctif demandé dans le chat : supprimer les quatre zones navigables et le réglage de bloc séparé, recevoir la demande envoyée et afficher un fond noir. Propriétaire/intégrateur : `/root`. Backend et tests de lancement : `/root/handoff`. Designer/reviewer distinct : `/root/design_review`. Travail local non commité ; aucun push ni déploiement public.

## Résultat

- Brief, aperçu et suggestions présents dans une même surface ; empilement naturel sur petit écran conformément à la demande « tout dans une page ». Les contrôles de contenu/couleurs restent sous le brief.
- `open_designer` accepte explicitement `userRequest`, `assistantProposal` et `backgroundColor`. Textes bornés à 6 000 caractères ; aucun accès implicite au compositeur ou à la conversation.
- Noir exact `#000000`, prévisualisation temporaire avec conservation/abandon, contenu existant préservé, verrouillages et versions contrôlés. L'analyse automatique est désactivée à chaque nouveau lancement. Une demande tardive ne remplace pas les retouches ; un fond différé dispose d'une reprise explicite après sauvegarde.
- Paquet privé existant actualisé en `0.1.2`, release `pluginrel_6ae9ff194df88191860cc4c1a2ff2875`, portée USER/PRIVATE et identité conservées. Relecture des manifestes et BUILD.txt concordante. Aucun changement du prompt par défaut ou des permissions.
- Archive locale SHA-256 : `6139BAFAAE8997E589B78ECFDE589689E5179DE75A09E864B832F92E4ED67017`.

## Vérifications exécutées

| Contrôle | Résultat |
|---|---|
| Typecheck final, build du paquet, smoke stdio avec contexte noir | Réussis |
| Suite navigateur existante | 17/17, après remplacement des attentes d'onglets |
| Suite lancement finale | 8/8, après les derniers garde-fous ; sortie `.team/playwright-launch-release` |
| M0 / backend / adaptateurs / jobs | 66/66 |
| Fournisseurs et sélecteur | 28/28, sans appel fournisseur réel |
| Analyse locale | 10/10 ; noir exact également testé dans le navigateur |
| Tests de gouvernance | 20 réussis, 1 ignoré (création de liens indisponible) |
| Contrats JSON/OpenAPI + tests Python | Contrats valides, 10 fixtures négatives rejetées, 8/8 Python |
| Audit UI strict, `git diff --check` | Aucun constat bloquant |

Capture de test : `.team/screenshots/launch-context/01-chat-black-preview.png`. La frontière d'hôte y est simulée ; le vrai Editor et les opérations de document s'exécutent dans Chrome.

## Relecture bornée

Deux appels loop-verify, tous deux `FAIL`, sans troisième appel. Le premier a relevé des couches d'aperçu conservées et un fond en attente insuffisamment protégé ; corrigés. Le second a signalé l'absence du marqueur d'édition dans l'extrait (ce marqueur existe et le scénario tardif passe), le redémarrage automatique sur lancement textuel et un ancien candidat devenu invisible ; les deux derniers points ont été corrigés par désactivation de l'automatique et invalidation du candidat. Aucun PASS loop revendiqué. Les huit tests de lancement ont ensuite passé et le reviewer distinct a confirmé les dernières corrections par lecture.

## Limites

L'outil chargé dans ce chat garde encore le schéma `open_designer {}` de la release précédente. Aucun mécanisme de reconnexion n'est exposé ici. Le rechargement de la version 0.1.2 dans l'hôte reste à observer ; une simple mise à jour du dépôt ne remplace pas le processus stdio déjà chargé. Les manifestes et tailles des gros fichiers distants sont vérifiés, pas leurs octets complets par l'API.

ARC-01 reste bloqué dans le registre révision 14 ; aucune qualification OAuth, catalogue M1, export ou transmission `/validate` n'est revendiquée. Pas de nouvelle dette retenue ; la qualification hôte reste l'exigence existante d'ARC-01.

## Mise à jour de vérification indépendante — après la revue

La provenance du correctif, d'abord incertaine dans l'audit de disponibilité, a été consignée dans la revue ci-dessus : `/root` intégration, `/root/handoff` backend et `/root/design_review` revue design. Le prototype est maintenant servi localement et visible à [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Le serveur est local à cette session et ne constitue pas un hébergement public.

Vérifications relancées sur les sources locales : typecheck réussi ; `npm test` 20 réussis et 1 ignoré pour l'interdiction Windows de créer un lien ; build réussi (2 221,40 Ko, gzip 777,23 Ko, avertissements Vite `use client`) ; E2E 25/25 ; M0 66/66 ; providers 28/28 ; smoke Desktop MCP réussi en stdio local ; `npm run check` et `git diff --check` réussis. Le smoke ne teste pas l'application ChatGPT Desktop. Les tests E2E émettent des avertissements Puck `setData` coûteux, sans mesure de performance.

Deux contrôles ne sont pas verts dans cette session :

- `scripts/check_contracts.py` et unittest n'ont pas pu démarrer avec l'interpréteur Python courant, car `jsonschema` n'y est pas installé. Une exécution antérieure par l'équipe est consignée comme 8/8 ; elle n'a pas été reproduite ici.
- `audit_project.py --mode strict` signale `ownership.native-select-undecided` dans `apps/editor-web/src/model-provider-panel.tsx:21`. Cela corrige le compte rendu précédent qui disait « aucun constat bloquant » : le résultat de cette relance est à retenir tant qu'une décision native/auteur n'est pas explicitée.

Revue de contraste de `launch-preview.ts` : le seuil `.179` choisit les tokens `#1c2533` ou `#f3f1eb`, mais ces choix donnent respectivement 3,35:1 / 4,08:1 sur `#757575` et 3,44:1 / 3,96:1 sur `#777777`. Le défaut identifié par le reviewer reste donc présent.

Le commit documentaire `8d54f58` a été poussé vers `work/arc-01-qualification` ; aucun code applicatif du correctif n'est dans ce commit. Le nouveau HEAD de la PR n'avait pas encore de run CI retourné au moment de cette vérification ; le run 56 vert porte sur l'ancien HEAD commité `f95c297`. Le correctif applicatif et ses tests restent non commités dans le dossier local.
