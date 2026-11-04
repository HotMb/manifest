---
version: alpha
colors:
  background: "#151515"
  surface: "#1F1F1F"
  primary: "#68D5E3"
  suggestion: "#927AE6"
  foreground: "#F4F2EC"
  secondary: "#A6A6A0"
  border: "#FFFFFF14"
typography:
  sans:
    fontFamily: "Instrument Sans, Arial, sans-serif"
  mono:
    fontFamily: "IBM Plex Mono, monospace"
rounded:
  control: "8px"
  panel: "12px"
spacing:
  unit: "4px"
  controlGap: "8px"
  panelPadding: "16px"
components:
  SelectionOutline:
    color: "#68D5E3"
  InspectorPanel:
    padding: "16px"
---

# Identité de l'éditeur Manifest

Contrat visuel de la coque Manifest. Les captures validées le 2 novembre 2026 restent la référence d'identité ; le cadrage du 3 novembre ci-dessous remplace leur navigation par étapes par une surface unique de travail. Le cyan signale les actions et la sélection ; le violet distingue les suggestions d'animation. Ces accents appartiennent à l'éditeur et ne dictent pas le thème de la page créée. Les valeurs extraites des captures sont des approximations de départ ; leurs contrastes doivent être vérifiés au ticket UX-01. Les styles de l'éditeur sont générés ou dérivés d'une seule source de tokens ; les autres fichiers ne doivent pas maintenir des copies divergentes.

## Overview

Produit : atelier de composition pour une personne qui veut comparer et ajuster un design tout en dialoguant avec une IA. Caractère : précis, calme, manipulable. Univers : table de mise en page, sélection d'objets, mesures et versions. Le contenu créé porte la richesse visuelle ; les outils périphériques restent discrets.

Signature : une proposition et son bloc se mettent en évidence ensemble. Ce lien de causalité doit être immédiatement compréhensible, sans décoration permanente. Éviter les interfaces de chatbot génériques qui réduisent la page à une vignette.

## Colors

Les six couleurs de frontmatter définissent les surfaces, textes et sélection. Primary signifie sélection/action principale ; ne pas teinter tous les panneaux avec l'accent. Les états d'erreur, d'avertissement et de succès reçoivent des tokens sémantiques distincts à vérifier au ticket UX-01 ; ils ne sont jamais indiqués par la couleur seule.

Le contenu de la page possède son propre thème. Un fond sombre choisi pour le site n'assombrit pas automatiquement les champs de l'éditeur, et la coque sombre de Manifest ne force pas les couleurs du site créé. La compatibilité avec les thèmes imposés par l'hôte est testée ; l'éditeur conserve ses tokens dédiés.

## Typography

Instrument Sans pour commandes, labels et textes ; IBM Plex Mono uniquement pour mesures, identifiants courts et métadonnées techniques utiles. Polices et licences figées dans la release. Le corps courant vise 14–16 px et les labels 13–14 px. Exception de l’atelier intégré entre 560 et 767 px : le texte secondaire et les actions compactes peuvent descendre à 11–12 px pour conserver les trois panneaux dans la hauteur hôte ; le champ de saisie reste à 12 px. Sous 560 px, une zone à la fois permet de garder les textes à 12 px ou plus. Aucun texte essentiel ne descend sous 11 px.

Les champs et contrôles restent en français M1. Les pages créées acceptent les textes du projet sans traduction forcée. Les libellés longs ne doivent pas casser la barre d'action.

## Layout

Une seule surface et une seule route de travail réunissent les trois zones. Pas de parcours par étapes « Décrire / Composer / Transmettre » ni de page séparée de réglage de bloc. À gauche : brief éditable, proposition explicitement transmise par ChatGPT, état de pause/analyse et choix du modèle. Au centre : candidat dominant, modifiable par sélection et commandes contextuelles, avec un aperçu du rendu. À droite : champ de recherche dans le catalogue, résultats de composants et d'animations, provenance et démonstrations. Le lancement distingue nouveau projet, nouvelle page dans un projet existant et modification d'une page existante ; la cible/version est visible. Le rail catalogue se replie pour agrandir le canevas ; les explications de la proposition restent associées au brief à gauche.

