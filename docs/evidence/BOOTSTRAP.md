# Préparation du dépôt et point de reprise

Date de préparation : 1er novembre 2026.

**État : organisation préparée, M0 non prouvé.** Ce compte rendu décrit des fichiers de démarrage ; il ne constitue pas une validation du produit.

## Présent dans cette préparation

- Le cadrage de référence est repris dans docs/spec ; les contrats d'éditeur sont à la racine du dépôt.
- Le registre docs/delivery/tickets.json contient les 26 tickets M0/M1 avec propriétaires, dépendances, critères et périmètres de fichiers.
- Le tableau et le protocole d'orchestration expliquent le travail des rôles et la reprise des sessions.
- Les preuves de ticket sont initialement vides. Aucun ticket produit n'est annoncé terminé.

## Preuves non obtenues ici

| Ticket | À établir avant clôture |
|---|---|
| ARC-01 | ouverture dans le vrai ChatGPT, bloc modifiable, initialisation du bridge, lecture authentifiée, refus d'un jeton invalide, clavier/viewport, reprise/poll, matrice fichier/stockage/iframe |
| ARC-02 | lockfile et versions compatibles, installation/build propres, choix OAuth, mauvaise audience refusée, capacité du fournisseur choisi mesurée |
| ARC-03 | contrôles de contrats dans le dépôt, échec sur modification incompatible, exemples valides, mocks locaux, règles de propriété ; dépendances ARC-01/02 clôturées |

Les contrôles réalisés ensuite par l'intégrateur sont consignés avec leurs commandes, versions, résultats et limites dans [BOOTSTRAP-CHECKS.md](BOOTSTRAP-CHECKS.md). Aucun test applicatif, appel fournisseur, build produit ou parcours d'hôte n'est revendiqué par ce document.

## Reprise

Lire le registre, vérifier les changements Git, puis prendre ARC-01. Préparer un essai minimal jetable et les preuves attendues sans développer le catalogue M1. Si une connexion d'hôte ou une configuration d'identité manque, décrire précisément ce qui manque et préserver les travaux indépendants. Ne pas élargir le catalogue pour masquer l'absence de preuve du parcours embarqué.
