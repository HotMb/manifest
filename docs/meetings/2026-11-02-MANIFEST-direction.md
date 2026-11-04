# Réunion de fin de tâche — direction Manifest

Date : 2 novembre 2026  
Objet : appliquer la direction Figma validée à l'atelier de composition

## Décisions

- La coque de l'éditeur adopte la direction Manifest : description à gauche, aperçu web blanc au centre, suggestions et réglages à droite, puis un rapport de conception et un état de version.
- La pause d'analyse est fixée à 1,5 seconde. La composition clavier est respectée et les anciennes pistes sont invalidées immédiatement lorsqu'une nouvelle intention arrive.
- Cette tranche utilise des règles locales déclarées. Elle ne prétend pas appeler ChatGPT, Claude ou un autre modèle tant que le connecteur n'est pas implémenté et vérifié.
- Une suggestion est appliquée uniquement après une action explicite. Les opérations passent par le contrat canonique du document et refusent une page devenue obsolète.
- Le rapport distingue la version enregistrée, la copie ouverte et les limites de la qualification. Il peut être copié ou téléchargé en JSON.
- Le thème de la page créée reste indépendant de la coque sombre de Manifest.

## Réalisé

- Coque responsive Manifest et panneaux mobile.
- Analyse locale, états d'attente, suspension, IME et stale guard.
- Suggestions de palette, mouvement et contenu avec application explicite.
- Modal « Rapport & version », statut d'analyse honnête et export JSON.
- Tokens visuels centralisés dans `DESIGN.md` et bundle sans import CSS distant pour la police Puck.
- Tests navigateur adaptés au nouveau parcours « Réglages ».

## Preuves

- `npm run typecheck --workspace @design-workbench/editor-web` : PASS.
- `npm run build --workspace @design-workbench/editor-web` : PASS.
- `npx tsx --test apps/editor-web/test/manifest-analysis.test.ts` : 7 PASS.
- `npm run test:m0` : 31 PASS.
- `npm run test:e2e` : 8/8 PASS.
- `npm run check` : 26 tickets valides.
- Revue QA : 18 contrôles de parcours et 8 recontrôles ciblés PASS, dans `docs/evidence/MANIFEST/review.md`.
- Vérification indépendante loop-verify : PASS sur les 5 critères de la tâche.

## Dette technique et risques

- Les suggestions sont locales ; aucune API de modèle n'est encore branchée.
- L'ouverture dans le vrai ChatGPT desktop, le bridge et le transfert automatique vers les documents du projet restent à qualifier sur l'hôte réel.
- Les numéros actuels suivent les brouillons enregistrés, pas encore un historique de révisions approuvées avec comparaison et restauration.
- Le rapport décrit le design mais ne produit pas encore l'application complète ni un export de code.
- Deux feuilles CSS existent encore (`style.css` historique et `manifest.css`) ; elles doivent être consolidées après stabilisation de l'intégration.
- La fidélité exacte aux pixels Figma n'est pas déclarée : la composition et la palette ont été reprises, mais la validation sur les frames originales doit être faite avec une capture de référence accessible.

## Prochain incrément proposé

1. Ajouter un adaptateur de fournisseur de modèle derrière le même contrat structuré que les règles locales, avec coût, latence, annulation et reprise visibles.
2. Qualifier le chargement dans ChatGPT desktop et le transfert d'un rapport via le bridge disponible.
3. Introduire une entité de révision approuvée séparée du brouillon, avec diff, restauration et métadonnées.
4. Consolider les styles et ajouter ces scénarios au pipeline CI de l'équipe.
