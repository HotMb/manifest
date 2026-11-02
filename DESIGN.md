---
version: alpha
colors:
  background: "#151515"
  surface: "#1F1F1F"
  primary: "#D5FF5C"
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
    color: "#2454C6"
  InspectorPanel:
    padding: "16px"
---

# Identité de l'éditeur Manifest

Contrat visuel validé pour la coque Manifest, distinct des thèmes créés par ses utilisateurs. Les valeurs sont des décisions de conception partagées par l'éditeur sombre et non une inversion automatique du thème de la page. Les styles de l'éditeur sont générés ou dérivés d'une seule source de tokens ; les autres fichiers ne doivent pas maintenir des copies divergentes.

## Overview

Produit : atelier de composition pour une personne qui veut comparer et ajuster un design tout en dialoguant avec une IA. Caractère : précis, calme, manipulable. Univers : table de mise en page, sélection d'objets, mesures et versions. Le contenu créé porte la richesse visuelle ; les outils périphériques restent discrets.

Signature : une proposition et son bloc se mettent en évidence ensemble. Ce lien de causalité doit être immédiatement compréhensible, sans décoration permanente. Éviter les interfaces de chatbot génériques qui réduisent la page à une vignette.

## Colors

Les six couleurs de frontmatter définissent les surfaces, textes et sélection. Primary signifie sélection/action principale ; ne pas teinter tous les panneaux avec l'accent. Les états d'erreur, d'avertissement et de succès reçoivent des tokens sémantiques distincts à vérifier au ticket UX-01 ; ils ne sont jamais indiqués par la couleur seule.

Le contenu de la page possède son propre thème. Un fond sombre choisi pour le site n'assombrit pas automatiquement les champs de l'éditeur, et la coque sombre de Manifest ne force pas les couleurs du site créé. La compatibilité avec les thèmes imposés par l'hôte est testée ; l'éditeur conserve ses tokens dédiés.

## Typography

Instrument Sans pour commandes, labels et textes ; IBM Plex Mono uniquement pour mesures, identifiants courts et métadonnées techniques utiles. Polices et licences figées dans la release. Corps 14–16 px selon panneau, labels 13–14 px, interlignage lisible ; pas de texte essentiel miniature pour faire rentrer les réglages.

Les champs et contrôles restent en français M1. Les pages créées acceptent les textes du projet sans traduction forcée. Les libellés longs ne doivent pas casser la barre d'action.

## Layout

Écran de travail : coque sombre proche de Manifest, colonne intention/catalogue à gauche, aperçu blanc dominant au centre, suggestions et inspecteur à droite. Point de départ desktop : gauche 280–320 px, droite 280–320 px, centre fluide. À moins de 1 100 px, un seul panneau latéral à la fois ; à moins de 768 px, panneaux en tiroirs et barre d'actions condensée. Ces seuils sont des propositions à tester sur le viewport réel de l'hôte.

Rythme 4 px pour les contrôles, espaces de 8/12/16/24 px et alignements continus. Les boutons ne changent pas de largeur pendant une demande. L'aperçu possède son viewport ; ne pas modifier toute la mise en page du shell pour simuler un téléphone.

## Elevation & Depth

Surfaces séparées par bordures et contraste, ombres réservées aux éléments superposés. Aucun glow ou dégradé décoratif dans la navigation. La sélection reste visible sur une page claire ou sombre via un contour adapté et un label accessible.

## Shapes

Contrôles 8 px, panneaux 12 px. Une forme ne signale pas à elle seule un état. Les éléments de la page suivent les tokens du projet, pas ces rayons de l'éditeur.

## Components

Les contrôles partagés sont définis dans la carte canonique de UX-CONTRACT.md. Les listes de modèles/composants utilisent un Select ou une Combobox accessible, avec états ouvert/vide/erreur. Les icônes viennent d'une seule famille et ne remplacent pas les libellés des actions importantes.

Le mouvement de l'éditeur explique un changement : sélection, ouverture de panneau, confirmation de conservation. Pas de pulsations ou de mouvements continus. Respecter prefers-reduced-motion. Les indicateurs d'activité ne font pas sauter les contrôles.

## Do's and Don'ts

- Donner de la place à la page, garder les outils lisibles.
- Indiquer ce qui est proposé, conservé, sauvegardé ou approuvé.
- Montrer un changement ciblé et annulable ; ne pas animer toute la page à chaque réponse.
- Décrire pourquoi une proposition convient au contenu plutôt que promettre un style « premium » universel.
- Ne pas confondre la méthode Unslop avec une obligation d'uniformiser les sites.
- Ne pas afficher de coût ou de performance comme mesuré si ce n'est qu'une estimation.

## Traçabilité des tokens

Décision initiale : ce fichier possède les valeurs de l'éditeur. Le ticket UX-01 établit un mapping unique vers packages/editor/theme et ses variables CSS. Les valeurs des sites appartiennent au Snapshot.theme. Le catalogue consomme les références du thème et ne copie pas les valeurs de l'éditeur dans les exports.
