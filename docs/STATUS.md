# Manifest — suivi du projet

Mise à jour : **2 novembre 2026**. Le dépôt GitHub est désormais public sous [HotMb/manifest](https://github.com/HotMb/manifest). Branche de travail : `work/arc-01-qualification`. Le nom produit est **Manifest** ; les packages et clés internes historiques `design-workbench` restent inchangés pour préserver la compatibilité.

## Situation actuelle

### Direction de conception validée

Le commanditaire a validé le 2 novembre le parcours montré dans les captures. Les documents de référence décrivent maintenant : carte « Ouvrir Manifest » dans le chat avec mention explicite comme voie fiable ; éditeur à trois zones (intention / aperçu / suggestions) ; délai unique de 1,5 s ; cartes de suggestions avec provenance et états distincts ; rapport lié à une révision, relu puis transmis au chat par action explicite. Voir le [brief de conception](design/CONCEPTION.md), le [contrat UX](../UX-CONTRACT.md), l'[addendum de livraison](spec/DELIVERY.md), la [revue de direction](meetings/2026-11-02-MANIFEST-design-direction.md) et la [preuve documentaire](evidence/MANIFEST/design-direction-2026-11-02.md).

Cette mise à jour porte sur le cadrage ; elle n'implémente pas le nouveau layout et ne prouve ni la commande slash native, ni la transmission de messages depuis l'hôte. L'état des tickets reste inchangé : ARC-01 est bloqué sur la qualification Desktop réelle et `npm run team:next` n'a aucun ticket éligible. La revue a aussi repéré que le rapport M0 lit le fournisseur/modèle sélectionné au moment de sa production et calcule « à jour » avec des critères différents de l'aperçu. Rattacher la provenance au job/proposal et unifier le prédicat d'éligibilité avant la première transmission réelle ; le propriétaire frontend devra intégrer ce défaut au ticket de correction éligible.

### Prototype et blocages

- Le prototype local comprend l'éditeur React/Puck et la boucle de suggestion MCP. Le nom visible par le transport MCP, le serveur et les logs a été aligné sur Manifest.
- Le dépôt GitHub et ses 26 Issues ont été renommés/référencés sous `HotMb/manifest`. Les Issues restent des miroirs ; `docs/delivery/tickets.json` fait foi pour les états et dépendances.
- Les runs `Quality` 24 et 26 avant correction échouaient à `Browser qualification tests` : 7/8 E2E passaient, le parcours de reprise d'un brouillon expiré attendait le bouton « Réglages du bloc » pendant 30 s. La trace Linux montrait que `openSettings` choisissait ce contrôle mobile à partir d'une vérification instantanée de visibilité alors que l'éditeur sortait encore de l'écran de reprise ; ce bouton est masqué au-dessus de 767 px. La correction par viewport est poussée au commit `36253c5`. Les runs Linux `Quality` #33 et #34 sur ce commit réussissent tous deux : 8/8 E2E chacun, parcours expiré en 2,4 s et 3,1 s, jobs complets en succès. La correction est donc passée deux fois en CI ; la répétition ciblée x10 recommandée reste à faire. Les essais ciblés locaux n'ont produit aucun rapport après environ 60 s (un essai) et 70 s (répétition x10 sous `CI=true`) ; ils ont été interrompus et ne sont comptés ni comme réussite ni comme échec.
- Le registre est en révision **3**. **ARC-01 est bloqué** jusqu'à l'essai dans le vrai hôte ChatGPT et la preuve d'identité réelle. La capture Webroom du commanditaire affiche **« WebMCP unavailable »** dans cette session/page. Pour continuer sans WebMCP, un package local privé ChatGPT Desktop a été construit et enregistré en version `0.1.0` via Plugin Creator; aucune soumission publique n'a été faite. Son serveur stdio empaqueté passe le smoke test local et le SDK retourne l'UI `text/html;profile=mcp-app`, mais rien ne prouve encore le démarrage du processus ou le rendu dans ChatGPT Desktop. La lecture d'`open_designer` dans ce contexte Codex confirme uniquement la disponibilité du tool. Voir [la preuve plugin Desktop](evidence/ARC-01/desktop-plugin-2026-11-02.md), [la tentative d'accès hôte](evidence/ARC-01/host-attempt-2026-11-02.md) et [la revue précédente](meetings/2026-11-02-ARC-01-host-attempt.md). `npm run team:next` indique **0 ticket éligible** ; ARC-02 ne démarre pas.
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
- Pour la piste plugin local, le package a été construit et testé depuis son propre bundle. Le fichier privé enregistré est présent dans Plugin Creator; le smoke local a découvert quatre outils, ouvert le projet M0 et lu la ressource HTML de la vue. Ces vérifications ne remplacent pas le contrôle manuel de ChatGPT Desktop. Aucun modèle fournisseur n'a été appelé.
- La relecture `loop-verify-review` de cette livraison a été scindée en trois parties (package, preuve/statut, compte rendu) ; les trois ont reçu PASS, 3/3 critères chacune. Le vérificateur est de la lignée Codex/OpenAI et ne fournit aucune preuve de rendu dans l'hôte.
- Pour l'alignement des captures approuvées, la première relecture loop-verify a échoué sur trois précisions documentaires, ensuite ajoutées (références des trois écrans, exclusion des suggestions incompatibles/non licenciées, preuve d'éligibilité et hash canonique). La deuxième réponse ne contenait pas de verdict parseable ; la limite de deux passes est atteinte, aucun PASS de cette revue n'est revendiqué. Les contrôles locaux de documentation et du registre passent ; aucune validation runtime n'a été effectuée.
- La revue complète de l'hôte ChatGPT, des capacités réelles, de l'identité et d'un appel fournisseur reste à effectuer. Les connexions MCP personnalisées sans plugin local utilisent un endpoint distant ou Secure MCP Tunnel; le package privé Desktop est une voie locale distincte. Aucun droit du compte/workspace ni environnement d'exécution Desktop n'a été qualifié.

## Prochaine action

Le commanditaire doit ouvrir **ChatGPT Desktop**, démarrer une nouvelle conversation exécutée localement, taper `@`, choisir Manifest, puis envoyer « Ouvre l'éditeur Manifest ». La sélection seule n'ouvre pas la vue. Si l'outil ou l'éditeur n'apparaît pas, envoyer une capture de cette tentative pour isoler le prochain blocage. Ne pas modifier l'état du ticket avant la preuve hôte/identité et ne pas démarrer ARC-02. L'alias natif `/manifest`, l'observation du texte non envoyé du compositeur et les suggestions LLM réelles restent à qualifier séparément. Voir [la revue du plugin local](meetings/2026-11-02-ARC-01-desktop-plugin.md).

## Reprendre le travail

Dans ce dépôt, relire `AGENTS.md`, ce fichier, `docs/delivery/ORCHESTRATION.md`, puis lancer `npm run team:status` et `npm run team:next`. `npm run team:start` ouvre une nouvelle session Codex pour l'orchestration ; les agents ne continuent pas après sa fermeture. Voir aussi [le tableau des tickets](delivery/BOARD.md), [leur correspondance GitHub](delivery/GITHUB.md), [la revue de l'incrément local](meetings/2026-11-02-MANIFEST-live-suggestions.md) et [les dettes techniques](TECH-DEBT.md).
