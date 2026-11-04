# GEN-02 — preuve partielle de fondation du catalogue

Date : 2026-11-04  
État proposé : `in_progress` — ne pas soumettre ni clôturer le ticket.

## Résultat vérifié

- Package privé `@design-workbench/catalog` sur la baseline interne provisoire `manifest-core@0.3.0`, avec arbre de page typé : IDs/versions de composants, props strictes, slots et mouvements versionnés. Aucun GitHub Release n’existe au 4 novembre 2026 ; cette baseline n’est ni immuable ni exportable. Le contrat de sortie est précisé dans [`CATALOGUE.md`](../../spec/CATALOGUE.md).
- Premiers rendus React locaux : navigation à menu natif accessible, primitives Section/Hero/Stack/Grid/Heading/Text/Button, fond nuageux SVG/CSS, graphiques line/bar/area limités aux données synthétiques.
- Les cinq presets fade/slide historiques restent compatibles. `composed@2.0.0` ajoute des pistes déclaratives composables : opacité, translations X/Y, échelle, rotation et flou. Chaque primitive part de son amplitude numérique bornée et rejoint sa valeur neutre; combiner opacité et translation produit un fade + déplacement. Durée (0–3000 ms), délai (0–2000 ms), easing enum, répétition (1–4) et nombre de pistes (1–6) sont validés. Les propriétés inconnues, doublons, amplitudes hors limites et valeurs CSS/JS libres sont refusés. Le résolveur ne fabrique le style qu'à partir de nombres validés et d'easing autorisés.
- Le rendu respecte `prefers-reduced-motion` via media query. L'unique exception est l'opt-in volatile du canevas d'aperçu; les cinq mouvements historiques gardent leurs classes et leur comportement. Les pages de fixture en `manifest-core@0.3.0` restent valides, sans migration de payload.
- Le registre des 39 noms trouvés dans les captures indique explicitement « candidat non audité », licence et version non vérifiées, paquet non installé et non admis. Aucun moteur tiers n'a été ajouté ; React 19.3.1 est une peer dependency existante (licence MIT déclarée par son package installé).
- Profil de direction inspiré d’Unslop, attribution conservée à Damir Sokolovsky sous CC BY 4.0, avec les neuf passes configurées. Ce profil n’autorise pas une animation absente du catalogue.
- Le `CatalogPage` est désormais intégré au `Snapshot`, au contrat M0, aux propositions simulées et à l'aperçu React local. Cela prouve l'intégration du runtime local, pas une génération par API de modèle réelle.
- Le navigateur a révélé que `apps/editor-web` importe `@design-workbench/catalog` sans le déclarer dans ses dépendances directes. Le package `0.3.0` est maintenant déclaré comme dépendance workspace dans `apps/editor-web/package.json` et `package-lock.json` ; aucune dépendance externe n’a été ajoutée. Un favicon SVG statique en data URI évite aussi le 404 `/favicon.ico` observé au smoke.
- Le test [editor-workspace-resolution.spec.ts](../../../tests/e2e/editor-workspace-resolution.spec.ts) ouvre le vrai serveur Vite, vérifie le montage React, l’absence d’overlay de résolution, d’erreurs console/page et de réponses HTTP ≥ 400. Il passe 1/1. La capture 1280 × 720 est [editor-workspace-smoke.png](editor-workspace-smoke.png) ; elle montre la surface unique montée avec canevas initial vide, sans contexte de chat.

## Vérifications exécutées

