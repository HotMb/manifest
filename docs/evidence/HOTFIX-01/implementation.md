# HOTFIX-01 — lancement contextuel et hauteur de Manifest

Date : 4 novembre 2026
Branche : `work/hotfix-01`
Ticket : HOTFIX-01, registre à la révision 53 avant soumission.

## Changements livrés

- La demande transmise dans `userRequest` reste prioritaire sur `assistantProposal`. Le contrat MCP n’accepte un `userRequest` que s’il contient du texte; si l’hôte n’en transmet pas, une proposition d’assistant déjà formulée peut servir de repli.
- Le lancement sans demande ni proposition ouvre un projet neutre, sans bloc ni composition de démonstration, avec un canevas blanc. Le prompt par défaut et les descriptions MCP demandent à l’hôte de ne rien inventer.
- L’atelier utilise la hauteur disponible du viewport : trois panneaux compacts dès 560 px, défilement interne pour les panneaux et le canevas, une seule zone commutable sous 560 px.
- La sauvegarde locale déjà présente survit au rechargement : le test vérifie que l’application recharge le contenu et que la valeur sauvegardée reste identique octet pour octet.
- M0 conserve actuellement un seul `projectId` stable par espace. Ce correctif ne prétend pas fournir un sélecteur multi-projets.

## Vérifications

| Vérification | Résultat |
|---|---|
| E2E `launch-context.spec.ts` + `empty-start.spec.ts` | **27/27 réussis**, port local dédié; comprend 736×704, 390×844, canevas blanc, debounce, priorité du brief, sauvegarde et rechargement |
| M0 backend/MCP/adaptateurs/contrats | **75/75 réussis** |
| TypeScript (`npm run typecheck`) | réussi |
| Build production (`npm run build`) | réussi; Vite signale les directives `use client` de dépendances tierces |
| Backlog (`npm run check`) | valide, 32 tickets, révision 53 avant soumission |
| `git diff --check` | réussi; Git affiche seulement des avis de normalisation CRLF |

Le validateur MCP et le schéma exigent une demande non vide lorsqu’un champ `userRequest` est transmis. Quand il n’y a pas de demande, le champ est omis; une proposition d’assistant déjà formulée peut alors servir de repli. La suite E2E complète avait passé 43/43 avant ce hotfix; les 27 tests ciblés ont tous repassé après le dernier changement. Un premier essai M0 dans l’environnement restreint a échoué uniquement sur l’accès loopback `EACCES`; le rerun avec accès local a passé 75/75. Le premier essai navigateur a rencontré un conflit temporaire de port; le rerun sur un port dédié a passé 27/27.

## Preuves visuelles

- [Atelier intégré, viewport 736×704](viewport-736x704.png)
- [Aperçu mobile, viewport 390×844](mobile-preview-390x844.png)

## Limites de cette preuve

Les parcours navigateur utilisent Chromium et un transport hôte simulé. Ils ne prouvent ni l’identité ni l’ouverture réelle dans ChatGPT Desktop. Aucun appel d’inférence à une API de modèle n’a été utilisé pour ces tests. La qualification ARC-01 dans l’hôte réel reste séparée.
