# Vérifications du dossier de cadrage

Date : 1er novembre 2026. Portée : documentation et contrats de départ. Aucune application n'a été créée, exécutée ou publiée dans ce travail.

## Contrôles exécutés

| Contrôle | Résultat constaté | Limite |
|---|---|---|
| JSON Schema Draft 2020-12, `check_schema` | schéma structurellement valide | ne valide pas l'implémentation des invariants métier |
| Trois exemples : snapshot, commande et proposition | acceptés par leur définition de schéma | données fictives, aucune release de composants implémentée |
| Dix variantes invalides | toutes rejetées | cas ciblés, pas une preuve exhaustive |
| OpenAPI 3.1 et références locales | valide, 15 opérations | aucune requête envoyée à un serveur produit |
| Liens Markdown locaux | aucune cible manquante au contrôle final | disponibilité future des liens web non garantie |
| Backlog et références de recette | 26 tickets M0/M1 uniques ; 25 scénarios AT ; aucune référence AT inconnue | les scénarios sont à exécuter après développement |
| Frontmatter DESIGN.md | YAML lisible, sections de tokens présentes et non vides | aucun lint officiel ni audit d'interface exécuté |
| Archive de transmission | entrées contrôlées contre le manifeste SHA-256 | garantit l'intégrité des fichiers livrés, pas leur correction fonctionnelle |

Outils employés : Python 3.14.8, jsonschema 4.26.0, openapi-spec-validator 0.9.0. Les dépendances de vérification ont été utilisées dans un répertoire temporaire ; elles ne sont pas embarquées dans le dossier produit.

Variantes invalides contrôlées : version de schéma inconnue, historique imbriqué dans un Snapshot, route externe, bloc sans ID, clé de prototype interdite, version négative, opération inconnue, confusion proposition/révision, token de thème réservé, approbation sans précondition du head. Les règles sémantiques propres au catalogue, l'autorisation et les transactions nécessitent leurs futurs tests de domaine et d'intégration.

## Relecture loop-verify

Le skill loop-verify-review a été appliqué, dans sa limite de deux tentatives. Le vérificateur configuré est Codex/OpenAI : il s'agit d'une seconde passe du même fournisseur, pas d'une revue indépendante entre fournisseurs.

- Première tentative : résultat non exploitable après troncature du retour et fermeture de la cellule ; aucun verdict revendiqué.
- Deuxième tentative : **FAIL sur les extraits fournis**, avec 7 critères sur 10 acceptés. Les extraits totalisaient environ 22 500 caractères et n'incluaient que les titres des tickets, ni l'ensemble des passages d'architecture. Le résultat ne constitue donc pas une revue globale du dossier.

| Demande du vérificateur | Traitement et preuve dans le dossier final |
|---|---|
| Expliciter ChatGPT en premier, cœur Puck partagé et extensions M3 | architecture et périmètre déjà décrits dans ARCHITECTURE.md / PRODUCT.md ; synthèse explicite ajoutée dans README.md |
| Appels et clés fournisseur uniquement backend, aucune permission fournisseur côté vue | frontières et réseau déjà décrits dans ARCHITECTURE.md ; rappel explicite ajouté dans README.md |
| Donner dépendances, critères, preuves M0 et recette complète M1 | tickets détaillés déjà présents dans DELIVERY.md ; porte de sortie M0 rendue visible dans README.md et parcours manuel de bout en bout ajouté dans QA.md |

Ces points ont été rapprochés des textes complets et clarifiés. Aucun troisième appel n'a été fait conformément à la borne du skill. **Le FAIL de la relecture d'extraits n'a pas été remplacé par un PASS** ; les changements de documentation ont ensuite passé les contrôles structurels ordinaires. Aucun défaut matériel supplémentaire n'a été signalé dans les sept critères acceptés, ce qui ne garantit pas l'absence de défauts.

## Ce qui reste à prouver par l'équipe

ARC-01/02 doivent éprouver l'hôte, Puck, le bridge, l'identité, les versions et la livraison des fichiers. Les tests de concurrence, sécurité, coût fournisseur, conservation et fidélité d'export restent à implémenter puis exécuter. La procédure M1 de QA.md est une recette proposée, pas un procès-verbal de passage.

Le dossier est une base cohérente de développement et d'estimation. Une mise en production exige les preuves des jalons, les choix d'exploitation et une revue humaine d'intégration.
