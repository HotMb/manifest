# Vérifications de l'équipe et de l'outillage

Date : 1er novembre 2026. Portée : bootstrap du dépôt et du pilotage des agents. Aucun des 26 tickets produit n'est clôturé par ce compte rendu.

## Contrôles locaux exécutés

| Contrôle | Résultat |
|---|---|
| `npm test` | 21 tests : 20 réussis, 1 ignoré, aucun échec |
| `npm run check` | registre des 26 tickets valide, graphe acyclique, tableau conforme |
| `python scripts/check_contracts.py` | Draft 2020-12, 3 exemples, 10 négatifs, OpenAPI 3.1/15 opérations et liens locaux valides |
| `python -m unittest discover -s tests -p 'test_*.py' -v` | 8 tests de mutation réussis |
| TOML des agents | 6 profils distincts, name/description/developer_instructions présents, aucun modèle imposé, configuration limite 3 sous-agents |
| `codex features list` | configuration lue sans erreur de syntaxe par le CLI local 0.165.0-alpha.1.2 |
| Confidentialité du dépôt | création et lecture GitHub confirment visibility=private |

Environnement local : Windows, Node 24.5.0, Python 3.14.8. Les bibliothèques Python de contrôle ont été employées via un répertoire temporaire préexistant ; les versions attendues sont déclarées dans requirements-dev.txt. Le dossier temporaire des tests a été placé dans `.tmp/`, ignoré par Git, en raison des restrictions du TEMP système. Aucune clé n'est nécessaire pour ces contrôles.

Le test ignoré est la création d'un lien symbolique/junction vers un fichier du dépôt hors docs/evidence : Windows refuse cette création dans cet environnement. Le contrôle de chemin réel est présent dans le code ; sa reproduction Linux a ensuite réussi dans [la première CI](CI-BOOTSTRAP.md). Les autres tests couvrent notamment CAS, dépendances, cycles, WIP, alias de chemin/casse, auto-approbation, preuve distincte, blocage, reprise, lock et rendu atomique du tableau.

Les profils sont conformes au format documenté et leur TOML est lu. Une nouvelle session interactive doit encore confirmer leur découverte effective dans le client utilisé. `team:brief` a été exécuté sans inférence ; `team:start` n'a pas été lancé pour éviter une seconde orchestration concurrente pendant le bootstrap. Les spécialistes de cette session ont reçu leurs responsabilités directement.

## Revues et corrections

Trois agents ont produit l'organisation du backlog, la conception et les contrôles de contrats. Une revue QA en lecture seule a identifié les alias de chemin et la duplication d'une même preuve, corrigés et couverts par tests.

Le skill loop-verify-review a été utilisé deux fois, avec le vérificateur Codex/OpenAI : seconde passe du même fournisseur. **Les deux retours sur extraits étaient FAIL ; aucun PASS global n'est revendiqué.**

| Remarque | Traitement |
|---|---|
| casse Windows et chemins équivalents | comparaison conservatrice sans casse, segments ambigus refusés, tests ciblés réussis |
| temporaire préexistant supprimable lors d'un refus | nom UUID, suppression seulement si créé par l'invocation ; test de non-suppression réussi |
| preuve via symlink hors dossier des preuves | chemin réel limité à docs/evidence et déduplication réelle ; reproduction locale du lien ignorée faute de droits, puis réussie en CI Linux |
| lock orphelin après crash | PID/date et procédure manuelle prudente dans CONTRIBUTING.md ; aucune suppression automatique aveugle |
| rendu BOARD sans lock pouvant publier une lecture ancienne | même lock que les mutations, relecture après acquisition et remplacement atomique ; deux tests ajoutés et réussis |
| cinq profils absents des extraits | ils existaient dans le dépôt ; les six profils ont été contrôlés par parsing TOML, sans nouvelle inférence |

Les deux appels étant consommés, les dernières corrections ont été vérifiées par tests ciblés et lecture, sans troisième relecture loop-verify. La CI et l'exécution des profils doivent être observées séparément. Les contrôles de présence de preuves et de rôles sont une aide de workflow locale, pas une authentification ni une certification de leur contenu.

## Non vérifié par ce bootstrap

Éditeur Puck dans le vrai ChatGPT, authentification du produit, appels d'API fournisseur, conservation d'un document réel, code exporté et déploiement. Ce sont les preuves des tickets concernés, en commençant par ARC-01. Les résultats distants du bootstrap sont consignés dans [CI-BOOTSTRAP.md](CI-BOOTSTRAP.md).
