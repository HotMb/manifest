# Revue de tâche — GEN-02 — 4 novembre 2026

## Identification

| Champ | Valeur |
|---|---|
| Tâche / ticket | GEN-02 — Catalogue local de composition versionné, tranche de mouvement composé |
| Date et mode | 4 novembre 2026, revue asynchrone avec compte rendu dans Git |
| Branche / version du suivi | `work/arc-01`, registre révision 36 ; GEN-02 commité et poussé dans `b10a2f0` |
| HEAD distant connu | `b10a2f09e4b09cf054549d42b415fd632238da8f`; GitHub Actions Quality #78 réussie |
| Environnement | Windows, Node, build Vite, Chrome/Chromium local, runner GitHub Actions |
| Responsable | `/root`, orchestrateur |
| Preuves | [Implémentation partielle](../evidence/GEN-02/implementation.md), [revue QA](../evidence/GEN-02/review.md), [contrat du catalogue](../spec/CATALOGUE.md), PR #27 brouillon |

## Participants et contributions

| Agent | Rôle | Contribution reçue | Limite |
|---|---|---|---|
| `/root/gen02_motion_primitives` | Backend, propriétaire des fichiers catalogue | Ajout de `composed@2.0.0`, tests de contrat et test Chromium des keyframes, mouvement réduit et opt-in du canevas ; mise à jour de l’évidence. | N’a ni modifié les tickets ni committé/poussé GEN-02. Aucun appel modèle réel. |
| `/root/gen01_qa` | QA indépendant | Deux revues successives : a demandé la preuve navigateur, la clarification de version et les métadonnées ; a confirmé que le test couvre maintenant aussi échelle et rotation. Verdict global `REVISE`, aucun finding P0/P1 de sécurité. | Revue de code et d’artefacts locaux, pas du fournisseur ni de l’hôte ChatGPT Desktop. |
| `/root` | Orchestrateur / responsable de livraison | A identifié et corrigé un mauvais chemin de fixture dans le validateur Python, étendu le ticket via le CLI, ajouté une config Playwright isolée, puis revérifié les tests et le suivi. | Le code GEN-02 est poussé ; la licence, le hash source, les coûts et l’audit des dépendances restent ouverts. |

## Résultat observé

Le catalogue reçoit maintenant un mouvement déclaratif versionné qui combine opacité, translations X/Y, échelle, rotation et flou. Les amplitudes, durées, délais, easings, répétitions et nombre de pistes sont bornés ; le renderer construit les valeurs CSS à partir de nombres et d’une liste d’enums validés. Les cinq presets précédents restent compatibles.

Le nouveau test Chromium prouve la transformation d’état initial à final, ainsi que le comportement `prefers-reduced-motion`. Le mouvement est coupé hors aperçu ; l’opt-in n’agit que dans le canevas.

Cette tranche ne fait pas encore comprendre au modèle une description libre comme « fais apparaître une carte avec un mouvement doux vers le bas ». Elle fournit le format sûr et le renderer. La traduction du langage naturel par le modèle sélectionné, les suggestions guidées par la release et le filtre de secrets restent dans GEN-03. Une animation absente du catalogue n’est pas inventée ni exécutée.

## Tests et critères

| Critère | Vérification | Résultat |
|---|---|---|
| Bornes, propriétés inconnues, refus de CSS/JS libre | `npm run test:catalog` | 15/15 réussis |
| Compilation des types | `npm run typecheck` et typecheck ciblé du spec | Réussi |
| Build de l’éditeur | `npm run build` | Réussi ; avertissements Rolldown `use client` de dépendances |
| Mouvement effectif et reduced-motion | `npx.cmd playwright test --config playwright.catalog.config.ts --reporter=list` | 1/1 réussi sous Chromium/Chrome |
| État du registre | `npm run check` | Réussi à la révision 36 |
| Revue indépendante | `/root/gen01_qa` | E2E approuvé, ticket global `REVISE` |
| Suite E2E complète | `npm run test:e2e` sur les changements GEN-02 | Non concluante localement : serveur requis sur le port 4173 non démarré ; arrêt sans résultat. Le précédent 36/36 est sur un HEAD antérieur. |
| Contrats Python sur le poste local | `python scripts/check_contracts.py` | Non démarré, faute du module `jsonschema` |
| GitHub Actions `b10a2f0` | Quality #78 | Réussie sur le commit GEN-02 poussé, validation des contrats incluse |
| Fournisseur / ChatGPT Desktop | Non exécuté | Non démontré ; ARC-01 reste bloqué |

