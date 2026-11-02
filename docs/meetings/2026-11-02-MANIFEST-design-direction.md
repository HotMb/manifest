# Réunion de fin de tâche — direction Manifest approuvée

Date : 2 novembre 2026
Objet : aligner la conception et le plan de livraison sur les captures validées par le commanditaire.

## Participants et contributions

- **Commanditaire** : a validé le parcours et les ajustements proposés ; les captures restent la référence visuelle produit.
- **Orchestrateur / propriétaire documentaire** : a mis à jour les contrats de conception, le parcours, le rapport et le plan de livraison ; a vérifié le statut et le code du rapport M0.
- **`arc01_design_review`** : revue documentaire en lecture seule ; a relevé les écarts de palette, de placement du rail, de délai et de statut du prototype. L'agent n'a pas vu les images dans son contexte et n'a pas prétendu en extraire des valeurs exactes.
- **`arc01_qa`** : a défini dix critères de recette et relevé un défaut de provenance/éligibilité dans le rapport M0. Aucune recette ChatGPT Desktop n'a été effectuée.

## Résultat

La direction est enregistrée dans `DESIGN.md`, `UX-CONTRACT.md`, `docs/design/CONCEPTION.md`, `docs/spec/PRODUCT.md`, `docs/spec/CATALOGUE.md`, `docs/spec/CONTRACTS.md`, `docs/spec/ARCHITECTURE.md`, `docs/spec/DELIVERY.md` et [ADR-0002](../adr/0002-manifest-workspace-and-handoff.md). Les captures 1, 2 et 3 sont mappées à la conception dans la [preuve documentaire](../evidence/MANIFEST/design-direction-2026-11-02.md).

Les décisions sont :

1. Coque sombre et trois zones : intention à gauche, aperçu au centre, suggestions à droite ; le canevas vide clair n'impose pas le thème du site.
2. Attente unique de 1,5 s hors IME, avec activation explicite de l'automatique ou action manuelle.
3. Suggestions uniquement parmi les candidats admissibles du catalogue ; raison, version, provenance, accessibilité et état visibles ; aperçu avant ajout.
4. `@Manifest`/sélection et carte d'ouverture comme chemin documenté ; `/manifest` et `/validate` restent des alias non garantis par l'hôte.
5. Révision immuable, rapport versionné et hashé avec la provenance du job, relecture, puis transmission explicite ; export séparé et fallback honnête.

Le registre des tickets n'a pas été modifié. ARC-01 reste bloqué par la preuve ChatGPT Desktop et l'identité réelles ; `npm run team:next` indique zéro ticket éligible.

## Vérifications

- `npm run check` : PASS, 26 tickets valides, révision 3.
- `npm run team:next` : aucun ticket éligible.
- `git diff --check` : PASS ; avertissement Git sans défaut whitespace, les fins de ligne de `docs/spec/DELIVERY.md` seront normalisées en LF.
- Recherche documentaire : aucune ancienne mention normative de 900 ms ou de l'ancienne répartition des panneaux.
- Aucun test runtime exécuté, car le lot est documentaire et n'a pas modifié le code.
- Loop-verify, tentative 1 : FAIL sur référence explicite des captures, restriction des suggestions et preuve d'éligibilité/hash déterministe. Les précisions ont été ajoutées.
- Loop-verify, tentative 2 : la réponse ne contient aucun verdict parseable ni résultat par critère. La limite de deux tentatives est atteinte ; aucun PASS n'est déclaré. Le vérificateur est de la lignée Codex/OpenAI, comme l'agent principal ; ce n'est pas une revue cross-vendor.

## Défaut restant et limites

Le rapport actuel dans `apps/editor-web/src/main.tsx` prend le fournisseur/modèle du sélecteur courant et calcule son état « à jour » avec une règle différente de l'éligibilité de l'aperçu. Le rapport peut donc mal attribuer une proposition devenue ancienne. Le propriétaire frontend devra corriger et tester ce comportement dans un ticket éligible avant la première transmission réelle. Ce défaut est une correction à suivre, pas une dette technique acceptée.

La direction à trois zones n'est pas encore implémentée dans le runtime. Restent non prouvés : ouverture et dimensions dans ChatGPT Desktop, alias slash natif, transmission de message par l'hôte, persistance des révisions, appels fournisseur en production, fallback navigateur partagé et contrastes définitifs. Les couleurs notées dans DESIGN.md restent approximatives.

## Verdict et prochaine action

**Verdict : cadrage documentaire aligné sur la direction approuvée ; cette direction d'interface reste à implémenter ; ARC-01 toujours bloqué.** La prochaine preuve à obtenir est l'ouverture de Manifest dans ChatGPT Desktop avec `@Manifest`, puis une modification et une sauvegarde dans cet hôte. Après cette qualification, les critères du rapport et le défaut de provenance pourront être répartis dans les tickets disponibles sans contourner les dépendances du backlog.
