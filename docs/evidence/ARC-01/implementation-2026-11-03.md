# ARC-01 — alignement local et démarrage vide

Date : 3 novembre 2026. Branche locale : `work/arc-01`. Cette preuve complète le bilan historique du 1er novembre ; elle ne valide pas ChatGPT Desktop, l’identité OAuth ou une transmission réelle au chat.

## Résultat local

- Un nouveau Snapshot et un nouveau canevas démarrent réellement vides. Les anciens brouillons Hero restent lisibles.
- L’écran local reprend la hiérarchie validée : intention principale à gauche, aperçu web au centre, suggestions/réglages à droite. Le champ principal décrit page, contenu, mouvement et intentions ; l’analyse locale attend 1,5 seconde de pause et peut être suspendue. Un candidat est prévisualisé avant conservation.
- L’insertion manuelle du Hero reste disponible pour le M0. Ajout, annulation, rétablissement et sauvegarde locale sont éprouvés.
- Les suggestions locales et le simulateur déterministe servent aux tests d’aperçu. Le simulateur est étiqueté comme tel et aucun modèle réel n’a été appelé.
- Les corrections responsive et de contraste issues de la revue sont intégrées : ouverture à 375 px dans l’étape Décrire, retrait du message vide sous une proposition, radio sélectionné lisible, et libellés Puck Titre/Texte de présentation/Animation d’entrée mesurés à au moins 4,5:1.

## Vérifications

| Contrôle | Résultat | Portée |
|---|---:|---|
| `npm run test:e2e` | **17/17** | Chrome local ; canevas vide, insertion, aperçu temporaire, mobile, réglages et contraste. Avertissements Puck `setData` observés, sans échec. |
| `npm run test:m0` | **64/64** | domaine, store, serveur HTTP local/MCP, adaptateurs et jobs ; serveur local autorisé. |
| `npm run test:providers` | **28/28** | contrats, routage et simulateur déterministe ; pas d’appel fournisseur réel. |
| Tests UI | **14 réussis** | vérification rapportée par le propriétaire frontend. |
| `npm test` | **20 réussis, 1 ignoré** | le test ignoré nécessite le droit de créer un lien symbolique sur ce poste Windows. |
| TypeScript, build, audit strict, `npm run check`, `git diff --check` | **réussis** | Typecheck/build/audit rapportés par le propriétaire frontend ; check de backlog exécuté localement en révision 7. Le build conserve des avertissements de dépendances `use client`. |
| `python scripts/check_contracts.py` et suite unittest Python | **non exécutés** | dépendance `jsonschema` absente de l’environnement (`ModuleNotFoundError`). |

La capture du canevas vide, les états de proposition et la capture de réglages contrastés sont archivées dans ce dossier. Elles prouvent seulement le rendu navigateur local. La revue design a confirmé visuellement le correctif final ; la revue du code n’a pas trouvé de défaut bloquant dans les chemins M0 examinés.

## Non livré / preuve encore requise

- Le champ de recherche catalogue séparé, les variantes réelles de menu/animation, leur provenance/licence/version et l’insertion par glisser-déposer ou action clavier appartiennent à UI-02/CAT-02 ; ce panneau n’est pas simulé comme s’il existait.
- Le choix nouveau projet/existant, le contexte hôte prérempli, les références de catalogue persistées, `/validate` avec accusé du chat et la transmission au modèle hôte restent à implémenter selon UI-03/AI-02/REV-01.
- Le vrai ChatGPT Desktop, le bridge et l’identité ne sont pas qualifiés. Une capture locale et les tests de simulateur ne remplacent pas cette preuve. Aucun API de modèle n’a été appelé.

Décision : conserver cet incrément local et arrêter ARC-01 comme **bloqué** sur la preuve d’hôte/identité. Ne pas lancer ARC-02 tant que cette preuve n’est pas obtenue.

## Relecture loop-verify

Deux passes ont été effectuées selon la limite du skill. La première a échoué parce que le paquet ne contenait que le résumé et les chemins des artefacts. La seconde a validé 4/5 critères ; elle n'a pas retrouvé DEBT-004 car `docs/TECH-DEBT.md` n'était pas inclus dans ce paquet, bien que l'entrée soit présente dans le dépôt et liée à DOM-01/CAT-01 avec une condition de sortie avant le catalogue multi-bloc. Aucun troisième appel n'a été effectué ; **aucun PASS global loop-verify n'est revendiqué**. Le vérificateur utilisé est de la lignée Codex/OpenAI, comme le travail d'origine.
