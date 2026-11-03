# Preuve de disponibilité et audit des PR — ARC-01 — 3 novembre 2026

## Résultat

Un prototype local est accessible à [http://127.0.0.1:5173/](http://127.0.0.1:5173/) tant que le serveur de développement de cette session reste actif. L’essai est possible dans le navigateur ; il ne vaut pas validation dans ChatGPT Desktop.

## Séparation entre code commité et travail local

- Au début de l’audit, le HEAD `f95c29751ae09abfc0dc23cc72a78b1e5bf50929` sur `work/arc-01` correspondait à `origin/work/arc-01-qualification`.
- Après ce contrôle, des changements applicatifs non attribués sont apparus dans le dossier de travail. Ils sont laissés intacts, non commités et non poussés. Ils ne font pas partie de la PR #27 ni de GitHub Actions run 56.
- Ces changements font évoluer l’écran vers une seule surface avec brief à gauche, aperçu au centre et suggestions à droite, et ajoutent un contexte de lancement. Le reviewer a confirmé la correction locale d’un problème de conservation du contexte après édition et sauvegarde. La comparaison design n’est pas une approbation Figma complète.
- La recherche de catalogue, les démonstrations d’animations, l’insertion par glisser-déposer, `/validate` vers le chat, les opérations réelles de projets/pages et le versionnement durable ne sont toujours pas démontrés.
- Revue de code : certains fonds gris, dont `#757575` et `#777777`, ne passent pas le contraste de texte de 4,5:1. Le travail local ne doit pas être intégré sans correction et sans établir sa provenance.

## Résultats de tests sur le travail local observé

| Vérification | Résultat | Limite |
|---|---|---|
| `npm run typecheck` | Réussi | État local uniquement |
| `npm run build` | Réussi | Environ 2,22 Mo, gzip ~777 Ko ; avertissements de dépendances Vite `use client` |
| `npm test` | 21/21 réussis | Pas d’API fournisseur réelle |
| `npm run test:m0` | 66/66 réussis | Après relance avec accès loopback |
| `npm run test:providers` | 28/28 réussis | Contrats/simulateurs seulement |
| `npm run test:e2e` | 25/25 réussis | Chrome installé, port isolé 4195 ; ne teste pas l’hôte ChatGPT |
| `npm run smoke:desktop-plugin` | Réussi | Vérifie le transport MCP local, pas l’intégration dans ChatGPT Desktop |
| `npm run check` | Réussi | 26 tickets, registre révision 14, 0 éligible |
| `git diff --check` | Réussi | Contrôle de forme du diff |
| Contrats Python (`scripts/check_contracts.py` et unittest) | Non exécutables | Le module Python `jsonschema` manque dans l’environnement |
| Audit premium UI strict | Un finding bloquant | Propriété du `<select>` natif non décidée dans `apps/editor-web/src/model-provider-panel.tsx:21` |
| Audit des ajouts textuels | Aucun secret confirmé | Une fausse alerte heuristique correspond à un SHA ; les binaires n’ont pas été examinés par OCR |

Le build émet des avertissements de bundle et des directives `use client` dans des dépendances. Les parcours E2E ont aussi montré des avertissements Puck `setData` coûteux, sans mesure de performance associée.

## CI committée

GitHub Actions Quality run 56 est vert sur le commit commité `f95c297`. Le rapport ne l’attribue pas aux changements locaux apparus ensuite.

## Inventaire PR

- Une seule PR ouverte : [#27](https://github.com/HotMb/manifest/pull/27).
- Statut : ouverte, en brouillon, sans conflit indiqué ; tête `f95c297`, base `bfb5d8f`.
- 27 commits, 143 fichiers modifiés (+12 942 / −158), aucune revue soumise ni discussion inline.
- Le corps de la PR pointe encore vers la révision 3 du registre ; le registre local est en révision 14.
- **Décision : ne pas fusionner.** L’absence de conflit et la CI verte ne satisfont pas le gate produit ARC-01.

## Gate toujours bloqué

`ARC-01` est bloqué ; `ARC-02` dépend d’ARC-01, `ARC-03` dépend d’ARC-01 et ARC-02, et `npm run team:next` ne propose aucun ticket. Le vrai ChatGPT Desktop n’a pas été manipulé pendant l’audit. Il faut encore documenter sans secret le lancement depuis le chat, l’identité/bridge, la lecture du contexte, une modification sauvegardée et les capacités disponibles de l’hôte.

## Portée du résultat loop-verify

La seconde passe loop-verify a évalué le rapport d’audit en français et a passé 6/6 critères. Elle a eu lieu avant la découverte du travail applicatif local non attribué. Elle ne certifie donc pas ce code. La limite de deux passes a été atteinte ; pas de nouvel appel.

Compte rendu d’équipe : [revue de disponibilité du 3 novembre](../../meetings/2026-11-03-ARC-01-delivery-review.md).
