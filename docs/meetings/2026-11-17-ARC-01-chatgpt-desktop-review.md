# Revue ARC-01 — parcours ChatGPT Desktop — 17 novembre 2026

## Résultat démontré

Manifest a été ouvert et manipulé dans ChatGPT Desktop. Le délai de 1,5 seconde déclenche les règles locales, une section est prévisualisée puis conservée, et l'hôte confirme `Brouillon v1`. La preuve détaillée est dans [l'observation hôte](../evidence/ARC-01/chatgpt-desktop-host-2026-11-17.md).

## Revue et limites

- L'orchestrateur a effectué l'observation et comparé le résultat aux critères d'ARC-01.
- Aucun reviewer distinct n'a participé à cette passe ; aucun verdict indépendant n'est revendiqué.
- Le connecteur chargé est `manifest-m0`. Il n'expose ni OAuth de production ni appel Responses réel.
- La proposition locale ne respecte pas fidèlement le titre, le texte et les mouvements demandés.
- `/validate`, le rapport transmis, le rafraîchissement, les fichiers, le stockage durable, l'iframe et le mouvement réduit restent non éprouvés.

## Verdict et prochaine action

**Verdict : reprise partielle réussie, ticket toujours bloqué.** Ne pas fusionner ARC-01 sur cette seule observation. Installer ou sélectionner le paquet incluant AUTH-01 et le parcours GEN-03/04, puis refaire l'essai avec consentement utilisateur et appel API explicite. Une revue indépendante devra relire les preuves avant toute transition vers `done`.
