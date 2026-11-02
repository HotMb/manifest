# ARC-01 — timeout CI navigateur — 2 novembre 2026

## Symptôme reproduit dans la preuve CI

Le job `contracts-and-orchestration` du run [Quality 41498686690](https://github.com/HotMb/manifest/actions/runs/41498686690/job/125460261711) atteint les tests navigateur. Sept des huit scénarios passent. Le scénario de brouillon expiré dépasse les 30 secondes à la ligne d’appel d’`openSettings`, en attendant le bouton mobile `Réglages du bloc` après le clic de reprise.

Le CSS n’affiche les onglets mobiles qu’à une largeur maximale de 767 px. L’ancien helper choisissait le sélecteur mobile lorsque `desktopSettings.isVisible()` retournait faux immédiatement. Après un clic asynchrone sur la reprise, cette observation pouvait se produire avant le retour de l’éditeur.

## Correction locale

Dans `tests/e2e/arc01.spec.ts`, `openSettings` choisit maintenant entre l’onglet desktop et le contrôle mobile selon `page.viewportSize()?.width` et le breakpoint CSS de 767 px. Le `click()` attend ensuite le bon contrôle.

## Résultats et limites

- Réussis localement : `npm run check` (26 tickets valides, révision 3), `npm run typecheck`, `git diff --check`.
- Test ciblé `npm run test:e2e -- --grep "brouillon expiré"` : lancé mais sans rapport de fin après environ 60 secondes ; processus interrompu. Ce n’est pas un succès ni un échec de l’assertion.
- Reviewer Test Automation Engineer : juge le changement causalement adéquat, recommande le test ciblé Chromium, une répétition et le run Linux ; aucun de ces tests n’a été exécuté par le reviewer.
- Loop-verify : deux tentatives, toutes deux FAIL parce que le premier envoi omettait le compte rendu et l’état détaillé des tickets, puis le second omettait l’implémentation du helper. La limite du skill interdit une troisième tentative ; aucun PASS global n’est revendiqué.
- État : correctif local, run CI après correction à venir. ARC-01 reste bloqué jusqu’à la confirmation E2E et aux preuves réelles du vrai hôte ChatGPT / identité.

Voir le [compte rendu de revue](../../meetings/2026-11-02-ARC-01-ci-followup.md).
