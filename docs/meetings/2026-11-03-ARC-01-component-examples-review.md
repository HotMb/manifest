# Revue ARC-01 — recherche d’exemples — 3 novembre 2026

Objectif : second champ, dans le panneau droit Suggestions, qui filtre une liste d’exemples de composants et d’animations sans changer de page. Révision examinée : diff local et paquet privé Manifest 0.1.3. [Preuves](../evidence/ARC-01/component-examples-2026-11-03.md).

| Participant réel | Contribution |
|---|---|
| `/root`, propriétaire/intégrateur | Composant, intégration et styles, tests locaux, relance des vérifications et inventaire GitHub |
| `/root/delivery_design_review`, designer distinct | Revue fraîche de l’écran à trois zones, recherche et démonstration `menu` ; constate que l’exemple ne s’applique pas au canevas et n’a pas pu comparer Figma dans cette session |
| `/root/launchcontext_code_review`, reviewer code distinct | Aucun risque de sécurité bloquant ; signale que le bouton de relecture reste actif en mouvement réduit bien que l’animation soit désactivée |

Décision : montrer sept exemples natifs locaux clairement identifiés, sans prétendre qu’ils sont tous insérables dans le M0. La recherche reste séparée du brief et de l’analyse. Les démos s’ouvrent dans les cartes, sans route ni nouvel onglet. Le bouton de survol possède également un état activable au clic/clavier.

Validation relancée : 28 tests navigateur, 66 M0 et 28 tests providers réussis ; typecheck, build, smoke stdio, `npm test` (20 réussis, 1 ignoré), `npm run check` et `git diff --check` réussis. L’audit strict actuel échoue sur `ownership.native-select-undecided` dans `model-provider-panel.tsx:21`. Les contrats Python n’ont pas démarré faute de `jsonschema`. Le build émet des avertissements Vite `use client`, et les parcours Puck affichent son avertissement `setData` coûteux. Le smoke utilise stdio local et ne teste pas ChatGPT Desktop. Le vérificateur supplémentaire n’a pas produit de verdict exploitable sur deux essais antérieurs ; aucun PASS n’est attribué et la limite de tentatives n’est pas dépassée.

Verdict : essai local disponible pour la recherche et les démos ; ajout/glisser-déposer au canevas absent et aucun handoff visuel dans ChatGPT Desktop prouvé. Le plugin privé 0.1.3 a été actualisé, mais sa vue doit être observée dans l’hôte. ARC-01 reste bloqué et aucun ticket dépendant n’est éligible. La PR #27 demeure en brouillon ; la CI verte porte sur le code commité `97e9b97`, pas sur les modifications locales. Prochaine action : le commanditaire fournit une capture du lancement et de l’état du brief dans le vrai hôte ; l’intégrateur reprend ensuite la matrice de capacités. Pas de dette supplémentaire ouverte ; le bouton sans effet en mouvement réduit est un défaut à corriger dans une tranche éligible. Aucun message externe ni événement calendrier créé.
