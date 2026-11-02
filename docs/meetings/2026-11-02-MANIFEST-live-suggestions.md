# Réunion de fin de tâche — suggestions réactives dans l’éditeur

Date : 2 novembre 2026  
Tâche : relier la saisie de description aux suggestions du fournisseur dans la vue MCP  
Participants : orchestrateur (implémentation et synthèse), reviewer backend (cycle MCP), reviewer interface (parcours et accessibilité). Les deux reviewers ont relu le lot sans modifier les fichiers.

## Résultat

L’éditeur lit désormais le registre public des modèles depuis l’hôte et laisse l’utilisateur choisir un fournisseur et un modèle configurés. L’automatique est désactivé au départ ; si l’utilisateur l’active, après 1,5 seconde sans frappe l’éditeur synchronise d’abord le brouillon, puis démarre le job de suggestion. Il est possible d’annuler le job. La proposition est affichée sur une projection en lecture seule ; le dernier aperçu reste affiché comme ancien et non applicable pendant le recalcul. L’utilisateur choisit de conserver ou d’ignorer le candidat courant.

La conservation est une action MCP idempotente qui contrôle la version et applique atomiquement les opérations M0 au brouillon partagé. Le serveur et le gestionnaire de jobs doivent utiliser le même store ; cette incohérence est maintenant refusée. Les requêtes de deux sessions sont isolées. Aucun token ou secret fournisseur n’est transmis à l’interface ni inclus au rapport. Le panneau dit « configuré », sans prétendre vérifier la disponibilité. L’interface annonce que les requêtes peuvent être facturées et que l’automatique est opt-in.

## Preuves de cette tâche

- `npm run typecheck` : réussi après les corrections finales.
- `npm run test:providers` : 24/24 réussis, dont l’isolation de requêtes entre sessions.
- `npm test` : 20 réussis, 1 ignoré (la création de liens est interdite sur ce poste), 0 échec.
- `npm run test:m0` : 52/52 réussis après autorisation du loopback ; inclut les contrats, l’identité du store partagé dans les serveurs MCP/HTTP, les décisions et l’obsolescence des propositions, et le runtime simulé.
- `npm run build` : réussi ; bundle autonome de 2,20 Mo (772 Ko gzip). Les avertissements `use client` de dépendances Puck/Radix restent à examiner.
- `npm run test:e2e` : 8/8 réussis dans le navigateur local après correction du sélecteur mobile (« Brouillon v1 »).
- Revue loop-verify, premier passage : échec de contrôle parce que le dossier transmis était tronqué et ne permettait pas d’inspecter l’implémentation complète.
- Revue loop-verify, deuxième et dernier passage de cette tranche : **FAIL**. Le reviewer a relevé que le nettoyage marquait le candidat comme rejeté sans action, et que le serveur testait la présence d’un store sans vérifier son identité avec celui du gestionnaire. Ces défauts ont été corrigés : le changement d’intention appelle maintenant `mark_proposal_stale`, distinct du rejet explicite, et MCP/HTTP comparent l’instance du store au gestionnaire. Les tests M0 ont été rejoués après ces corrections. Le reviewer a aussi demandé des preuves explicites pour l’état automatique initial, la durée exacte et l’interface en lecture seule ; ces détails existent dans `main.tsx` et les fichiers UI, mais ne figuraient pas tous dans le dossier ciblé transmis. La limite de deux passes ne permet pas une troisième revue loop-verify ; son dernier verdict reste donc FAIL malgré les corrections locales.
- Aucun appel fournisseur payant, essai dans ChatGPT, ni accès à une clé réelle n’a été effectué.

## Revue d'équipe : constats et corrections

- Backend : le serveur MCP pouvait être construit avec deux stores distincts, et un job d’une session pouvait annuler une autre session. Les invariants de store partagé sont maintenant imposés par les serveurs HTTP/MCP ; l’orchestrateur isole les requêtes par identifiant et les tests couvrent deux sessions concurrentes.
- Interface : ajout d’une annulation visible, conservation de l’aperçu précédent en lecture seule pendant un recalcul, suppression d’indices dupliqués et hausse de la taille de texte dans le panneau fournisseur. Les appels automatiques restent désactivés par défaut, le coût potentiel est annoncé, et l’état fournisseur est nommé « configuré » plutôt que « connecté ».
- Les reviewers ont réalisé des revues indépendantes et n’ont pas modifié les fichiers.

## Dettes et limites

- Les jobs, événements et propositions sont conservés en mémoire ; un redémarrage les perd. Ce choix reste une limite explicite du prototype M0.
- L’interface de sélection et le cycle de suggestion n’ont pas encore été exercés dans le vrai ChatGPT. Le transport MCP en local n’est pas une preuve de compatibilité de l’hôte.
- Aucun plafond produit de dépense ou de requêtes n’est appliqué. L’opt-in manuel réduit les appels par défaut, mais un essai facturable exige une limite côté fournisseur/hôte.
- Le runtime M0 accepte actuellement OpenAI, DeepSeek et fournisseur personnalisé sur un protocole compatible OpenAI. Les protocoles natifs Anthropic et Google, les autres modèles, les alternatives, la persistance et le contrôle de budget par organisation ne sont pas livrés.
- Les tests existants couvrent le cycle serveur et l’éditeur navigateur, mais aucun scénario E2E ne pilote encore une vue MCP avec fournisseur simulé. Un test d’intégration hôte distinct sera requis avant de déclarer ARC-01 terminé.

## Actions et verdict

1. Orchestrateur : versionner et pousser le lot sur la branche de travail, en conservant le verdict externe FAIL et la correction postérieure clairement consignés.
2. Équipe de qualification : valider la vue dans l’application ChatGPT sur ce PC avec un fournisseur simulé ou un budget de requêtes explicitement contrôlé avant tout appel réel.
3. Équipe projet : ne pas déclarer ARC-01 clos avant preuve d’intégration à l’hôte et parcours MCP avec fournisseur simulé ou contrôlé.

**Verdict de la tranche locale : prête à pousser avec un écart de revue externe consigné.** Les vérifications locales passent après les corrections. Le deuxième et dernier verdict loop-verify reste FAIL, même si ses défauts de comportement ont été corrigés et testés après la revue. Cela ne clôt pas ARC-01 : l’application ChatGPT sur ce PC, le bridge réel et le parcours de bout en bout avec fournisseur restent à qualifier. Aucun plafond de dépense n’est encore appliqué par le produit ; un essai facturable ne doit pas être lancé sans limite côté fournisseur ou hôte.
