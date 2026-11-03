# Preuve de cadrage Manifest — contexte et intégration de données — 3 novembre 2026

## Portée

Cette tranche met à jour le cadrage, le contrat UX, l’architecture et les critères de tickets. Elle ne modifie pas le comportement de l’application.

Décisions consignées :

- Une seule surface de travail : brief/proposition à gauche, candidat et aperçu au centre, recherche/démonstrations catalogue à droite. Pas d’onglets d’étapes ni de page distincte de réglage de bloc.
- Le lancement distingue `create_project`, `create_page` (avec projet et version de base) et `modify_page` (projet, page et version de base). Les candidats sont liés à leur cible/version, les Snapshots existants sont relus, et une proposition n’est jamais conservée silencieusement.
- Une proposition ChatGPT transmise explicitement peut servir de graine. Un handoff textuel seul préremplit le brief et n’appelle pas de modèle tant que l’analyse automatique n’a pas été activée ou que l’utilisateur n’a pas choisi « Proposer maintenant ». Le compositeur natif non envoyé n’est jamais lu.
- `DataIntegrationSpec` est conservée dans `Snapshot.dataIntegrationSpecs[]`, modifiée via `set_data_integration_spec` dans `apply_ops`, validée par le domaine et figée dans la révision approuvée. Le rapport `/validate` transmet la liste de cette révision sans secrets ni lignes sensibles. Le rapport ne confère aucun accès à la source.

## Fichiers de cadrage et tickets

- `DESIGN.md`, `UX-CONTRACT.md`
- `docs/spec/PRODUCT.md`, `docs/spec/ARCHITECTURE.md`, `docs/spec/CONTRACTS.md`
- `docs/delivery/tickets.json` et `docs/delivery/BOARD.md`
- Critères affinés : DOM-01, DOM-02, UX-01, UI-01, UI-02, UI-03, AI-02, REV-01 et TEST-01

Le registre est à la révision 14. Les statuts et dépendances n’ont pas changé : ARC-01 reste `blocked`, ARC-02 dépend de sa résolution, les tickets M1 concernés restent à faire. `npm run team:next` ne trouve aucun nouveau ticket éligible.

## Revue indépendante

Le designer a vérifié le contrat visuel et l’absence de pages/étapes séparées. Le reviewer indépendant a relevé trois ambiguïtés : distinguer les trois opérations de lancement, définir la source versionnée des spécifications de données et empêcher le lancement IA sur texte seul ; une deuxième passe a demandé d’aligner les bases de `create_page` et la cardinalité du rapport. Ces points ont été corrigés dans le cadrage et le registre. Le tableau canonique UX a également été corrigé pour exiger `baseDraftVersion` sur `create_page`.

Limite restante : les schémas runtime et fixtures ne contiennent pas encore ces capacités, et le handoff réel doit être qualifié dans l’hôte. Le cadrage ne vaut pas preuve d’implémentation.

## Vérifications exécutées

| Vérification | Résultat |
|---|---|
| `npm run check` | Réussi : 26 tickets, registre révision 14 ; BOARD aligné. |
| `git diff --check` | Réussi, aucun problème d’espacement ou de patch. |
| Lecture des fichiers JSON | `tickets.json`, `domain.schema.json` et `openapi.json` se parsènt. Ce contrôle vérifie seulement leur syntaxe, pas la présence des nouveaux schémas. |
| `npm run team:next` | 0 nouveau ticket éligible ; ARC-01 reste bloqué. |
| `python scripts/check_contracts.py` et `python -m unittest discover -s tests -p 'test_*.py'` | Non exécutables dans l’environnement : le module Python `jsonschema` n’est pas installé. Aucun paquet n’a été installé. |

Les tests de comportement ne s’appliquent pas à cette modification documentaire ; aucun nouveau test n’a été ajouté.
