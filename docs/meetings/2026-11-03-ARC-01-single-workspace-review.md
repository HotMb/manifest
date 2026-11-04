# Revue ARC-01 — espace unique et lancement — 3 novembre 2026

Revue asynchrone de la révision locale non commitée, puis du paquet privé 0.1.2. [Preuve et limites](../evidence/ARC-01/single-workspace-2026-11-03.md).

| Participant réel | Contribution reçue |
|---|---|
| `/root`, propriétaire et intégrateur | Suppression des étapes/onglets, réunion des zones, aperçu noir, conservation/abandon et reprise ; exécution des contrôles, build et actualisation privée |
| `/root/handoff`, backend | Contrat explicite de lancement, abonnement transport, tests backend et huit scénarios navigateur |
| `/root/design_review`, designer et reviewer distinct | Lecture du code et de trois captures, trois défauts de couches/reprise signalés, puis confirmation de leur correction et des derniers garde-fous |

Le designer confirme la surface unique et le noir exact. Les vérifications de l'intégrateur confirment typecheck, build, smoke et huit scénarios de lancement. Le reviewer code indépendant maintient toutefois un défaut de contraste sur les fonds gris intermédiaires ; une relance stricte de l'audit UI a aussi révélé le `<select>` natif sans décision de propriété documentée. Le correctif est donc vérifié pour l'essai local, mais n'est pas prêt à être intégré au dépôt. Les deux verdicts loop-verify restent documentés FAIL suivis de corrections, sans revendication de PASS supplémentaire.

Décision produit appliquée : les zones s'empilent naturellement sur écran étroit, conformément à la préférence explicite « une seule page qui affiche tout » ; aucun onglet de réglage séparé. Cette décision prime la variante de tiroirs proposée dans le cadrage.

Verdict : correctif local disponible et release privée 0.1.2 actualisée. Le rechargement dans le véritable hôte n'est pas démontré ; ARC-01 reste bloqué, aucun ticket dépendant n'est démarré. Prochaine action : recharger le plugin 0.1.2 dans l'application, qualifier la transmission réelle du contexte et corriger les findings UI avant intégration. Le commit `8d54f58` poussé après la revue contient uniquement les notes d'audit précédentes ; aucun code applicatif du correctif n'a été poussé. Propriétaires : intégrateur pour la qualification technique, utilisateur pour le redémarrage de son application lorsque nécessaire. Aucun calendrier ni message externe créé.
