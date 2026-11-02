# Manifest — suivi du projet

Mise à jour : **2 novembre 2026**. Le dépôt GitHub est désormais public sous [HotMb/manifest](https://github.com/HotMb/manifest). Branche de travail : `work/arc-01-qualification`. Le nom produit est **Manifest** ; les packages et clés internes historiques `design-workbench` restent inchangés pour préserver la compatibilité.

## Situation actuelle

- Le prototype local comprend l'éditeur React/Puck et la boucle de suggestion MCP. Le nom visible par le transport MCP, le serveur et les logs a été aligné sur Manifest.
- Le dépôt GitHub et ses 26 Issues ont été renommés/référencés sous `HotMb/manifest`. Les Issues restent des miroirs ; `docs/delivery/tickets.json` fait foi pour les états et dépendances.
- La branche `work/arc-01-qualification` est poussée jusqu'au commit `3bf14b9`. Le run `Quality` 24 du commit précédent `ee9ec5d` est **en échec** à l'étape `Browser qualification tests` ; les étapes précédentes listées par GitHub ont réussi, et la cause n'est pas encore diagnostiquée. Le run `Quality` 26 du HEAD `3bf14b9` est **en cours** au dernier contrôle ; ne pas annoncer un PASS avant sa conclusion.
- Le registre est en révision **3**. **ARC-01 est bloqué** jusqu'à l'essai dans le vrai hôte ChatGPT et la preuve d'identité réelle. `npm run team:next` indique **0 ticket éligible** ; ARC-02 et la suite ne démarrent donc pas.
- Les agents frontend et backend ont relu cette porte de sortie avant de changer uniquement leurs libellés d'application. Leur travail de nommage n'avance ni ne clôture ARC-01.

## Revue du code de nommage

- L'adaptateur d'hôte publie le nom `Manifest` au client MCP. Vérification rapportée par l'agent frontend : typecheck, 16 tests d'adaptateur et `git diff --check` réussis.
- Le serveur MCP annonce `manifest-m0`, les logs annoncent Manifest et le realm HTTP est `manifest-m0`. Vérification rapportée par l'agent backend : `npm run test:m0` **52/52**, typecheck et `git diff --check` réussis.
- Le garde-fou exigeant un store partagé par le serveur MCP et les suggestions reste en place ; les changements concurrents ont été préservés.
- Ces résultats couvrent le code local et ses tests. Ils ne prouvent pas l'intégration dans l'application ChatGPT ni l'identité OAuth.

## Produit et livraison

Manifest vise un éditeur embarqué où l'utilisateur décrit sa page, observe une proposition après une pause, modifie la demande et voit l'aperçu réagir, puis valide une version et transmet un rapport compréhensible au modèle hôte. L'API du fournisseur choisi est appelée côté backend. Les intégrations natives multi-fournisseurs et la 3D sont prévues par étapes.

Le prototype reste un outil de qualification : stockage serveur en mémoire, aucun OAuth de production, aucune persistance multi-utilisateur ni export de code complet. L'appel fournisseur réel et le vrai hôte ChatGPT ne sont pas encore éprouvés. Les commandes de l'équipe n'appellent pas d'API payante par défaut.

## Vérifications récentes du prototype

- 52 tests M0, 24 tests fournisseurs et 8 E2E navigateur ont été rapportés réussis sur les incréments précédents ; typecheck et build réussis.
- `npm test` avait 20 réussites et un cas ignoré faute de droit de création de lien symbolique sous Windows.
- Les deux passes loop-verify précédentes sur le code M0 étaient en échec ; les défauts relevés ont reçu des corrections et des tests ciblés, mais aucun PASS global n'est revendiqué.
- Pour ce renommage, les deux tentatives loop-verify ont aussi rendu FAIL : la seconde a validé 4 critères sur 5 et demandé une preuve explicite des liens dans chaque Issue. L'audit direct des 26 Issues a ensuite confirmé le lien `HotMb/manifest`, le bandeau Manifest et l'absence de l'ancien slug dans chacune ; aucune troisième tentative n'a été effectuée selon la limite du skill.
- La revue complète de l'hôte ChatGPT, des capacités hôte réelles, de l'identité et de l'appel facturable reste à effectuer.

## Prochaine action

Préparer un compte de test autorisé et l'accès à l'hôte ChatGPT demandé, puis exécuter et documenter ARC-01 dans `docs/design/M0-REVIEW.md` et `docs/evidence/ARC-01/`. Une fois les critères réels établis, l'orchestrateur rouvre ou fait avancer le ticket avec le CLI du backlog et sa révision attendue. ARC-02 démarre après clôture prouvée d'ARC-01. Aucun agent ne doit contourner ces dépendances ; tant que l'hôte n'est pas disponible, la prochaine action attend l'accès et les preuves nécessaires.

## Reprendre le travail

Dans ce dépôt, relire `AGENTS.md`, ce fichier, `docs/delivery/ORCHESTRATION.md`, puis lancer `npm run team:status` et `npm run team:next`. `npm run team:start` ouvre une nouvelle session Codex pour l'orchestration ; les agents ne continuent pas après sa fermeture. Voir aussi [le tableau des tickets](delivery/BOARD.md), [leur correspondance GitHub](delivery/GITHUB.md), [la revue de l'incrément local](meetings/2026-11-02-MANIFEST-live-suggestions.md) et [les dettes techniques](TECH-DEBT.md).
