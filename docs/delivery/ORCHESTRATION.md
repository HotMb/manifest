# Orchestration du développement

## Source de travail

`tickets.json` est le registre machine versionné dans Git. Le cadrage normatif reste [DELIVERY.md](../spec/DELIVERY.md), complété par les contrats de produit, de domaine et d'UX. [BOARD.md](BOARD.md) est une vue lisible de ce registre. Une issue GitHub est un miroir de suivi : sa modification n'écrase jamais silencieusement le fichier Git. Toute synchronisation est explicite, relit les deux états et rapporte les divergences.

Le nom du rôle est une responsabilité, pas une preuve qu'un processus tourne. Les profils d'agents sont réutilisables ; ils s'exécutent pendant une session lancée par l'utilisateur ou par une automatisation distinctement configurée. Cette préparation ne crée aucun service permanent ni promesse de travail après fermeture de la session.

## Répartition

| Rôle | Responsabilité | Interlocuteurs |
|---|---|---|
| orchestrator | sélectionner les tickets prêts, répartir les fichiers, intégrer, expliquer l'avancement | commanditaire et tous rôles |
| designer | direction, comportements, primitives et critères visuels | frontend, catalogue et produit |
| frontend | éditeur, adaptateurs d'hôte, contrôles et états | designer, backend |
| backend | domaine, stockage, HTTP/MCP, jobs et IA | frontend, plateforme |
| platform | exports, builds isolés, CI et exploitation | backend, QA |
| qa | tests de contrat, parcours, sécurité et preuves | chaque propriétaire |

Un ticket a un propriétaire responsable de sa livraison. Les consultations ne transfèrent pas la propriété du fichier. Un agent QA n'approuve pas sa propre implémentation sans une seconde lecture par l'orchestrateur ou un autre agent.

## Boucle d'une session

1. Lire `git status`, le dernier compte rendu et la révision du registre. Préserver les modifications existantes. L'orchestrateur est le seul écrivain de tickets.json et du tableau dans une même branche.
2. Vérifier le graphe : IDs uniques, dépendances présentes, absence de cycle. Trier d'abord par phase M0 avant M1, puis par ordre du registre parmi les tickets dont toutes les dépendances sont `done`.
3. Préparer une tranche d'au plus **trois tickets**. Au plus **trois sous-agents** sont actifs en parallèle, en plus de l'orchestrateur, et uniquement pour des travaux indépendants. Un chemin `ownedPaths` commun ou imbriqué interdit deux écritures simultanées : sérialiser ou attribuer des sous-chemins disjoints explicitement avant délégation.
4. Attribuer le ticket, une branche, les chemins autorisés, les entrées, les sorties et les preuves attendues. L'agent annonce sa prise en charge et passe le travail en `in_progress` via l'orchestrateur. Il ne renomme pas les contrats communs sans coordination.
5. Réaliser l'implémentation et les vérifications propres au changement. Conserver des preuves datées sans secrets : résultats reproductibles, versions, erreurs vérifiées et limites. Une capture seule ne prouve ni un test de permissions ni une reconstruction d'export.
6. Passer en `review`, faire relire par le rôle concerné puis QA. Tenir la [réunion de fin de tâche](../meetings/README.md) avec les contributions réelles, démonstration, tests, dettes, risques et décisions. Une tentative bloquée a aussi son compte rendu. L'orchestrateur contrôle le diff, les critères, les tests et les dépendances avant intégration. Il inscrit les chemins des preuves et le commit ou la PR dans le registre ; la preuve de revue renvoie au compte rendu.
7. Passer en `done` uniquement si tous les critères du ticket sont prouvés. Rendre les dépendants éligibles et synchroniser le miroir GitHub par une action explicite. À la fin de la tranche, rendre un compte rendu : livré, testé, restant, obstacle et prochain ticket.
8. Après au plus trois tickets intégrés, ou dès qu'un blocage requiert l'utilisateur, laisser la passation et terminer la passe d'orchestration. La reprise se fait à la demande dans une session suivante ; aucune relance permanente n'est installée. Une nouvelle demande utilisateur peut prolonger explicitement la passe.

Si une capacité requiert un vrai compte hôte, des accès d'identité ou un environnement indisponible, terminer les tâches indépendantes, enregistrer l'obstacle et les informations nécessaires. Ne pas appeler une preuve « réussie » parce qu'un mock fonctionne.

## États et preuves

| État | Sens |
|---|---|
| todo | non pris ; dépendances potentiellement inachevées |
| ready | dépendances terminées, périmètre et propriétaire connus |
| in_progress | un propriétaire et une session travaillent réellement |
| review | résultat soumis, vérifications et preuves disponibles |
| done | critères satisfaits, revue intégrée et références conservées |
| blocked | obstacle concret empêchant la suite du ticket ; raison et reprise requise explicites |

`evidence` contient les preuves **obtenues**, initialement vides. `blockers` décrit les conditions encore non établies ; elles ne rendent pas automatiquement un ticket bloqué si du travail utile peut commencer. Les détails attendus sont dans `acceptance` et le ticket de cadrage. Un résultat de modèle n'est pas une preuve d'exécution. Un passage `done` sans références de preuves est refusé.

Les mises à jour du registre relisent sa `revision` avant écriture et incrémentent ce nombre. Une seule session d'orchestration modifie le registre dans un arbre de travail ; une deuxième doit utiliser sa branche et résoudre la divergence avant intégration. Ne pas traiter Git comme un verrou multi-processus. Seul le rôle orchestrator utilise `npm run team:revise -- <ID> --expected-revision N --agent orchestrator --reason "..." --patch-file docs/delivery/changes/<fichier>.json` pour changer les critères ou dépendances, et `npm run team:add` pour ajouter un ticket. Le patch JSON est conservé comme décision versionnée ; les statuts et preuves suivent toujours les commandes normales.

## Git et intégration

- `main` conserve les changements intégrés et vérifiés. Une branche courte suit `work/arc-01-parcours-embarque`, avec l'ID dans les commits et la PR.
- Un worktree distinct par agent est préférable si plusieurs tâches modifient des fichiers. Dans un arbre partagé, les propriétés et sous-chemins sont explicites, aucun agent n'utilise reset/clean/checkout pour annuler le travail d'un autre.
- Seul l'orchestrateur intègre les branches et arbitre les modifications communes. Les workers ne committent pas les changements d'un autre agent par un ajout global.
- Une PR décrit le comportement avant/après, le ticket, les vérifications exécutées et les limites. Le miroir GitHub est actualisé après intégration ; fermer l'issue ne remplace pas la mise à jour du registre.
- Toute modification de périmètre ou de contrat entraîne la mise à jour du cadrage et une décision expliquée. Le bootstrap peut préparer ARC-03 avant les preuves M0, mais **ne termine pas ARC-03** sans ARC-01/02.

## Prochaine tranche

ARC-01 reste bloqué sur la preuve du véritable hôte ChatGPT Desktop et de son identité ; aucune preuve locale ne le clôture. La révision du 4 novembre ajoute un chemin indépendant pour poursuivre le cœur produit : GEN-01 corrige le debounce automatique de l'aperçu, tandis que GEN-02 installe le contrat du catalogue local composé. GEN-03 consomme ensuite les capacités versionnées pour contraindre la génération fournisseur ; GEN-04 relie l'arbre confirmé à l'aperçu et au rapport. Ces tickets maintiennent les contrôles de version, secrets et capacités. Les tickets UI/AI historiques restent nécessaires pour les autres flux M1 et seront harmonisés sans rendre la preuve d'hôte fictive.
