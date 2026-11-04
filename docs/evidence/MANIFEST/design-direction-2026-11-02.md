# Evidence — direction de conception approuvée Manifest

Date : 2 novembre 2026
Portée : alignement documentaire après validation par le commanditaire des trois captures de référence.

## Résultat attendu

- Invocation depuis un chat de projet vers une carte « Ouvrir Manifest » ; `@Manifest`/sélection d'application documenté comme chemin fiable, slash natif non revendiqué.
- Coque sombre et espace desktop en trois zones : champ d'intention, aperçu dominant, rail de suggestions.
- Suggestions réactives après une pause unique de 1,5 s, leurs sources et états visibles, avec aperçu stable pendant la préparation.
- Version immuable, rapport lié à un hash et à la provenance effective, revue avant transmission explicite au chat.

## Références des captures et correspondance

1. **Capture 1 — chat ChatGPT / projet Design** : message avec l'intention de créer un annuaire et carte avec appel `/manifest` (l'illustration utilise `/transférer`), puis bouton cyan « Ouvrir Manifest ». Le cadrage conserve la carte et le CTA, remplace le nom de produit par Manifest et traite le slash comme alias à qualifier ; la mention/sélection de l'application est le fallback documenté.
2. **Capture 2 — Manifest vide** : shell sombre, barre d'étapes en haut, champ d'intention à gauche, canevas web blanc vide au centre, commandes de viewport et indication « interprétation après 1,5 s ». Les documents reprennent ce vide initial et ce délai, sans rendre le thème blanc obligatoire pour les pages créées.
3. **Capture 3 — composition de l'annuaire** : prompt et modification récente à gauche, page claire d'équipe au centre, rail « Suggestions » à droite avec cartes membres/hover/animation, accents cyan et violet. Les documents placent les suggestions à droite, ajoutent raison/source/version et états de sélection, et gardent l'annuaire comme fixture de démonstration plutôt que capacité M0.

## Documents alignés

`DESIGN.md`, `UX-CONTRACT.md`, `docs/design/CONCEPTION.md`, `docs/spec/PRODUCT.md`, `docs/spec/CATALOGUE.md`, `docs/spec/CONTRACTS.md`, `docs/spec/ARCHITECTURE.md`, `docs/spec/DECISIONS-SOURCES.md`, `docs/spec/DELIVERY.md`, `docs/adr/0002-manifest-workspace-and-handoff.md` et `docs/STATUS.md`.

## Contributions de revue

- `arc01_design_review` a identifié les écarts entre les documents existants et la direction décrite : primary lime vs accent cyan, suggestions à gauche dans le contrat UX, délai de 900 ms dans le brief/produit, et affirmation dépassée qu'aucun prototype n'existait. L'agent n'a pas vu les captures elles-mêmes ; ses commentaires sur les couleurs se basent sur leur description, sans prétendre en extraire des valeurs exactes.
- `arc01_qa` a fourni des critères testables pour l'invocation, le fallback, la largeur mobile, le délai exact, l'obsolescence, la provenance, la conservation, le rapport, le transfert et les révisions. Sa revue n'a pas exécuté ChatGPT Desktop.
- L'orchestrateur a vérifié le code actuel et a constaté dans `apps/editor-web/src/main.tsx` que `reportDocument()` prend le fournisseur du sélecteur actif et que son `upToDate` ne reprend pas toutes les conditions `proposalEligible`. C'est un défaut à corriger avant une transmission réelle, pas une fonctionnalité déjà livrée.

## Vérifications exécutées

- `npm run check` : PASS, 26 tickets valides, révision 3 inchangée.
- `git diff --check` : PASS ; Git a seulement signalé que les fins de ligne CRLF de `docs/spec/DELIVERY.md` seront normalisées en LF.
- Recherche documentaire des anciennes valeurs `900 ms` et de l'ancienne disposition : aucune occurrence dans les documents normatifs ciblés.
- Aucun test runtime n'a été lancé : ce changement est documentaire et n'a pas modifié de code.
- Statut des tickets inchangé ; `npm run team:next` indique zéro ticket éligible et ARC-01 reste bloqué en attente de preuve hôte/identité.
- Relecture loop-verify : 1er passage FAIL sur la référence explicite des captures, la restriction des suggestions aux entrées admissibles et l'absence de preuve d'éligibilité/hash déterministe. Ces trois points ont été ajoutés aux documents/evidence. Le 2e passage n'a retourné aucun verdict parseable (aucun état par critère) ; la limite de deux tentatives est atteinte et aucun PASS n'est revendiqué.

## Non prouvé / limites

L'ouverture et le rendu réels dans ChatGPT Desktop, un alias slash natif, le fallback navigateur de production, l'envoi `ui/message`, le stockage durable des révisions, l'appel réel du fournisseur, le contraste WCAG des couleurs approximatives et la recette mobile dans le panneau hôte restent à démontrer. Le mock annuaire d'équipe est une fixture de direction ; le prototype M0 reste un éditeur à bloc unique.