Le lancement indique explicitement nouveau ou existant, la cible projet/page et la proposition de ChatGPT. Pour une nouvelle page, la base du document est vierge et le candidat reçu apparaît immédiatement en aperçu s'il est valide ; un canevas blanc vide est réservé à l'absence de candidat utilisable. Pour une page existante, charger son Snapshot avant de prévisualiser la proposition comme une modification. Ne jamais remplacer la page existante par une démonstration ou appliquer silencieusement le candidat. L'état proposé, les retouches et la conservation restent visibles dans les deux modes.

Point de départ desktop : gauche 250–280 px, droite 250–280 px, centre fluide. La barre supérieure conserve cible projet/page, fournisseur/modèle choisi, format d'aperçu, Annuler/Rétablir, historique et validation/rapport. Les propriétés d'un bloc sont accessibles depuis sa sélection, dans le canevas ou dans une zone contextuelle à gauche ; elles ne remplacent pas la recherche catalogue à droite et n'exigent pas de changer de page. Le thème du site peut être clair, sombre ou autre, indépendamment de la coque.

Manifest conserve une seule route de travail, bornée à la hauteur du viewport. À partir de 560 px, les trois panneaux — description à gauche, aperçu au centre et suggestions à droite — restent visibles, avec des largeurs adaptées à l'espace disponible. Les panneaux latéraux et l'aperçu défilent intérieurement ; le contenu long n'allonge pas la page globale. Sous 560 px, les commandes « Décrire », « Aperçu » et « Suggestions » affichent une seule zone à la fois dans cette même surface. Elles sélectionnent une zone de travail et n'imposent aucune progression par étapes. Aucun écran séparé de réglage de bloc n'est ajouté. La réduction de largeur préserve la lisibilité des textes essentiels.

Rythme 4 px pour les contrôles, espaces de 8/12/16/24 px et alignements continus. Les boutons ne changent pas de largeur pendant une demande. L'aperçu possède son viewport ; ne pas modifier toute la mise en page du shell pour simuler un téléphone.

## Elevation & Depth

Surfaces séparées par bordures et contraste, ombres réservées aux éléments superposés. Aucun glow ou dégradé décoratif dans la navigation. La sélection reste visible sur une page claire ou sombre via un contour adapté et un label accessible.

## Shapes

Contrôles 8 px, panneaux 12 px. Une forme ne signale pas à elle seule un état. Les éléments de la page suivent les tokens du projet, pas ces rayons de l'éditeur.

## Components

Les contrôles partagés sont définis dans la carte canonique de UX-CONTRACT.md. Les listes de modèles/composants utilisent un Select ou une Combobox accessible, avec états ouvert/vide/erreur. Les icônes viennent d'une seule famille et ne remplacent pas les libellés des actions importantes.

Chaque résultat du catalogue montre une démonstration du composant ou de l'animation au survol, avec le même accès au focus clavier et par une action tactile « Voir la démo ». La démonstration ne modifie pas le document. Prévoir une représentation sans mouvement, un arrêt de la lecture et des actions explicites de prévisualisation et d'ajout. L'édition contextuelle et la recherche restent disponibles dans la même surface.

Le mouvement de l'éditeur explique un changement : sélection, ouverture de panneau, confirmation de conservation. Pas de pulsations ou de mouvements continus. Respecter prefers-reduced-motion. Les indicateurs d'activité ne font pas sauter les contrôles.

## Do's and Don'ts

- Donner de la place à la page, garder les outils lisibles.
- Garder le brief/proposition à gauche, le candidat/aperçu au centre et la recherche catalogue à droite visiblement distincts.
- Indiquer ce qui est proposé, conservé, sauvegardé ou approuvé.
- Montrer la bibliothèque, la version et la provenance utiles à chaque suggestion ; ne pas confondre « trouvée », « prévisualisée » et « ajoutée ».
- Montrer un changement ciblé et annulable ; ne pas animer toute la page à chaque réponse.
- Décrire pourquoi une proposition convient au contenu plutôt que promettre un style « premium » universel.
- Ne pas confondre la méthode Unslop avec une obligation d'uniformiser les sites.
- Ne pas afficher de coût ou de performance comme mesuré si ce n'est qu'une estimation.

## Traçabilité des tokens

Décision initiale : ce fichier possède les valeurs de l'éditeur. Le ticket UX-01 établit un mapping unique vers packages/editor/theme et ses variables CSS. Les valeurs des sites appartiennent au Snapshot.theme. Le catalogue consomme les références du thème et ne copie pas les valeurs de l'éditeur dans les exports.
