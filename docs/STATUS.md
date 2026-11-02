# Manifest — suivi du projet

Mise à jour : **2 novembre 2026**. Le dépôt GitHub est désormais public sous [HotMb/manifest](https://github.com/HotMb/manifest). Branche de travail : `work/arc-01-qualification`. Le nom produit est **Manifest** ; les packages et clés internes historiques `design-workbench` restent inchangés pour préserver la compatibilité.

## Situation actuelle

- Le prototype local comprend l'éditeur React/Puck et la boucle de suggestion MCP. Le nom visible par le transport MCP, le serveur et les logs a été aligné sur Manifest.
- Le dépôt GitHub et ses 26 Issues ont été renommés/référencés sous `HotMb/manifest`. Les Issues restent des miroirs ; `docs/delivery/tickets.json` fait foi pour les états et dépendances.
- Les runs `Quality` 24 et 26 avant correction échouaient à `Browser qualification tests` : 7/8 E2E passaient, le parcours de reprise d'un brouillon expiré attendait le bouton « Réglages du bloc » pendant 30 s. La trace Linux montrait que `openSettings` choisissait ce contrôle mobile à partir d'une vérification instantanée de visibilité alors que l'éditeur sortait encore de l'écran de reprise ; ce bouton est masqué au-dessus de 767 px. La correction par viewport est poussée au commit `36253c5`. Les runs Linux `Quality` #33 et #34 sur ce commit réussissent tous deux : 8/8 E2E chacun, parcours expiré en 2,4 s et 3,1 s, jobs complets en succès. La correction est donc passée deux fois en CI ; la répétition ciblée x10 recommandée reste à faire. Les essais ciblés locaux n'ont produit aucun rapport après environ 60 s (un essai) et 70 s (répétition x10 sous `CI=true`) ; ils ont été interrompus et ne sont comptés ni comme réussite ni comme échec.
- Le registre est en révision **3**. **ARC-01 est bloqué** jusqu'à l'essai dans le vrai hôte ChatGPT et la preuve d'identité réelle. Le 2 novembre, un client SDK a lancé le processus MCP stdio réel et lu sa ressource UI (4 outils de base, `open_designer` réussi, HTML `text/html;profile=mcp-app` de 2 198 119 octets). Cela prouve le processus local, pas le rendu ChatGPT. `tunnel-client` et `CONTROL_PLANE_API_KEY` sont absents ; le plan/workspace, les permissions et le tunnel n'ont pas été vérifiés. Le commanditaire maintient la cible ChatGPT desktop. Les sources documentent les Site Tools/WebMCP dans le navigateur intégré ; le dépôt n'a pas encore cet adaptateur. Le plugin desktop local stdio est une autre voie, mais exige allowlist de partenaire et identité développeur/entreprise. Voir [la preuve d'accès et les options desktop](evidence/ARC-01/host-attempt-2026-11-02.md) et [le compte rendu](meetings/2026-11-02-ARC-01-host-attempt.md). `npm run team:next` indique **0 ticket éligible** ; ARC-02 et la suite ne démarrent donc pas.
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
- `npm run check`, `npm run typecheck` et `git diff --check` réussissent après l'ajustement du helper E2E. Les runs Linux `Quality` #33 et #34 sur `36253c5` passent toutes leurs étapes : 8/8 E2E chacun, dont la reprise du brouillon expiré, et validations de contrats ensuite. La répétition ciblée x10 n'a pas été confirmée localement.
- Les deux passes loop-verify sur ce suivi ont rendu FAIL : la première n'avait pas le compte rendu et les statuts détaillés ; la seconde n'avait pas le code du helper. La limite de deux tentatives est atteinte ; aucun PASS global n'est revendiqué. Le diff du helper a été relu séparément par un agent Test Automation Engineer.
- Les deux passes loop-verify précédentes sur le code M0 étaient en échec ; les défauts relevés ont reçu des corrections et des tests ciblés, mais aucun PASS global n'est revendiqué.
- Pour ce renommage, les deux tentatives loop-verify ont aussi rendu FAIL : la seconde a validé 4 critères sur 5 et demandé une preuve explicite des liens dans chaque Issue. L'audit direct des 26 Issues a ensuite confirmé le lien `HotMb/manifest`, le bandeau Manifest et l'absence de l'ancien slug dans chacune ; aucune troisième tentative n'a été effectuée selon la limite du skill.
- Pour la revue de tentative hôte du 2 novembre, la première passe loop-verify a échoué uniquement sur la provenance durable des contributions d'agents ; le compte rendu a été complété par [leurs retours archivés](evidence/ARC-01/review-2026-11-02.md). La seconde et dernière passe a réussi 5/5 critères ; aucun autre PASS d'hôte ou d'identité n'en découle.
- Pour l'addendum desktop/WebMCP du 2 novembre, la relecture loop-verify a réussi 5/5 critères. Elle vérifie le compte rendu et les limites déclarées, pas la disponibilité réelle des Site Tools dans le compte du commanditaire.
- La revue complète de l'hôte ChatGPT, des capacités hôte réelles, de l'identité et de l'appel facturable reste à effectuer. La documentation OpenAI actuelle demande un MCP distant ou Secure MCP Tunnel pour relier un serveur local ; le chemin de tunnel exige un tunnel_id, une clé runtime locale et les permissions de l'organisation/workspace. Aucun prérequis du compte n'a été vérifié ni modifié dans cette tentative.

## Prochaine action

La cible desktop est confirmée. Demander au commanditaire un contrôle manuel, sans mutation, de la disponibilité WebMCP dans le navigateur intégré : ouvrir l'exemple officiel Webroom et vérifier l'icône Site Tools ainsi que l'outil de lecture d'état. Si disponible, proposer un spike d'adaptateur WebMCP et réviser les critères ARC-01 avant le code. Le champ Manifest et l'aperçu peuvent être réactifs dans la page, mais le déclencheur natif `/manifest` et le retour `/validate` ne sont pas encore garantis par cette voie. Sinon, vérifier l'éligibilité de l'organisation à l'allowlist requise pour un plugin local stdio. Ne pas modifier l'état du ticket avant les preuves réelles et ne pas démarrer ARC-02.

## Reprendre le travail

Dans ce dépôt, relire `AGENTS.md`, ce fichier, `docs/delivery/ORCHESTRATION.md`, puis lancer `npm run team:status` et `npm run team:next`. `npm run team:start` ouvre une nouvelle session Codex pour l'orchestration ; les agents ne continuent pas après sa fermeture. Voir aussi [le tableau des tickets](delivery/BOARD.md), [leur correspondance GitHub](delivery/GITHUB.md), [la revue de l'incrément local](meetings/2026-11-02-MANIFEST-live-suggestions.md) et [les dettes techniques](TECH-DEBT.md).
