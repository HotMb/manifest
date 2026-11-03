# Revue de tâche — surface Manifest limitée à la fenêtre — 3 novembre 2026

## Identification

| Champ | Valeur |
|---|---|
| Tâche / ticket / objectif | Correctif ciblé de hauteur viewport demandé par l’utilisateur ; aucun ticket ouvert éligible |
| Date et mode de revue | 3 novembre 2026, revue asynchrone dans ce chat |
| Branche et diff | `work/arc-01`, changements locaux non commités au moment de la revue |
| Build et hôte | Éditeur web local sur `127.0.0.1:5173`, navigateur intégré |
| Responsable | `/root` — intégration et démonstration locale |
| Preuves | [Observations et contrôles](../evidence/MANIFEST-viewport-fit-2026-11-03.md) |

## Participants et contributions

| Agent | Rôle | Contribution |
|---|---|---|
| `/root` | Intégrateur | Ajout du wrapper flex et des contraintes de hauteur ; typecheck, build et observation visuelle locale |
| `/root/viewport_layout_review` | Reviewer indépendant | Capture 1280×720 ; confirme l’en-tête, les trois colonnes, la barre d’état, les deux entrées et le défilement interne ; aucun défaut bloquant desktop |
| `/root/viewport_design_review` | Revue design indépendante | Confirme la hiérarchie brief/aperçu/suggestions sur une même surface ; signale l’empilement sous 768 px |

## Démonstration

Avant : Puck n’était pas contenu dans un enfant flex qui pouvait remplir le viewport ; la hauteur des cartes et contrôles faisait grandir la page entière.

Après : le conteneur de travail occupe la hauteur disponible entre l’en-tête et la barre d’état. La grille garde trois colonnes à partir de 768 px ; seuls les panneaux latéraux et le canevas défilent. Les champs du brief et de recherche sont visibles à l’ouverture.

## Qualité, dettes et limites

- Typecheck, build et vérification du diff réussis ; aucun test automatisé n’a été lancé pour ce correctif.
- Limite : sous 768 px, le layout mobile existant empile les panneaux. Le viewport mobile n’a pas été validé comme une surface trois colonnes.
- Aucune dette technique nouvelle retenue.
- Ce rendu local ne prouve pas l’ouverture ou le dimensionnement dans ChatGPT Desktop réel.

## Décisions et verdict

- Verdict : **terminé pour le viewport desktop local** demandé ; aucune modification de ticket ou de dépendance n’est autorisée par cette revue.
- `npm run team:next` indique zéro ticket actif éligible ; le registre reste inchangé à la révision 14.
- ARC-01 reste bloqué jusqu’aux preuves du parcours dans l’hôte ChatGPT Desktop et de l’identité/bridge, conformément au suivi existant.
- Prochaine action : observer ce même affichage dans l’hôte réel après qualification ARC-01 ; traiter le layout mobile seulement si l’utilisateur le demande.
