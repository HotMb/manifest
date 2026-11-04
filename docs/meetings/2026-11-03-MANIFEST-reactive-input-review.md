# Revue du comportement réactif de Manifest — 3 novembre 2026

## Identification

| Champ | Valeur |
|---|---|
| Tâche / ticket / objectif | Diagnostic du signalement « les modifications ne fonctionnent pas », de la saisie jusqu’au rendu. Revue de comportement ; aucun ticket livré. |
| Date et mode de revue | 3 novembre 2026, revue asynchrone dans le chat et inspection locale. |
| Branche, commit ou diff examiné | `work/arc-01`, HEAD `36fb703`, checkout propre avant cette documentation. |
| Build, environnement et hôte | Atelier local à `127.0.0.1:5173`; pas de preuve dans ChatGPT Desktop réel ni d’appel fournisseur. |
| Responsable de la réunion | `/root` — orchestration, inspection et synthèse. |
| Preuves et PR / issue liées | [Audit détaillé](../evidence/MANIFEST-reactive-input-audit-2026-11-03.md), ticket UI-03 en attente de dépendances, PR #27 toujours brouillon. |

## Participants et contributions

| Agent ou personne réelle | Rôle | Contribution reçue et référence | Présence / limite |
|---|---|---|---|
| `/root` | Orchestrateur de la revue | Inspection du code, état du registre, reproduction locale décrite dans l’audit et synthèse des résultats. | Aucun code produit modifié. |
| `/root/launchcontext_code_review` | Reviewer code indépendant | A confirmé le transfert complet du brief, la désactivation du debounce au lancement, les limites M0 et l’absence du test E2E positif. | Revue en lecture seule, aucun test ou appel fournisseur. |
| `/root/viewport_design_review` | Designer / reviewer UX | A confirmé que la maquette n’est pas le comportement par défaut : pas de projection locale automatique, action explicite nécessaire, démos à droite non insérables. | Pas d’inspection ChatGPT Desktop réelle. |
| Auteur Git `HotMb` des commits examinés | Auteur du code source | Attribution relevée avec Git pour le code de suggestion. | Aucune contribution directe reçue dans cette revue ; aucun accord ne lui est attribué. |

## Démonstration du résultat

- Le fil Codex partagé transmet le brief complet avec le nom dans le deuxième appel ; le champ de Manifest préremplit `assistantProposal` avant `userRequest`.
- L’option automatique est décochée initialement et le lancement la remet à `false`. Le hook ne démarre donc pas le délai de 1,5 seconde jusqu’à activation explicite.
- L’analyse locale activée manuellement reconnait zéro indication dans le brief de dashboard/nuages/typographie. Une description structurée avec des mots pris en charge produit des pistes, mais celles-ci exigent un clic pour modifier ou prévisualiser le canevas.
- La sortie M0 ne peut contenir qu’un Hero générique et ne comporte ni graphiques, ni nuages, ni source de données, ni police Manrope, ni positionnement centré dédié.

## Tests et critères d’acceptation

| Critère / scénario | Vérification exécutée et version | Résultat observé | Preuve | Reste à faire |
|---|---|---|---|---|
| Transfert du contexte depuis le chat | Lecture du payload partagé et inspection du code à `36fb703` | Réussi pour ce payload précis | Fil Codex et `main.tsx:155-170` | Vérifier la séquence réelle dans l’hôte ChatGPT Desktop. |
| Texte modifié puis pause de 1,5 s, automatique activé | Reproduction navigateur locale avec règles locales | Partiel : le timer s’exécute, le brief libre de dashboard donne zéro indication | [Audit de reproduction](../evidence/MANIFEST-reactive-input-audit-2026-11-03.md) | Implémenter le comportement réactif voulu et couvrir le parcours positif. |
| Canvas automatiquement mis à jour par une piste locale | Lecture du rendu et reproduction locale | Échoué par rapport à l’expérience demandée : clic obligatoire | `main.tsx:377-416,556` | Projeter un candidat local sans le conserver implicitement. |
| Dashboard de ventes avec nuages et graphiques | Validation du contrat/rendu M0 | Non pris en charge par le schéma actuel | `m0-contract/src/index.ts`, `hero.tsx` | Catalogue et modèle de composition étendus après leurs gates. |
| E2E ciblés | Tentatives Playwright sans sortie avant interruption | Non exécutés jusqu’au résultat ; aucun PASS/FAIL revendiqué | Voir l’audit | Rétablir un runner stable puis ajouter la couverture auto positive. |
| ChatGPT Desktop et modèle réel | Non exécuté | Non prouvé | Aucune capture de l’hôte ou réponse d’un fournisseur | Qualifier ARC-01 dans l’hôte autorisé. |

