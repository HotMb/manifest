# Preuve locale — surface Manifest limitée à la fenêtre — 3 novembre 2026

## Objectif

Garder l’atelier Manifest dans la hauteur disponible d’une fenêtre ChatGPT de bureau, avec le brief à gauche, l’aperçu au centre et les suggestions/recherche à droite. Éviter que le contenu des panneaux allonge la page entière.

## Changement examiné

- `apps/editor-web/src/main.tsx` ajoute un conteneur flex autour de Puck pour transmettre la hauteur disponible à la grille de l’atelier.
- `apps/editor-web/src/manifest.css` fixe la surface de bureau à `100dvh`, maintient les trois colonnes à partir de 768 px et limite le défilement à chaque panneau latéral et au canevas.

## Observations

- Aperçu local : `http://127.0.0.1:5173/`.
- Le rendu ouvert par l’intégrateur montre l’en-tête, les trois colonnes et la barre d’état simultanément, sans défilement vertical de la page entière. Les panneaux gauche/droit possèdent chacun leur propre défilement.
- L’input du brief à gauche et la recherche de composants à droite sont visibles dès l’ouverture ; l’aperçu central garde une hauteur bornée.
- Revue indépendante du code et de la capture par `/root/viewport_layout_review` : résultat favorable sur une fenêtre 1280×720, sans défaut bloquant observé.
- Revue design indépendante par `/root/viewport_design_review` : les trois zones et les deux entrées restent repérables sur la même surface.

## Vérifications exécutées

| Contrôle | Résultat |
|---|---|
| `npm run typecheck --workspace @design-workbench/editor-web` | Réussi |
| `npm run build --workspace @design-workbench/editor-web` | Réussi ; avertissements existants de directives `use client` pendant l’assemblage |
| `git diff --check` | Réussi |
| Revue visuelle locale du viewport desktop | Réussi : aucune barre de défilement de page entière ; défilement interne des panneaux |
| Tests automatisés | Non exécutés pour ce correctif |
| ChatGPT Desktop réel | Non vérifié dans cette revue |

## Limites et décision

- La disposition sous 768 px reste une mise en page mobile empilée et peut dépasser une hauteur d’écran. Cette revue valide le format de fenêtre desktop demandé ; elle ne certifie pas un atelier trois colonnes sur téléphone.
- `npm run team:next` retourne zéro ticket actif éligible. Aucun statut de ticket ni le gate ARC-01 n’a été modifié. Le parcours réel dans ChatGPT Desktop et la qualification d’identité restent à prouver séparément.

Conclusion : correction favorable pour un viewport desktop ; les preuves locales ne valent pas preuve d’exécution dans ChatGPT Desktop.
