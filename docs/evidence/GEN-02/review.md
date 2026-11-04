# Revue indépendante GEN-02 — 4 novembre 2026

## Périmètre relu

Le diff local de `packages/catalog/src/index.ts`, `packages/catalog/src/styles.css`, `tests/contract/catalog/catalog.test.ts`, `tests/e2e/catalog-composed-motion.spec.ts`, `playwright.catalog.config.ts`, `docs/spec/CATALOGUE.md` et `docs/evidence/GEN-02/implementation.md`. Le test E2E a été exécuté après la dernière mise à jour des assertions. GEN-02 reste `in_progress`, registre révision 36.

## Avis QA reçu

La première revue de `/root/gen01_qa` a rendu **REVISE** : aucune faille P0, mais les preuves d’animation navigateur, l’immuabilité/version de catalogue, la provenance, la licence, le hash et le coût étaient incomplets.

Au suivi, QA a confirmé que le test Chromium isolé couvre l’exécution effective et `prefers-reduced-motion`. Elle a confirmé que le statut de `manifest-core@0.3.0` est maintenant explicitement provisoire, privé, non publié et non exportable, sans release GitHub au 4 novembre. QA a signalé que les frames d’échelle et de rotation devaient aussi être vérifiées. Le test vérifie désormais opacity, translations, échelle et rotation aux frames initiale/finale, ainsi que le flou et l’opt-in limité au canevas. La dernière revue confirme que ces assertions lèvent le finding E2E.

Le verdict global demeure **REVISE** : hash source, licence complète, profil de compatibilité et coûts mesurés manquent encore pour satisfaire les critères GEN-02. Aucun finding P0/P1 de sécurité n’a été relevé.

## Preuves observées

| Scénario | Résultat |
|---|---|
| `npm run test:catalog` | Réussi, 15/15 |
| `npm run typecheck` | Réussi |
| `npm run build` | Réussi ; avertissements Rolldown `use client` provenant de dépendances |
| Chromium composé | Réussi, 1/1 avec `npx.cmd playwright test --config playwright.catalog.config.ts --reporter=list` ; keyframes d’opacité, translations, échelle, rotation et flou vérifiées |
| Mouvement réduit | Réussi dans le même test : coupé hors canevas, opt-in uniquement dans le canevas |
| `npm run check` | Réussi, révision du registre 36 |
| `python scripts/check_contracts.py` local | Non démarré : `jsonschema` absent de l’environnement Python |
| GitHub Actions à `cd9098f` | Deux exécutions réussies, dont la validation Python des contrats ; ce commit inclut le correctif du nom de fixture, mais pas les changements GEN-02 encore locaux |
| Playwright global sur les changements GEN-02 | Non exécuté avec résultat : le serveur requis sur le port 4173 n’a pas démarré, la tentative a été interrompue. Les 36/36 E2E précédents ne couvrent pas le nouveau mouvement composé. |
| Fournisseur réel / ChatGPT Desktop | Non testé par cette revue |

## Écarts ouverts

- `CATALOG_RELEASE` et les entrées restent `NOASSERTION` / `license-pending`; aucune licence de racine ni notice complète ne permet d’autoriser l’export.
- L’empreinte des sources, styles, assets et lockfile n’est pas calculée ; `source-hash-pending` empêche d’identifier une release reproductible.
- Les coûts de rendu, transfert et usage GPU ne sont pas mesurés.
- Les 39 bibliothèques listées depuis les captures ne sont pas auditées ; elles ne sont ni installées ni recommandées comme intégrables.
- La génération en langage naturel vers les primitives `composed`, la sélection de modèle et le filtre de secrets appartiennent à GEN-03 et ne sont pas livrés ici.
- ARC-01 demeure bloqué sur la preuve dans ChatGPT Desktop. Le skill `computer-use` interdit d’automatiser cet hôte ; l’ouverture via le connecteur Manifest local ne constitue pas cette preuve.

## Décision

**GEN-02 : à reprendre, non soumis et non clôturé.** Garder les changements composables sous contrôle de version comme une tranche intermédiaire. Continuer l’audit de provenance/licence, le hash reproductible et les mesures de coût dans GEN-02 ; ne pas exporter cette baseline. GEN-03 reste inéligible tant que GEN-02 n’est pas terminé.

La validation `loop-verify` n’est pas revendiquée : deux tentatives précédentes ont échoué (une requête trop large rejetée, puis un espace de revue isolé sans les fichiers). La limite atteinte a été conservée plutôt que de prétendre à un verdict.