- `npm run test:catalog` — 15/15 réussis après l'ajout du mouvement déclaratif, dont composition, limites numériques, rejet des clés/code libres et reduced-motion.
- `npm run typecheck` complet réussi ; typecheck ciblé du spec navigateur réussi avec `npx.cmd tsc ... tests/e2e/catalog-composed-motion.spec.ts`.
- Avant ces changements, `npm test` avait donné 22 réussis et 1 ignoré pour la création de lien symbolique interdite sur Windows ; le catalogue était alors à 12/12. La suite E2E complète a depuis été relancée après `composed@2.0.0` et les correctifs workspace/UI : 38/38 réussis.
- `npm run test:m0` — 72/72 réussis, dont le client HTTP local, la ressource MCP autonome et l'intégration Snapshot/catalogue. Réseau local autorisé pour ce test.
- `npm run test:providers` — 29/29 réussis avec simulateurs ; aucun appel payant ni fournisseur réel.
- `npm run typecheck`, `npm run build` après les correctifs et `npm run check` — réussis ; build avec avertissements Rolldown `use client` provenant des dépendances. La Vite console affiche un avertissement Puck `setData` coûteux durant les parcours, sans échec ni erreur navigateur.
- Preuve navigateur isolée `npx.cmd playwright test --config playwright.catalog.config.ts --reporter=list` — Chromium/Chrome réel, 1/1 réussi. Le test rend la page catalogue avec `composed@2.0.0`, vérifie nom/durée/délai/easing/répétitions et échantillonne les frames opacity, translation, échelle, rotation et blur; il vérifie aussi `prefers-reduced-motion` hors aperçu puis l’opt-in limité au canevas.
- Suite E2E complète `npx.cmd playwright test --config playwright.config.ts --reporter=list` — **38/38 réussis** en environnement autorisé avec serveur Vite sur localhost ; cela inclut le smoke editor 1/1 et les tests de debounce exact, retouche, IME, dashboard ventes/nuages/graphiques, vitesse, reduced-motion et lancement contextuel. La capture smoke prouve le montage du layout mais pas le contexte réel de ChatGPT Desktop.
- Avant l’ajout de `composed@2.0.0`, Playwright Chromium avait réussi 36/36 et les tests ciblés reduced-motion/déplacement 4/4 sur le HEAD `8873a70`. La relance globale locale après le nouveau code a attendu un serveur de développement absent sur le port 4173 puis a été interrompue sans résultat ; elle n’est pas comptée comme réussie.
- Tests unitaires d'analyse locale — 13/13 lors du passage précédent ; le catalogue est maintenant à 15/15, dont versions/références inconnues, paramètres invalides, données, slots, budgets, primitives composables, mouvement réduit et slide pur.
- Capture de la composition desktop : `.team/screenshots/empty-start/08-sales-dashboard-preview.png`. Capture du contrôle sur téléphone émulé : `.team/screenshots/empty-start/09-reduced-motion-toggle-active.png`.

## Écarts qui interdisent la clôture

- La licence de la release interne reste `NOASSERTION` et le dépôt n’a pas de licence racine ; l’export/distribution de ce code n’est pas autorisé par cette preuve.
- L’intégrité SHA-256 du code source, des styles et des assets n’est pas calculée. `catalogMetadataDigest()` empreinte seulement le manifeste sérialisé ; `CATALOG_RELEASE.integrity` est volontairement `source-hash-pending`.
- Le coût, le poids transféré, le temps de rendu, la consommation GPU et les performances de la page ne sont pas mesurés ; le profil affiche `measurement: pending`.
- Aucun paquet externe des captures n’est encore installé, vérifié ou lié à un rendu. Il reste à consulter les sources officielles, vérifier licences/versions/compatibilité et mettre à jour le lockfile avant admission.
- Le runtime accepte maintenant les primitives déterministes du contrat; il ne transforme pas encore à lui seul une description en langage naturel en pistes déclaratives. L'appel modèle, son mapping validé vers le contrat et la composition conversationnelle restent hors de cette preuve et doivent être traités dans GEN-03.
- L'adaptateur fournisseur est couvert par des tests simulés ; aucun vrai fournisseur de modèle n'a été configuré ni appelé. Le brief et le Snapshot sont transmis tels quels au modèle sélectionné ; la détection locale de secrets dans leur texte est requise par GEN-03 et reste à construire.
- La baseline `0.3.0` reste un identifiant interne de développement. Avant tout export, produire une release catalogue immuable et vérifier la compatibilité des brouillons qui la référencent.
- Le navigateur est Chromium/Playwright sur viewports configurés, pas un appareil mobile physique ni le véritable hôte ChatGPT Desktop.

## Dettes et suite

- Backend : définir le hash reproductible de release sur sources/styles/assets + lockfile ; GEN-02 reste `in_progress`.
- Responsable catalogue/design : fixer la licence racine et auditer les bibliothèques mentionnées avant toute admission ; aucun paquet des captures n'a été installé.
- QA/performance : mesurer le coût/poids/rendu sur fixtures desktop/mobile et refaire navigation tactile/appareil réel avant fermeture.
- Backend/GEN-03 : connecter le mapping des demandes en langage naturel aux primitives, étudier la méthode de revue Unslop sans profil fixe, et vérifier le traitement des secrets avant un transfert réel à un fournisseur.
