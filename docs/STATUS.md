# Manifest — suivi du projet

Mise à jour : **4 novembre 2026**. Référence GitHub : [HotMb/manifest](https://github.com/HotMb/manifest). Le code applicatif vérifié est `f354c2c` ; le checkpoint GEN-03/04 a été poussé dans `b76f025` sur la branche de la PR #27. La PR reste ouverte en brouillon, non fusionnée. GitHub Actions **Quality #94 réussit sur `f354c2c` et Quality #96 sur `b76f025`**. Le registre `docs/delivery/tickets.json` reste à la **révision 55** ; `BOARD.md` en est la vue générée. Les anciens comptes rendus ci-dessous reflètent leur date/révision d’origine.

## État courant — HOTFIX-01 — 4 novembre

- **HOTFIX-01 — terminé, révision 55 :** le champ de description utilise la demande explicite du chat; la proposition déjà formulée par l’assistant est un repli si aucune demande utilisateur n’est transmise. Sans contenu transmis, l’ouverture garde le canevas blanc et le brief vide. Un projet enregistré ne se transforme pas en modèle de démonstration.
- **Hauteur et responsive :** l’atelier est limité à un viewport, sans défilement global. À partir de 560 px, trois zones restent visibles et leurs contenus défilent dans les panneaux; en dessous, l’utilisateur passe entre Décrire, Aperçu et Suggestions sur la même page. Voir [les captures](evidence/HOTFIX-01/implementation.md).
- **Vérifications locales du 4 novembre :** E2E complets 43/43, M0 75/75, fournisseurs 31/31, catalogue 15/15, typecheck, build, backlog et contrôle du diff réussis. Les tests utilisent des fournisseurs simulés ; ils ne constituent pas une génération API réelle. Un avertissement Puck `setData` et des avertissements de build Vite sur des dépendances tierces restent visibles sans échec associé.
- **Revue :** code reviewer et QA n’ont relevé aucun P0–P2 dans les contextes valides. Le contrôle `loop-verify` n’a pas rendu de PASS global dans sa limite d’appels; il a traité un cas `userRequest` vide/`undefined` injecté directement, impossible avec le contrat MCP, et ce test artificiel a été retiré. Voir [la revue indépendante](evidence/HOTFIX-01/review.md) et [la réunion](meetings/2026-11-04-HOTFIX-01-review.md).
- **GitHub :** PR #27 reste ouverte en brouillon et aucun merge n’a eu lieu. GitHub Actions **Quality #96 réussit sur le checkpoint `b76f025`** ; Quality #94 réussit sur le code testé `f354c2c`. Quality #86 sur `4d3c222` est historique.
- **ARC-01 reste bloqué pour l’hôte réel :** captures locales et transport simulé ne prouvent ni l’identité ni l’ouverture/la modification dans ChatGPT Desktop. Cette qualification demeure à faire séparément.

## État antérieur — reprise du 4 novembre

Les points ci-dessous documentent les incréments précédents et leurs références historiques.

- **GEN-01 — terminé :** l’analyse automatique démarre après 1,5 s et le candidat dashboard avec nuages/graphiques se met à jour sans sauvegarde implicite. Les tests couvrent les directions, la vitesse, l’IME, l’invalidation, reduced-motion et le seuil exact. Le ticket est clos en révision 34 après approbation QA. Voir la [preuve d’implémentation](evidence/GEN-01/implementation.md), la [revue QA](evidence/GEN-01/review.md) et le [compte rendu](meetings/2026-11-04-GEN-01-reactive-preview-review.md).
- **GEN-02 — en cours :** le renderer accepte maintenant `composed@2.0.0` avec opacité, translations X/Y, échelle, rotation et flou en pistes numériques bornées. Le smoke du serveur Vite vérifie le montage sans overlay, erreur console ou réponse HTTP en échec. Le typecheck, le build, les 15 tests catalogue et les 43 tests E2E passent sur le HEAD observé. GEN-02 reste **REVISE** pour provenance/licence, hash de source, mesure de coût et audit d’admission des bibliothèques. Ticket non soumis ni clôturé ; GEN-03/04 restent dépendants de cette livraison.
- **GEN-03 — travail partiel, ticket non éligible :** la sélection fournisseur/modèle, les états près du brief, le debounce de 1 500 ms, l’annulation et les propositions structurées passent les E2E avec transports simulés. Aucun fournisseur réel n’a été appelé : les variables runtime fournisseur sont absentes. Le runtime actuel couvre uniquement le protocole OpenAI-compatible pour `openai`, `deepseek` et `custom`, pas les adaptateurs natifs Anthropic ou Google. Le transfert `/validate` reste explicite vers l’hôte ; l’aperçu live dépend d’une API configurée côté serveur.
- **GEN-04 — travail partiel, ticket non éligible :** le navigateur Chromium rend le dashboard synthétique, les nuages, les graphiques et les animations du catalogue ; les tests vérifient les mises à jour après debounce, les changements de vitesse, les propositions simulées et les vues mobiles. Le modèle ne reçoit que le brief, le Snapshot et les capacités du catalogue : il ne reçoit ni capture, ni DOM calculé. L’inspection visuelle réelle inspirée d’Unslop, la génération réelle par API et les limites explicites sur une réponse live restent à démontrer.
- **Validation locale et distante :** sur `f354c2c`, `npm run test:e2e` passe **43/43**, dont le debounce modèle exact à 1 500 ms, le choix requis parmi plusieurs modèles et le changement de source ; tous les transports modèle de cette suite sont simulés. `npm run test:catalog` 15/15, `npm run test:providers` 31/31, `npm run test:m0` 75/75, `npm run typecheck`, `npm run build`, `npm run check` et `git diff --check` réussissent. La première exécution sandboxée de `test:m0` a été refusée au loopback ; la relance locale autorisée passe 75/75. **Quality #94 sur `f354c2c` et Quality #96 sur le checkpoint `b76f025` réussissent.** Le build produit un HTML autonome de 2,29 Mo (793,75 Ko gzip) et conserve les avertissements Rolldown `use client`. Playwright affiche aussi l’avertissement Puck `setData` potentiellement coûteux, sans échec ni mesure de performance.
- **Orchestration :** GEN-02 reste le seul ticket actif ; `team:next` confirme qu’aucun ticket neuf n’est éligible à la révision 55. GEN-03/04 restent dépendants de GEN-02. ARC-01 est ordonné après GEN-03/04 afin de vérifier le flux live complet dans ChatGPT Desktop. La PR #27 reste en brouillon et non fusionnée.
- **ARC-01 reste bloqué** tant qu’ouverture, identité, lecture/écriture et rafraîchissement ne sont pas prouvés dans ChatGPT Desktop. Le skill `computer-use` interdit explicitement d’automatiser l’interface ChatGPT Desktop, même après autorisation ; l’ouverture via l’outil Manifest local confirme seulement un brouillon M0 en mémoire, sans IA ni révision approuvée. La preuve hôte reste à faire manuellement ; aucune fusion de la PR #27 n’est autorisée par les critères actuels.

## Historique au 3 novembre (conservé)

Les paragraphes ci-dessous décrivent l’état antérieur à la reprise du 4 novembre ; ils sont conservés pour retracer les constats et décisions précédents.

## État du 3 novembre

- **Vérification du flux réactif — 3 novembre :** le brief du fil partagé arrive bien, mais l’analyse automatique est décochée au départ et remise à `false` à chaque lancement. Après activation, les règles locales ne savent pas transformer le brief libre de dashboard/nuages en composants ; une piste requiert un clic pour modifier ou prévisualiser le canevas. Le contrat M0 ne sait rendre qu’un Hero, et aucun E2E ne couvre positivement le parcours automatique complet. Les tentatives E2E ciblées n’ont pas produit de résultat avant leur interruption ; aucun PASS n’est revendiqué. Voir [l’audit du code](evidence/MANIFEST-reactive-input-audit-2026-11-03.md) et [sa revue](meetings/2026-11-03-MANIFEST-reactive-input-review.md). Aucun fichier applicatif ou statut de ticket n’a changé ; `team:next` reste à zéro et ARC-01 reste bloqué.

- **Affichage de l’atelier — correction locale du 3 novembre :** sur ordinateur, Manifest est borné à la hauteur de la fenêtre ChatGPT. Brief, aperçu et suggestions restent sur la même surface ; le défilement se fait dans les panneaux latéraux et dans le canevas. La compilation, le typecheck et la revue visuelle indépendante à 1280×720 passent. Sous 768 px, la disposition mobile empile encore les panneaux. Voir le [compte rendu](meetings/2026-11-03-MANIFEST-viewport-fit-review.md) et la [preuve locale](evidence/MANIFEST-viewport-fit-2026-11-03.md). Aucun ticket n’a été modifié : `team:next` indique zéro ticket actif éligible.

- **ARC-01 : bloqué** après livraison et revue du sous-ensemble local. Il reste à prouver le parcours dans ChatGPT Desktop, le bridge et l’identité OAuth, l’actualisation, les capacités d’hôte et une modification réelle. Voir [l’audit de disponibilité et des PR du 3 novembre](meetings/2026-11-03-ARC-01-delivery-review.md), le [compte rendu du lot local](meetings/2026-11-03-ARC-01-review.md) et la [preuve d’implémentation locale](evidence/ARC-01/implementation-2026-11-03.md).
- La release privée 0.1.3 est confirmée comme courante. Le smoke stdio, les tests du bridge local, l’authentification Bearer de développement et le préremplissage simulé passent ; aucun n’établit un rendu dans ChatGPT Desktop ou une identité OAuth. Voir les [preuves bridge et identité](evidence/ARC-01/bridge-identity-proof-2026-11-03.md).
- `npm run team:next` doit afficher **0 nouveau ticket éligible**. ARC-02 dépend de la fin d’ARC-01. Ne pas contourner ce prérequis.
- Le cadrage de la direction Figma a été précisé le 3 novembre : une seule surface de travail, brief/proposition à gauche, candidat modifiable au centre et recherche catalogue à droite ; pas de navigation par étapes ni de page séparée de réglage de bloc. L’incrément ARC-01 de cette branche ajoute un champ de recherche et sept démos codées en dur. Ce n’est pas le catalogue versionné avec ajout/glisser-déposer, et le transfert `/validate` manque. Le canevas et les autres critères restent soumis aux tickets et au gate ARC-01.

## Cadrage enregistré en révision 14

- Le lancement attendu distingue nouveau projet, nouvelle page dans un projet existant et modification d’une page existante ; il transmet la cible/version et la proposition déjà formulée par ChatGPT. Les Snapshots existants sont relus, un candidat est contrôlé contre sa version de base et reste éditable avant conservation. Un texte seul préremplit le champ mais ne lance pas de modèle avant activation automatique ou action manuelle. Manifest ne lit jamais le texte non envoyé du compositeur natif.
- Le champ principal sert au brief et à ses modifications réactives ; le catalogue à droite reste une recherche distincte, locale et sans appel de modèle. Survol, clavier et toucher permettent de voir les démonstrations sans modifier la page ; l’ajout reste une action explicite.
- L’intention de données est conservée dans `Snapshot.dataIntegrationSpecs` et suit la version du brouillon et la révision approuvée. `/validate` doit transmettre au modèle hôte cette spécification non secrète (source/référence, schéma, liaisons aux graphiques, transformations, rafraîchissement, aperçu synthétique/connecté et prérequis d’autorisation). Cela explique à ChatGPT l’intégration souhaitée ; le rapport ne confère pas lui-même l’accès et n’emporte aucun secret ou ligne sensible.
- Ces décisions sont inscrites dans le cadrage et les critères de UX-01, UI-01, UI-02, UI-03, DOM-01, DOM-02, AI-02, REV-01 et TEST-01. Elles sont à construire après levée des dépendances ; elles ne constituent pas une preuve d’implémentation. Les schémas JSON exécutables et les capacités réelles de l’hôte restent à aligner/qualifier par les tickets concernés.

## Ce qui est livré dans la tranche locale

- Champ principal décrivant la page et ses mouvements ; proposition manuelle ou analyse après activation, avec une pause de 1,5 s. Les propositions locales et le simulateur sont prévisualisés avant conservation.
- Ajout manuel d’une section M0, annuler/rétablir, sauvegarde navigateur et affichage mobile.
- Ajustements de hiérarchie, ouverture directe à 375 px dans l’étape Décrire, disparition du message vide sous un candidat et contraste des champs Puck vérifié à ≥ 4,5:1.
- Le plugin privé ChatGPT Desktop a la release courante **0.1.3** (scope utilisateur, visibilité privée). Son paquet local passe le smoke MCP stdio ; son rendu réel dans l’hôte reste à observer. Voir la [revue du rafraîchissement](meetings/2026-11-03-ARC-01-plugin-refresh-review.md), la [preuve du paquet](evidence/ARC-01/plugin-refresh-2026-11-03.md) et les [preuves bridge/identité](evidence/ARC-01/bridge-identity-proof-2026-11-03.md).
- Les détails de compatibilité, résultats et limites figurent dans la [preuve datée](evidence/ARC-01/implementation-2026-11-03.md) et la [comparaison explicite à la maquette](evidence/ARC-01/figma-alignment-2026-11-03.md). Les références Figma antérieures restent dans [la revue de direction](meetings/2026-11-02-MANIFEST-design-direction.md).

## Ce qui n’est pas encore livré

- Le vrai catalogue versionné à droite avec provenance/licence et l'ajout par glisser-déposer ou action accessible restent absents. Une recherche locale avec sept exemples/démos est visible, mais elle n’insère rien au canevas : UX-01/UI-01/UI-02/CAT-01/CAT-02.
- Le LaunchContext à trois opérations (nouveau projet, nouvelle page, modification de page) avec proposition de l’assistant et candidat/version, puis le comportement associé : UI-03/AI-02.
- La pièce jointe de référence sous le champ principal, la spécification d’intégration des données dans le rapport, `/validate` avec accusé et transmission au chat : UI-02/AI-02/REV-01.
- La création/modification générale de projets, plusieurs pages, un export d’application complète et un modèle réel. Le prototype actuel est borné à un projet/page et zéro ou un Hero ; aucun fournisseur n’a été appelé dans cette tranche.
- Le rendu final dans ChatGPT Desktop et la matrice de capacités réelles restent à vérifier. Le badge « WebMCP unavailable » observé précédemment n’est pas remplacé par une preuve de réussite.

Les tâches M1 sont encore `todo` en raison de leurs dépendances. L’absence de recherche catalogue n’est pas maquillée par un champ local factice ; ses critères sont dans UI-02/CAT-02 et l’architecture approuvée.

## Vérifications exécutées

| Vérification | Résultat |
|---|---|
| E2E navigateur | **28/28 réussis**, dont contexte de lancement, aperçu de fond, recherche, canevas vide, mobile et sauvegarde ; adaptateur d’hôte simulé |
| M0 backend/MCP/adaptateurs/jobs | **66/66 réussis** avec loopback local autorisé ; couvre stdio/MCP et le Bearer de développement |
| Fournisseurs et simulateur | **28/28 réussis**, aucun appel à une API de modèle |
| Tests UI du propriétaire frontend | **14 réussis** |
| `npm test` | **20 réussis, 1 ignoré** faute de droit de création de lien symbolique sous Windows |
| Typecheck, build/package, smoke stdio, `npm run check`, `git diff --check` | réussis ; les avertissements Vite/Puck sont documentés. L’audit UI strict antérieur conserve ses findings listés plus bas. |
| Contrats Python | non exécutés : `jsonschema` est absent de cet environnement |

Une revue indépendante du code M0 et une revue design sur la capture finale ont été réalisées. Le compte rendu distingue les captures et simulateurs locaux de l’environnement hôte réel.

L’audit de disponibilité du 3 novembre a relancé les tests backend et navigateur avec l’accès loopback requis, vérifié le smoke MCP et interrogé l’inventaire complet des PR ouvertes. GitHub Actions Quality run 56 est vert sur le HEAD commité `f95c297`. L’inventaire ne contient qu’une PR ouverte, la #27, encore en brouillon ; sa description renvoie à l’ancienne révision 3 au lieu du registre 14. Au moment de ce premier contrôle, la provenance de changements applicatifs locaux n’était pas établie ; la revue de réalisation suivante les attribue à `/root`, `/root/handoff` et `/root/design_review`. Ils ne font pas partie de la PR ni de la CI verte. La relance locale passe le typecheck, le build, 20 tests généraux (1 ignoré), 66 tests M0, 28 tests providers, 25 tests E2E, le smoke MCP et `npm run check`. Dans l’interpréteur Python courant, les contrats n’ont pas pu être relancés, faute de `jsonschema`. L’audit UI strict signale aussi un propriétaire non défini pour un `<select>` natif dans le panneau fournisseur/modèle. Le code reviewer relève un contraste insuffisant pour certains fonds gris. Voir la [preuve d’audit](evidence/ARC-01/delivery-readiness-2026-11-03.md), la [revue d’équipe d’audit](meetings/2026-11-03-ARC-01-delivery-review.md) et le [correctif local espace unique](meetings/2026-11-03-ARC-01-single-workspace-review.md).

La relecture loop-verify a passé 6/6 critères sur le rapport d’audit en français avant que les changements applicatifs locaux non attribués ne soient découverts. Ce résultat porte sur le rapport initial, pas sur ce code local, et ne remplace pas la preuve d’exécution dans ChatGPT Desktop ni ne lève ARC-01. La revue ARC-01 précédente conserve séparément son résultat historique.

La relecture loop-verify a utilisé ses deux passes : la seconde a validé 4/5 critères, mais le paquet omettait le fichier de dettes contenant DEBT-004. Aucun PASS global n’est revendiqué ; la limite de tentatives est atteinte.

## Dettes et risques suivis

- DEBT-001 à DEBT-004 restent ouvertes dans [TECH-DEBT.md](TECH-DEBT.md), chacune liée à son propriétaire et jalon.
- Puck émet pendant les parcours un avertissement `setData` coûteux ; il n’a pas causé d’échec mais nécessite une mesure avant d’optimiser. Ce n’est pas encore une dette validée ni une mesure de performance.
- Le premier déploiement du test M0 sans autorisation locale a échoué `EACCES`; son rerun autorisé a réussi 64/64. Le problème concernait l’accès réseau loopback du banc de test, pas une requête fournisseur.

## Prochaine action

Dans ChatGPT Desktop, ouvrir Manifest avec le build poussé, vérifier l’ouverture depuis le chat, le chargement du projet et la lecture authentifiée, puis tenter une modification et relever les capacités visibles. Fournir une capture du résultat ou de l’erreur ; ne pas inclure de jeton ou secret. L’ARC-01 pourra être réouvert par l’orchestrateur à partir de cette preuve. Après obtention, terminer la matrice hôte/identité avant de démarrer ARC-02.

## Reprendre

Relire `AGENTS.md`, ce fichier et [ORCHESTRATION.md](delivery/ORCHESTRATION.md), puis lancer `npm run team:status` et `npm run team:next`. Voir [le tableau généré](delivery/BOARD.md), [la correspondance GitHub](delivery/GITHUB.md), [le compte rendu de fin de tâche](meetings/2026-11-03-ARC-01-review.md) et [les dettes](TECH-DEBT.md).


## Correctif espace unique et lancement — 3 novembre 2026

La modification locale est attribuée à `/root`, avec `/root/handoff` et `/root/design_review`. Le paquet privé Manifest 0.1.2 a été actualisé : surface unique, demande explicitement transmise au brief et aperçu noir exact, conservation/abandon/reprise vérifiés. [Revue et preuves](meetings/2026-11-03-ARC-01-single-workspace-review.md). Le code reste non commité et n’a pas été poussé ; un commit de suivi documentaire seul (`8d54f58`) a été poussé ensuite. Le schéma de l’outil encore chargé dans ce chat reste celui de l’ancienne release ; rechargement hôte à qualifier. Une relance de l’audit strict trouve un Select natif sans décision de propriété documentée, et les tons gris intermédiaires du fond restent sous 4,5:1 ; ces points empêchent de considérer le correctif comme prêt à intégrer. ARC-01 et les dépendances restent bloqués.


Ajout local du champ de recherche à droite : sept exemples de composants/animations, démos locales et filtre indépendant du brief. La revue fraîche confirme que l’essai couvre la recherche/démo mais pas l’insertion au canevas ni le vrai hôte. 28 E2E, 66 M0, 28 providers, typecheck, build et smoke réussis ; `npm test` 20/1 ignoré, `npm run check` et `git diff --check` réussis. Contrats Python indisponibles faute de `jsonschema`. L’audit UI strict trouve encore `ownership.native-select-undecided` dans `model-provider-panel.tsx:21` ; le bouton « Rejouer l’animation » est sans effet quand le mouvement est réduit. Voir la [revue](meetings/2026-11-03-ARC-01-component-examples-review.md) et la [preuve](evidence/ARC-01/component-examples-2026-11-03.md). PR #27 : run 60 vert sur le HEAD commité `97e9b97`, qui ne contient pas ce code local. Le vérificateur supplémentaire n’a pas produit de verdict exploitable sur deux essais antérieurs. Qualification hôte, registre révision 14 et gate ARC-01 inchangés.
