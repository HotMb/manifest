# Revue d’équipe — ARC-01 — livraison d’essai et audit des PR — 3 novembre 2026

## Décision

**Le prototype local est essayable dans un navigateur, mais l’intégration réelle dans ChatGPT Desktop n’est pas validée et ARC-01 reste bloqué.** La PR #27 reste ouverte en brouillon. Aucun ticket en aval ne peut commencer tant que les preuves attendues par ARC-01 ne sont pas apportées.

## Périmètre et état du dépôt

| Élément | État constaté |
|---|---|
| Répertoire de travail | `design-workbench`, branche `work/arc-01` |
| HEAD commité au début de la vérification | `f95c29751ae09abfc0dc23cc72a78b1e5bf50929`, égal à `origin/work/arc-01-qualification` à ce moment |
| Arbre à la fin de la vérification | Modifié : changements applicatifs et tests non commités, d’auteur non établi, apparus durant la session ; fichiers conservés tels quels |
| Prototype local | [http://127.0.0.1:5173/](http://127.0.0.1:5173/) — accessible tant que le serveur local tourne |
| Backlog | Révision 14, 26 tickets, `npm run team:next` retourne 0 ticket éligible |
| Hôte ChatGPT Desktop | Non testé dans cette revue ; aucun reçu de bridge, d’identité OAuth ou de sauvegarde réelle |

L’audit GitHub porte sur les commits du dépôt et ne transforme pas les changements non commités en livraison. Le travail local observé inclut une surface à une page avec brief à gauche, aperçu au centre et suggestions à droite, plus un contexte de lancement. Cette version locale n’est ni attribuée, ni committée, ni incluse dans la PR #27. Elle manque encore le catalogue de composants avec démos et glisser-déposer, le transfert `/validate` au chat, ainsi que les scénarios complets de projet/page. La revue du code de ce travail local relève également un défaut de contraste pour certains fonds gris (#757575 et #777777 sous le seuil WCAG AA de 4,5:1).

## Contributions reçues

| Participant | Contribution | Limites |
|---|---|---|
| `/root/trial_readiness` | A décrit le parcours M0 d’après le code et identifié les fonctions qui manquent pour un essai complet. | N’a ni lancé l’application ni testé l’hôte ChatGPT Desktop. |
| `/root/pr27_audit` | A contrôlé le dépôt et la PR #27 en lecture seule, ainsi que les écarts par rapport au cadrage. | Aucun changement GitHub ou Git. |
| `/root/pr27_secret_audit` | A examiné les ajouts textuels du commit et du travail local ; aucun identifiant sensible confirmé. | Les captures binaires n’ont pas eu d’OCR ; la vérification n’est pas une preuve d’absence absolue. |
| `/root/delivery_design_review` | A examiné les captures partagées, l’arbre d’accessibilité local et la surface locale après changement. A confirmé le brief / aperçu / suggestions sur une surface. | Pas de nouvelle comparaison directe dans Figma ; catalogue, animations de démonstration et glisser-déposer toujours absents. |
| `/root/launchcontext_code_review` | A relevé un problème de conservation du contexte de fond qui a été corrigé dans les changements locaux ultérieurs, puis a confirmé la correction et le test E2E associé. | Le défaut de contraste mentionné ci-dessus reste ouvert ; la revue ne prouve pas l’intégration hôte. |
| `/root` | A inspecté le backlog, l’état Git et la PR, relancé les vérifications locales et rédigé ce compte rendu. | N’a pas modifié ni attribué le travail applicatif local découvert. |

## Vérifications et preuves

### Changements locaux non commités

Les contrôles suivants passent sur l’arbre local observé, mais ne s’appliquent pas à la CI du HEAD commité ni ne certifient un essai ChatGPT Desktop :

| Contrôle | Résultat |
|---|---|
| `npm run typecheck` | Réussi |
| `npm run build` | Réussi ; bundle d’environ 2,22 Mo (gzip ~777 Ko), avertissements Vite sur des directives `use client` de dépendances |
| `npm test` | 21/21 réussis |
| `npm run test:m0` | 66/66 réussis après relance avec accès loopback |
| `npm run test:providers` | 28/28 réussis, sans appel à un fournisseur réel |
| `npm run test:e2e` | 25/25 réussis dans Chrome installé, port isolé 4195 |
| `npm run smoke:desktop-plugin` | Réussi : outils MCP et ressource locale présents ; ne démontre pas le fonctionnement dans ChatGPT Desktop |
| `npm run check` | Réussi ; 26 tickets, registre révision 14, 0 éligible |
| `git diff --check` | Réussi |
| Contrats Python (`scripts/check_contracts.py` et unittest) | Non exécutables : le module `jsonschema` n’est pas installé dans cet environnement |
| Audit premium UI strict | Échoue sur un point non résolu : le `<select>` natif de `apps/editor-web/src/model-provider-panel.tsx:21` n’a pas de décision de propriété native/auteur enregistrée |
| Audit des secrets | Aucun secret confirmé dans le texte contrôlé ; une fausse alerte heuristique correspond à un SHA |

Le test E2E couvre notamment la reprise d’un contexte de fond après édition et sauvegarde. Le reviewer a confirmé que le défaut de perte du contexte est corrigé localement. Le contraste calculé par seuil de luminance ne garantit toutefois pas 4,5:1 sur tous les fonds : ce point reste à corriger avant intégration.

### HEAD commité et GitHub

- L’unique PR ouverte trouvée est [PR #27](https://github.com/HotMb/manifest/pull/27), ouverte et en brouillon, sans conflit signalé. Elle contient 27 commits et 143 fichiers modifiés (+12 942 / −158), sans revue soumise ni discussion inline.
- Sa tête est `f95c297` et sa base `main` est `bfb5d8f`. GitHub Actions Quality run 56 réussit sur cette tête committée uniquement.
- La description de la PR fait encore référence à la révision 3 du registre, alors que le dépôt local présente la révision 14. Elle doit être actualisée avant la demande de revue.
- « Mergeable » signifie absence de conflit détectée, pas approbation produit. La PR n’est pas prête à fusionner : le gate ARC-01 n’est pas satisfait.

### Limite de vérification indépendante

Loop-verify a donné PASS 6/6 sur le rapport d’audit après une première passe refusée parce que l’artefact était en anglais. Ce résultat concerne la formulation du rapport initial ; les changements applicatifs non attribués ont été remarqués après cette vérification. Il ne constitue donc pas une approbation de leur code. La limite de deux passes étant atteinte, aucun nouvel appel n’a été fait.

## Écarts fonctionnels et dettes

- **À démontrer pour ARC-01 :** lancement depuis le véritable chat ChatGPT Desktop, bridge et identité, lecture du bon contexte/projet, modification puis sauvegarde authentifiées, capacités réelles de l’hôte.
- **Encore absent de la direction demandée :** recherche de composants/animations à droite, aperçu au survol/clavier/tactile, insertion par glisser-déposer ou action accessible, rapport `/validate` réinjecté dans le chat.
- **Hors preuve de cette livraison :** nouvelles pages et modifications contextualisées de projet, versionnement durable, appel d’un modèle réel.
- DEBT-001 à DEBT-004 restent suivies dans [TECH-DEBT.md](../TECH-DEBT.md). L’avertissement Puck `setData` coûteux mérite une mesure, mais aucune mesure de performance n’a été réalisée ; il n’est pas ajouté comme dette confirmée.

## Actions

| Action | Responsable | Condition de fin |
|---|---|---|
| Tester l’ouverture réelle dans ChatGPT Desktop et fournir une capture ou l’erreur | Utilisateur / commanditaire | Capture sans secret montrant le lancement, l’outil, le contexte chargé et les capacités accessibles |
| Reprendre ARC-01 à partir de cette preuve et qualifier l’identité/bridge | Orchestrateur | Preuve hôte et critères du ticket satisfaits |
| Corriger le contraste dans le travail local et refaire la revue avant de l’attribuer/intégrer | Équipe de développement | Contrastes ≥ 4,5:1 testés sur les gris intermédiaires et vérification de la propriété des changements |
| Actualiser la description de la PR #27 | Orchestrateur | Référence correcte à la révision 14, périmètre et preuves à jour |
| Garder ARC-02/03 et M1 en attente | Orchestrateur | Dépendances débloquées ; `team:next` autorise leur démarrage |

## Synthèse partageable

Le prototype local est accessible à [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Les changements visibles localement ne sont pas commités et ne font pas partie de la PR #27. Les contrôles locaux passent, avec un défaut de contraste à traiter ; la CI verte concerne le HEAD commité antérieur. La PR #27 est la seule PR ouverte, reste en brouillon et n’est pas à fusionner. L’essai réel dans ChatGPT Desktop reste nécessaire pour lever ARC-01.
