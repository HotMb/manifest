# Revue de tâche — cadrage Manifest, lancement et rapport de données — 3 novembre 2026

## Identification

| Champ | Valeur |
|---|---|
| Tâche / ticket / objectif | Clarifier la maquette et le parcours unique, le contexte passé au lancement par ChatGPT, les modes de création/modification et la transmission des besoins de données ; aligner les critères de livraison. |
| Date et mode de revue | 3 novembre 2026, revue asynchrone dans cette session Codex. |
| Branche, commit ou diff examiné | Branche `work/arc-01`, commit poussé `edd798f` puis compte rendu de cette revue. Registre révision 14. |
| Build, environnement et hôte | Windows, Node 24.5.0 ; revue documentaire et synchronisation du dépôt. Aucun parcours applicatif ou vrai hôte exécuté dans cette tranche. |
| Responsable de la réunion | `/root` — orchestrateur. |
| Preuves et issues liées | [Preuve de cadrage](../evidence/MANIFEST/framing-context-and-data-handoff-2026-11-03.md), [tickets](../delivery/tickets.json), [tableau](../delivery/BOARD.md), commit [edd798f](https://github.com/HotMb/manifest/commit/edd798f). Issues : [DOM-01 #4](https://github.com/HotMb/manifest/issues/4), [DOM-02 #5](https://github.com/HotMb/manifest/issues/5), [UX-01 #10](https://github.com/HotMb/manifest/issues/10), [UI-01 #11](https://github.com/HotMb/manifest/issues/11), [UI-02 #12](https://github.com/HotMb/manifest/issues/12), [UI-03 #13](https://github.com/HotMb/manifest/issues/13), [AI-02 #19](https://github.com/HotMb/manifest/issues/19), [REV-01 #22](https://github.com/HotMb/manifest/issues/22), [TEST-01 #26](https://github.com/HotMb/manifest/issues/26). |

## Participants et contributions

| Agent ou personne réelle | Rôle | Contribution reçue et référence | Présence / limite |
|---|---|---|---|
| `/root/arc01_design_review` | Designer et propriétaire de DESIGN.md / UX-CONTRACT.md | A redéfini la cible comme une seule surface à trois zones, avec proposition explicite de l’assistant, candidat modifiable, démonstrations catalogue accessibles et transmission des métadonnées. | Revue documentaire de conception ; aucun code ou comportement UI changé. |
| `/root/arc01_code_review` | Reviewer indépendant | A trouvé les ambiguïtés entre nouveau projet et nouvelle page, l’absence de version de base du candidat, la source de vérité des données et le déclenchement IA sur texte seul ; a ensuite vérifié les corrections d’opérations, de version et de cardinalité du rapport. A demandé que la table UX mentionne aussi `baseDraftVersion` pour `create_page`, demande appliquée dans ce commit. | Lecture seule ; pas de test runtime ni de confirmation hôte. |
| `/root` | Orchestrateur/intégrateur | A harmonisé les documents, cadré les tickets révision 14, régénéré BOARD, poussé le commit et synchronisé les Issues miroir. | Aucun code applicatif modifié ; statuts et dépendances inchangés. |

## Démonstration du résultat

- La direction cible est une route de travail unique : à gauche le brief/proposition et ses changements réactifs, au centre le candidat et son aperçu, à droite la recherche/démonstration catalogue. Aucun parcours Décrire/Composer/Transmettre ni écran séparé de réglage de bloc.
- Le lancement distingue `create_project` (Snapshot vide), `create_page` (Snapshot du projet existant et `baseDraftVersion` relus) et `modify_page` (projet/page/version relus). Un candidat structuré est lié à sa cible et sa version ; une proposition n’est jamais conservée ou appliquée silencieusement.
- Une proposition déjà formulée par ChatGPT peut être transmise explicitement. Un texte seul préremplit le brief sans appel IA jusqu’à activation explicite de l’analyse automatique ou action « Proposer maintenant » ; le compositeur natif non envoyé n’est jamais lu.
- Les `dataIntegrationSpecs[]` sont déclarées dans le Snapshot, modifiées via `set_data_integration_spec` au sein de `apply_ops`, puis reprises exactement de la révision approuvée dans le rapport `/validate`. Elles expliquent à ChatGPT les sources, schémas, mappings, transformations, actualisation et prérequis, sans secret ni ligne sensible et sans conférer l’accès aux données.
- Cette tranche ne change pas encore le prototype exécuté : ses écrans et capacités M0 restent décrits séparément du cadrage cible.

## Tests et critères d'acceptation

| Critère / scénario | Vérification exécutée et version | Résultat observé | Preuve | Reste à faire |
|---|---|---|---|---|
| Cohérence du registre et du tableau | `npm run check`, révision 14 | Réussi : 26 tickets et tableau généré valides. | [Preuve de cadrage](../evidence/MANIFEST/framing-context-and-data-handoff-2026-11-03.md) | Aucune transition de statut demandée. |
| Propreté du diff | `git diff --check` | Réussi. | Commit `edd798f` | — |
| Syntaxe des fichiers JSON | Parse Node de tickets, domaine et OpenAPI | Réussi ; syntaxe seulement, pas la validation des nouveaux champs par schéma. | [Preuve de cadrage](../evidence/MANIFEST/framing-context-and-data-handoff-2026-11-03.md) | DOM-01/UI-03 doivent livrer les schémas runtime et fixtures. |
| Vérifications Python des contrats | `python scripts/check_contracts.py` et découverte unittest | Échouées avant validation : dépendance `jsonschema` absente de l’environnement. Aucun paquet installé. | Sortie de la session | Installer/configurer la dépendance dans l’environnement de développement, puis exécuter sous DOM-01. |
| Miroirs GitHub | Relecture des Issues 4, 5, 10, 11, 12, 13, 19, 22 et 26 après mise à jour | La mention révision 14 et le lien vers le commit sont présents ; les neuf Issues restent ouvertes. | Issues liées dans l’identification | Poursuivre le code une fois les tickets éligibles. |
| Parcours réel dans ChatGPT Desktop / connexion aux sources | Non exécuté dans cette tranche documentaire | Non démontré. | Le statut ARC-01 reste bloqué. | Fournir la preuve hôte et qualifier les connecteurs autorisés avant de revendiquer cette capacité. |

## Avis des spécialistes

| Rôle ayant contribué | Constat vérifiable | Conséquence / recommandation |
|---|---|---|
| Designer | La cible Figma est un seul espace et l’édition de bloc doit rester contextuelle ; le catalogue indépendant doit garder une démo accessible. | L’architecture visuelle et les tickets sont mis à jour, sans prétendre que le prototype suit déjà cette cible. |
| Relecture de code indépendante | Les distinctions `create_project`/`create_page`/`modify_page`, version de base, exécution après opt-in et cardinalité `dataIntegrationSpecs[]` ont été harmonisées. | La dernière note de cohérence de la table UX a été appliquée. Les schémas runtime/hôte demeurent à construire et qualifier. |

## Dettes, risques et limites

| Nature | Référence | Impact constaté | Propriétaire | Critère de levée et jalon |
|---|---|---|---|---|
| Capacité d’hôte/contextualisation non prouvée | ARC-01 / UI-03 | On ne sait pas encore prouver que ChatGPT Desktop transmet la proposition d’assistant et les références requises au plugin. | Frontend / intégrateur hôte après la preuve ARC-01 | Schéma, fixture et essai réel dans l’hôte avec contexte explicitement livré, sans lire le compositeur natif. |
| Modèle de données de connexion à implémenter | DOM-01 / DOM-02 / REV-01 | L’intention, sa validation, sa version et son report n’existent pas encore comme comportement produit. | Backend, après prérequis | Snapshot + schéma validés, mutation atomique et rapport dérivé de la révision approuvée, sans secrets. |
| Qualification des accès de données | AI-02 / SEC-01 / API-01 | Le rapport seul ne peut ni authentifier une source ni prouver une connexion réelle. | Backend/sécurité, après prérequis | Connecteur autorisé testé ou statut explicitement simulé/non connecté. |

Ces points sont du périmètre restant conditionné par les tickets, pas de nouvelles dettes techniques ajoutées au registre.

## Décisions et actions

| Décision ou action | Motif | Responsable unique | Ticket / preuve attendue | Échéance par jalon |
|---|---|---|---|---|
| Adopter les trois opérations et leurs invariants de cible/version | Évite de confondre nouveau projet, nouvelle page et modification ; interdit une proposition basée sur une page périmée. | Orchestrateur pour le cadrage ; backend/frontend à l’implémentation | UI-03, AI-02, UX-01 | Après déblocage des dépendances M0. |
| Garder l’intention de données dans le Snapshot et le rapport dérivé de la révision approuvée | Assure que le rapport transmis est versionné et reproductible. | Backend | DOM-01, DOM-02, REV-01 | Après ARC-01/02/03. |
| Ne pas démarrer les tickets dépendants | ARC-01 exige encore une preuve ChatGPT Desktop/identité/bridge. | Orchestrateur | `npm run team:next` | Dès qu’une preuve hôte est disponible, réévaluer l’éligibilité. |

## Verdict et prochaine étape

- **Verdict : cadrage et miroirs synchronisés ; implémentation non commencée.**
- Statuts avant/après : inchangés. ARC-01 reste `blocked`, ARC-02/03 et les tickets M1 restent selon leurs dépendances dans le registre révision 14.
- `npm run team:next` affiche 0 nouveau ticket éligible. La suite du développement reste conditionnée à la preuve ARC-01 dans le véritable hôte.
- Aucune décision supplémentaire du commanditaire n’est nécessaire pour ce cadrage.

## Synthèse partagée dans le chat

Le cadrage distingue maintenant les trois types de lancement, versionne les candidats et conserve les besoins d’intégration de données dans la révision qui alimente `/validate`. Les neuf Issues concernées pointent vers le registre révision 14. Le prototype lui-même n’a pas changé ; les schémas runtime et le handoff ChatGPT restent à implémenter/qualifier. ARC-01 demeure bloqué et aucun ticket n’est éligible.