Le premier run CI sur `8873a70` avait échoué car `check_contracts.py` cherchait `snapshot_catalog.json`, alors que le fixture s’appelle `snapshot-catalog.json`. Le correctif `cd9098f` a normalisé le chemin ; la CI complète Quality #78 sur `b10a2f0` passe également. Le poste local ne peut pas rejouer Python tant que `jsonschema` manque.

## Dettes, risques et limites

- **GEN-02 — critères de livraison encore ouverts :** provenance, licence complète, source hash reproductible, coût mesuré et statut d’admission. Les 39 références issues des captures restent candidates, non auditées, non installées et non recommandables comme intégrables.
- **Version de catalogue :** le paquet est privé et aucune GitHub Release n’existe au 4 novembre. `manifest-core@0.3.0` est une baseline interne provisoire, non immuable et non exportable. Avant export, il faudra émettre une version catalogue immuable et prouver la compatibilité des brouillons existants.
- **GEN-03 — exigence utilisateur non livrée :** l’interprétation du langage naturel, les API des modèles sélectionnés, les suggestions à partir des capacités locales, Unslop comme profil de qualité et le filtre de secrets sont à construire après l’acceptation de GEN-02.
- **DEBT-005** reste ouverte : contrats et renderer catalogue sont couplés par l’import React dans M0 ; elle est due au ticket DOM-01 et n’est pas créée par cette tranche.
- **ARC-01** reste bloqué : aucune preuve réelle d’ouverture, identité, lecture, écriture et rafraîchissement dans ChatGPT Desktop. Le skill `computer-use` interdit d’automatiser cet hôte ; l’ouverture via l’outil Manifest local n’est pas une preuve hôte.
- `loop-verify` ne produit pas de verdict sur ces changements : les deux tentatives précédentes ont échoué au contrôle d’entrée / à l’absence des fichiers dans l’espace isolé. Aucun PASS n’est revendiqué.

## Décisions et actions

| Action | Responsable | Suivi |
|---|---|---|
| Maintenir GEN-02 en `in_progress`; ne pas soumettre ni fermer | Orchestrateur | Fait dans le registre révision 36 ; CI distante #78 passée sur `b10a2f0` |
| Définir licence/provenance, hash reproductible et mesure de coût | Backend/catalogue | Restant dans GEN-02 avant clôture ou export |
| Auditer une à une les dépendances proposées à partir de sources officielles | Responsable catalogue | Restant dans GEN-02 ; ne rien installer avant validation |
| Implémenter interprétation modèle → opérations structurées, filtre de secrets et tests multi-adaptateurs | Backend | GEN-03, dépend de GEN-02 |
| Réaliser la preuve dans ChatGPT Desktop | Orchestrateur + commanditaire | ARC-01 ; action manuelle nécessaire selon la règle du skill |
| Conserver PR #27 en brouillon jusqu’aux critères de merge | Orchestrateur | En cours ; pas de fusion ni de passage en ready |

## Verdict

**GEN-02 : à reprendre (`REVISE`).** La composition déterministe et son rendu navigateur sont démontrés ; les métadonnées, la provenance/licence, le hash et le coût ne satisfont pas encore le ticket. Le mouvement composé peut rester dans la branche comme tranche intermédiaire, mais il ne s’agit pas de la génération générale en langage naturel demandée. GEN-03 reste inéligible tant que GEN-02 n’est pas terminé.

Le registre est à la révision 36 ; `BOARD.md` a été généré depuis le registre et `npm run check` passe.
