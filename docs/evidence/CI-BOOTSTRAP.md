# Premier passage CI du bootstrap

Date : 1er novembre 2026. Dépôt : [HotMb/design-workbench](https://github.com/HotMb/design-workbench), privé.

Commit contrôlé : `746cde87f2f1d2db0bece54fa00425441a765fd9`.

Workflow : [Quality — exécution 41328430311](https://github.com/HotMb/design-workbench/actions/runs/41328430311). Job `contracts-and-orchestration`, ID `124913182065` : **completed / success**, observé via l'API GitHub. Environnement Linux, Node 24 et Python 3.13 définis par le workflow.

Résultats relevés dans les étapes et journaux :

- installation Node et des validateurs Python réussie ;
- **21 tests Node réussis, zéro ignoré** ; le test de lien vers une preuve hors dossier est passé sur Linux ;
- cohérence du registre et du tableau validée ;
- schéma, trois exemples, dix cas négatifs et OpenAPI validés ;
- **8 tests Python de mutation réussis**.

Ce résultat complète le test Windows ignoré dans [BOOTSTRAP-CHECKS.md](BOOTSTRAP-CHECKS.md). Il confirme l'outillage sur le commit indiqué. Il ne qualifie pas ChatGPT/Puck, le backend produit ou les API fournisseurs, et ne clôture aucun ticket ARC.

Les futurs commits produisent leurs propres exécutions. Cette preuve n'affirme pas à l'avance le passage d'un autre commit.
