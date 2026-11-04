# GEN-02 — preuve partielle de fondation du catalogue

Date : 2026-11-04  
État proposé : `in_progress` — ne pas soumettre ni clôturer le ticket.

## Résultat vérifié

- Package `@design-workbench/catalog` en release locale `manifest-core@0.3.0` avec arbre de page typé : IDs/versions de composants, props strictes, slots et mouvements versionnés.
- Premiers rendus React locaux : navigation à menu natif accessible, primitives Section/Hero/Stack/Grid/Heading/Text/Button, fond nuageux SVG/CSS, graphiques line/bar/area limités aux données synthétiques.
- Presets fade/slide bornés en durée, délai, amplitude/opacité. Le résolveur et les styles respectent `prefers-reduced-motion`; l'aperçu autorise une exception explicite volatile et locale au canevas. Un mouvement slide seul reste opaque; seul un preset fade modifie l'opacité.
- Le registre des 39 noms trouvés dans les captures indique explicitement « candidat non audité », licence et version non vérifiées, paquet non installé et non admis. Aucun moteur tiers n'a été ajouté ; React 19.3.1 est une peer dependency existante (licence MIT déclarée par son package installé).
- Profil de direction inspiré d’Unslop, attribution conservée à Damir Sokolovsky sous CC BY 4.0, avec les neuf passes configurées. Ce profil n’autorise pas une animation absente du catalogue.
- Le `CatalogPage` est désormais intégré au `Snapshot`, au contrat M0, aux propositions simulées et à l'aperçu React local. Cela prouve l'intégration du runtime local, pas une génération par API de modèle réelle.

## Vérifications exécutées

- `npm test` — 22 réussis et 1 ignoré pour la création de lien symbolique interdite sur Windows ; catalogue 12/12.
- `npm run test:m0` — 72/72 réussis, dont le client HTTP local, la ressource MCP autonome et l'intégration Snapshot/catalogue. Réseau local autorisé pour ce test.
- `npm run test:providers` — 29/29 réussis avec simulateurs ; aucun appel payant ni fournisseur réel.
- `npm run typecheck`, `npm run build` et `npm run check` — réussis ; build avec avertissements Rolldown `use client` provenant des dépendances et avertissement Puck `setData` durant les parcours.
- Playwright Chromium : suite complète 35/35 réussie ; relance ciblée post-correctif 4/4, couvrant réduction activée par défaut, opt-in/out dans le seul canevas, 375 px sans débordement horizontal, déplacement vers le haut et opacité pleine d'un slide seul.
- Tests unitaires d'analyse locale — 13/13 ; catalogue — 12/12, dont versions/références inconnues, paramètres invalides, données, slots, budgets, mouvement réduit et slide pur.
- Capture de la composition desktop : `.team/screenshots/empty-start/08-sales-dashboard-preview.png`. Capture du contrôle sur téléphone émulé : `.team/screenshots/empty-start/09-reduced-motion-toggle-active.png`.

## Écarts qui interdisent la clôture

- La licence de la release interne reste `NOASSERTION` et le dépôt n’a pas de licence racine ; l’export/distribution de ce code n’est pas autorisé par cette preuve.
- L’intégrité SHA-256 du code source, des styles et des assets n’est pas calculée. `catalogMetadataDigest()` empreinte seulement le manifeste sérialisé ; `CATALOG_RELEASE.integrity` est volontairement `source-hash-pending`.
- Le coût, le poids transféré, le temps de rendu, la consommation GPU et les performances de la page ne sont pas mesurés ; le profil affiche `measurement: pending`.
- Aucun paquet externe des captures n’est encore installé, vérifié ou lié à un rendu. Il reste à consulter les sources officielles, vérifier licences/versions/compatibilité et mettre à jour le lockfile avant admission.
- Les presets actuels sont toujours un catalogue fini. Les primitives déclaratives plus larges (opacity, X/Y, scale, rotation, blur, easing et répétition) ainsi que leur composition par langage naturel sont cadrées dans GEN-02/GEN-03 et ne sont pas encore implémentées dans cette release.
- L'adaptateur fournisseur est couvert par des tests simulés ; aucun vrai fournisseur de modèle n'a été configuré ni appelé. Le brief et le Snapshot sont transmis tels quels au modèle sélectionné ; la détection locale de secrets dans leur texte est requise par GEN-03 et reste à construire.
- Le navigateur est Chromium/Playwright sur viewports configurés, pas un appareil mobile physique ni le véritable hôte ChatGPT Desktop.

## Dettes et suite

- Backend : définir le hash reproductible de release sur sources/styles/assets + lockfile et valider les fixtures de release.
- Responsable catalogue/design : trancher la licence racine du dépôt et auditer une première sélection de bibliothèques avant installation.
- Backend : définir le hash reproductible de release sur sources/styles/assets + lockfile ; GEN-02 reste `in_progress`.
- Responsable catalogue/design : fixer la licence racine et auditer les bibliothèques mentionnées avant toute admission ; aucun paquet des captures n'a été installé.
- QA/performance : mesurer le coût/poids/rendu sur fixtures desktop/mobile et refaire navigation tactile/appareil réel avant fermeture.
- Backend/GEN-03 : générer les primitives paramétrables à partir du langage naturel, auditer le profil Unslop, et filtrer les secrets avant le transfert à un fournisseur réel.