## Avis des spécialistes

| Rôle ayant contribué | Constat vérifiable | Conséquence / recommandation |
|---|---|---|
| Reviewer code | Le texte arrive correctement ; le défaut le plus probable est le mode automatique coupé à chaque lancement. | Aligner le défaut UX sur la demande ou rendre l’activation explicite très visible ; ajouter le test de pause → job → aperçu. |
| Designer | Les zones gauche/centre/droite existent, mais le comportement central ne suit pas automatiquement les saisies et les cartes du catalogue ne s’ajoutent pas au canevas. | Respecter le flux réactif et l’insertion attendus, sans présenter les démos actuelles comme un catalogue fonctionnel. |

## Dettes, risques et limites

- **Défaut d’acceptation UX / écart de comportement, pas une dette technique enregistrée :** debounce local et génération par modèle désactivés au lancement. UI-03 décrit explicitement l’opt-in actuel, mais cela ne correspond pas au flux demandé dans le chat.
- **Périmètre M0 restant :** le dashboard, les nuages et les charts sont des capacités futures, pas une panne du rendu existant.
- **Couverture manquante :** aucun E2E ne prouve aujourd’hui le parcours automatique positif complet. À inclure dans UI-03/TEST-01 selon leurs dépendances.
- Aucune nouvelle dette n’est créée dans `TECH-DEBT.md` : ces points sont des écarts de critères et des fonctions du backlog, non des compromis techniques nouvellement acceptés.

## Décisions et actions

| Décision ou action | Motif | Responsable unique | Ticket / preuve attendue | Échéance par jalon |
|---|---|---|---|---|
| Conserver le diagnostic sans modifier le contrat ni les états de tickets | `npm run team:next` retourne zéro ticket éligible ; ARC-01 reste bloqué par la preuve d’hôte/identité. | Orchestrateur | Audit et compte rendu versionnés ; registre inchangé | Avant le prochain ticket admissible. |
| À la reprise, traiter le debounce et le preview réactif avec un scénario E2E positif | L’interface actuelle ne réagit pas par défaut et la preuve automatique manque. | Frontend, après levée des dépendances | UI-03 et TEST-01 ; entrée, horloge contrôlée, job borné, aperçu courant | M1, après UI-01, JOB-01 et AI-01. |
| Étendre la composition pour charts, clouds, données et typographie demandés | M0 n’a ni les composants ni leurs propriétés. | Designer pour le catalogue, puis frontend/backend selon contrat | CAT-01/CAT-02, AI-01/AI-02, DOM-01 et UI-01 | Après ARC-03 et les dépendances enregistrées. |

## Verdict et prochaine étape

- **Verdict : à reprendre** pour l’expérience de modification réactive demandée ; le transfert du texte fonctionne pour le fil examiné, mais l’automatique est opt-in, les pistes locales ne sont pas projetées automatiquement, et le dashboard dépasse M0.
- L’état des tickets n’a pas été modifié. `npm run team:next` indique zéro ticket éligible ; ARC-01 reste bloqué. Aucun ticket dépendant n’est démarré.
- La preuve d’exécution réelle dans ChatGPT Desktop manque toujours. La prochaine action produit est de reprendre après la levée d’ARC-01 et de traiter la causalité via UI-03 avant de prétendre que les modifications apparaissent après chaque pause.
- Aucune décision supplémentaire du commanditaire n’est nécessaire pour ce diagnostic. Un arbitrage sera utile si le mode automatique doit devenir actif par défaut alors qu’un modèle externe sélectionné pourrait engendrer des coûts.

## Synthèse partagée dans le chat

Le texte de lancement arrive bien, mais l’analyse automatique est coupée au départ et désactivée à chaque nouveau lancement. Après activation, les règles locales ne reconnaissent pas le dashboard demandé et les pistes exigent un clic ; le modèle M0 ne sait pas produire les nuages ou graphiques. Les essais E2E sont restés bloqués avant résultat et le vrai hôte n’a pas été vérifié. La PR #27 reste en brouillon, ARC-01 reste bloqué, et les dépendances empêchent de commencer UI-03. Voir [l’audit détaillé](../evidence/MANIFEST-reactive-input-audit-2026-11-03.md).
