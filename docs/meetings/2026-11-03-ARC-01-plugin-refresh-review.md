# Revue de tâche — ARC-01 — rafraîchissement du plugin — 3 novembre 2026

## Identification

| Champ | Valeur |
|---|---|
| Tâche / ticket / objectif | Actualiser le plugin privé ChatGPT Desktop avec le build poussé et qualifier les preuves obtenues |
| Date et mode de revue | 3 novembre 2026, revue asynchrone dans cette session Codex |
| Branche, commit ou diff examiné | `work/arc-01`, commit `b25fe96`; manifeste source `0.1.1` |
| Build, environnement et hôte | Windows, Node 24.5.0, serveur MCP local; ChatGPT Desktop non observé |
| Responsable de la réunion | `/root` — orchestrateur |
| Preuves et PR / issue liées | [preuve du paquet](../evidence/ARC-01/plugin-refresh-2026-11-03.md), [bilan ARC-01](2026-11-03-ARC-01-review.md), branche [HotMb/manifest](https://github.com/HotMb/manifest/tree/work/arc-01-qualification) |

## Participants et contributions

| Agent ou personne réelle | Rôle | Contribution reçue et référence | Présence / limite |
|---|---|---|---|
| `/root` | Propriétaire et orchestrateur | A versionné le manifeste, construit et empaqueté le plugin, exécuté le smoke test et actualisé le plugin privé existant. | Le commit source est poussé ; les artefacts locaux sont ignorés par Git. |
| `/root/arc01_code_review` | Reviewer distinct | A comparé les manifestes source et paquet, vérifié les métadonnées de la release privée, les tailles et le smoke local. | Aucun fichier modifié ; l'API ne fournit pas les octets des deux gros fichiers distants pour une comparaison exacte. |
| `/root` | Synthèse | A vérifié la révision 9 du registre et `npm run team:next` : ARC-01 est bloqué, aucun ticket M1 n'est éligible. | La capture de navigateur local ne remplace pas la preuve hôte. |

Une revue designer n'était pas nécessaire : ce lot ne modifie pas le rendu. La revue design précédente reste liée au bilan ARC-01 du 3 novembre.

## Démonstration du résultat

- Le plugin privé `manifest-desktop` est actualisé en version 0.1.1 à partir du paquet reconstruit.
- Le smoke local démarre le serveur stdio, ouvre un brouillon M0 vide et retourne l'éditeur HTML autonome.
- Le second champ de recherche catalogue, les cartes avec provenance, le glisser-déposer, la pièce jointe de référence et `/validate` avec remise au chat ne sont pas livrés dans cette release.
- L'ouverture de cette version dans ChatGPT Desktop et la matrice d'identité/capacités n'ont pas été observées.

## Tests et critères d'acceptation

| Critère / scénario | Vérification exécutée et version | Résultat observé | Preuve | Reste à faire |
|---|---|---|---|---|
| Build du paquet depuis la source | `npm run package:desktop-plugin`, commit `b25fe96` | Réussi | [preuve du paquet](../evidence/ARC-01/plugin-refresh-2026-11-03.md) | Rien pour la construction locale. |
| Démarrage stdio et ouverture de la ressource MCP | `npm run smoke:desktop-plugin` | Réussi ; outils M0 et HTML autonome retournés | [preuve du paquet](../evidence/ARC-01/plugin-refresh-2026-11-03.md) | Tester avec le vrai hôte. |
| Release privée actualisée | Plugin Creator, version 0.1.1 | Réussi ; portée utilisateur, visibilité privée | [preuve du paquet](../evidence/ARC-01/plugin-refresh-2026-11-03.md) | Confirmer l'affichage depuis ChatGPT Desktop. |
| Bridge, OAuth, capacités, rafraîchissement et édition dans l'hôte | Aucun contrôle ChatGPT Desktop exécuté | Non exécuté | — | Capture de l'ouverture réelle ou de l'erreur, sans secret. |

## Avis des spécialistes

| Rôle ayant contribué | Constat vérifiable | Conséquence / recommandation |
|---|---|---|
| Code review | Source et package concordent sur `0.1.1`; le smoke local passe. | Garder ARC-01 bloqué jusqu'à l'observation réelle de l'hôte. |
| Orchestration | Révision 9 : ARC-01 `blocked`; `team:next` indique 0 ticket éligible. | Ne pas démarrer les dépendants M1 avant les preuves hôte. |

## Dettes, risques et limites

| Nature | Référence | Impact constaté | Propriétaire | Critère de levée et jalon |
|---|---|---|---|---|
| Preuve hôte restante | ARC-01 | Le smoke local n'établit ni l'ouverture Desktop, ni l'identité OAuth, ni les capacités du bridge en situation réelle. | Commanditaire pour l'ouverture/capture; frontend/backend pour qualification technique | Capturer et examiner le parcours réel sans secret avant de terminer ARC-01. |
| Périmètre M1 en attente | UI-02 / CAT-01 / CAT-02 / REV-01 | Les comportements demandés ne sont pas inclus dans le paquet 0.1.1. | Propriétaires de ces tickets après levée des dépendances | Les tickets deviennent éligibles et livrent leurs critères selon le registre. |

Pas de nouvelle dette technique retenue. Les dettes existantes restent dans [TECH-DEBT.md](../TECH-DEBT.md).

## Décisions et actions

| Décision ou action | Motif | Responsable unique | Ticket / preuve attendue | Échéance par jalon |
|---|---|---|---|---|
| Conserver ARC-01 en `blocked` | Le build local n'est pas une preuve du comportement dans ChatGPT Desktop. | `/root` — orchestrateur | Registre rev. 9, preuve du paquet jointe | Jusqu'à l'observation hôte. |
| Ouvrir Manifest 0.1.1 dans ChatGPT Desktop et fournir une capture du rendu ou de l'erreur | Élément nécessaire pour reprendre le diagnostic ARC-01. | Commanditaire | ARC-01 | Prochaine action. |
| Garder UI-02/CAT-01/CAT-02 non démarrés | Les dépendances de schéma et de composition ne sont pas terminées. | Orchestrateur et futurs propriétaires | `npm run team:next` | Après ARC-01, ARC-02 et ARC-03 selon le registre. |

## Verdict et prochaine étape

- **Verdict : paquet privé actualisé et qualifié localement; parcours hôte toujours bloqué.**
- Critères satisfaits : source versionnée et poussée; build, smoke local et métadonnées privées concordants.
- Critères manquants : observation ChatGPT Desktop, bridge authentifié et capacités de l'hôte.
- État du ticket avant / après : ARC-01 reste `blocked`, registre révision 9; aucune transition effectuée.
- Prochain ticket éligible : aucun.
- Besoin commanditaire : ouvrir le plugin actualisé dans ChatGPT Desktop et envoyer la capture du résultat ou de l'erreur, sans jeton ni secret.

## Synthèse partagée dans le chat

Le plugin privé 0.1.1 est reconstruit, actualisé et passé au smoke local. Le contrôle indépendant confirme la version et le périmètre du package. Cette étape ne qualifie pas encore l'hôte ChatGPT Desktop; ARC-01 reste bloqué et aucun ticket de catalogue ne peut commencer selon les dépendances. La capture dans l'hôte est la prochaine preuve requise.
