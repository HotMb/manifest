# Revue indépendante GEN-02 — 4 novembre 2026

## Périmètre relu

Revue initiale : le diff du catalogue, du contrat et des tests de mouvement, registre révision 36. Revue de suivi : dépendance workspace editor-web, favicon data URI, lockfile, test smoke E2E, changements versionnés REV-37–39, capture smoke et preuve GEN-02 mise à jour. Le smoke 1/1, la suite complète 38/38 et le build ont été exécutés après les correctifs. GEN-02 reste `in_progress`, registre révision 39.

## Avis QA reçu

La première revue de `/root/gen01_qa` a rendu **REVISE** : aucune faille P0, mais les preuves d’animation navigateur, l’immuabilité/version de catalogue, la provenance, la licence, le hash et le coût étaient incomplets.

Au suivi, QA a confirmé que le test Chromium isolé couvre l’exécution effective et `prefers-reduced-motion`. Elle a confirmé que le statut de `manifest-core@0.3.0` est maintenant explicitement provisoire, privé, non publié et non exportable, sans release GitHub au 4 novembre. QA a signalé que les frames d’échelle et de rotation devaient aussi être vérifiées. Le test vérifie désormais opacity, translations, échelle et rotation aux frames initiale/finale, ainsi que le flou et l’opt-in limité au canevas. La dernière revue confirme que ces assertions lèvent le finding E2E.

Le verdict global demeure **REVISE** : hash source, licence complète, profil de compatibilité et coûts mesurés manquent encore pour satisfaire les critères GEN-02. Aucun finding P0/P1 de sécurité n’a été relevé.

## Revue de suivi — correctif smoke editor

`/root/gen01_qa` confirme que `@design-workbench/catalog@0.3.0` est une dépendance workspace locale verrouillée et n’ajoute aucun paquet externe ; le favicon statique en data URI n’ajoute ni script ni ressource externe. La preuve smoke est suffisante pour la résolution du serveur de développement : montage de l’application, absence d’overlay, erreurs console/page et réponses HTTP ≥ 400 contrôlés, plus capture du layout. Aucun finding P0/P1 n’a été relevé. Le build post-correctif est maintenant exécuté et réussi ; le smoke et l’évidence sont documentés.

La console Vite produit durant les interactions un avertissement Puck `setData` coûteux. Aucun test n’échoue et aucun temps de performance n’est mesuré ; le point reste à surveiller, sans ouvrir de dette distincte à ce stade.

## Preuves observées

| Scénario | Résultat |
|---|---|
| `npm run test:catalog` | Réussi, 15/15 |
| `npm run typecheck` | Réussi |
| `npm run build` | Réussi ; avertissements Rolldown `use client` provenant de dépendances |
| Chromium composé | Réussi, 1/1 avec `npx.cmd playwright test --config playwright.catalog.config.ts --reporter=list` ; keyframes d’opacité, translations, échelle, rotation et flou vérifiées |
| Mouvement réduit | Réussi dans le même test : coupé hors canevas, opt-in uniquement dans le canevas |
| `npm run check` | Réussi, révision du registre 39 |
| Smoke editor | Réussi, 1/1 : aucun overlay, erreur console/page ou réponse HTTP en échec ; capture `editor-workspace-smoke.png` |
| Suite Playwright complète | Réussie, 38/38 après les changements workspace et smoke |
| Revue indépendante du correctif smoke | `/root/gen01_qa` : pas de finding P0/P1 ; critère smoke suffisant |
| `python scripts/check_contracts.py` local | Non démarré : `jsonschema` absent de l’environnement Python |
| GitHub Actions `b10a2f0` | Quality #78 réussie sur le dernier commit distant au moment de cette revue ; validation des contrats incluse, mais pas encore les correctifs smoke locaux |
| Build après le correctif workspace/favicon | Réussi ; seuls les avertissements Rolldown `use client` des dépendances restent présents |
| Fournisseur réel / ChatGPT Desktop | Non testé par cette revue |

## Écarts ouverts

- `CATALOG_RELEASE` et les entrées restent `NOASSERTION` / `license-pending`; aucune licence de racine ni notice complète ne permet d’autoriser l’export.
- L’empreinte des sources, styles, assets et lockfile n’est pas calculée ; `source-hash-pending` empêche d’identifier une release reproductible.
- Les coûts de rendu, transfert et usage GPU ne sont pas mesurés.
- Les 39 bibliothèques listées depuis les captures ne sont pas auditées ; elles ne sont ni installées ni recommandées comme intégrables.
- La génération en langage naturel vers les primitives `composed`, la sélection de modèle et le filtre de secrets appartiennent à GEN-03 et ne sont pas livrés ici.
- ARC-01 demeure bloqué sur la preuve dans ChatGPT Desktop. Le skill `computer-use` interdit d’automatiser cet hôte ; l’ouverture via le connecteur Manifest local ne constitue pas cette preuve.

## Décision

**GEN-02 : à reprendre (`REVISE`), non soumis et non clôturé.** Le défaut d’import catalogue et le favicon 404 sont corrigés, le smoke et la suite E2E complète passent, et le build post-correctif est réussi. Continuer l’audit de provenance/licence, le hash reproductible, la mesure de coût et l’audit des bibliothèques dans GEN-02 ; ne pas exporter cette baseline. GEN-03 reste inéligible tant que GEN-02 n’est pas terminé.

La validation `loop-verify` n’est pas revendiquée : deux tentatives précédentes ont échoué (une requête trop large rejetée, puis un espace de revue isolé sans les fichiers). La limite atteinte a été conservée plutôt que de prétendre à un verdict.
