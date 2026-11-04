# Revue de tranche — GEN-03 / GEN-04 — 4 novembre 2026

## Identification

| Champ | Valeur |
|---|---|
| Objectif | Corriger la sélection de modèle, l'état API près du brief et l'attente de 1,5 s pour les propositions live ; clarifier Unslop et l'ordre avant ARC-01. |
| Mode | Revue asynchrone du diff, des tests navigateur et des contributions de reviewers distincts. |
| Branche | `work/arc-01`, diff local non commité au moment de la revue ; branche PR distante `work/arc-01-qualification`. |
| Application | Manifest editor-web + API/provider contract ; environnement de développement local. |
| Responsable | `/root`, orchestrateur/intégrateur. |
| Preuve | [Sélection API et aperçu réactif](../evidence/GEN-03/reactive-api-selection-2026-11-04.md). |

## Participants et contributions

| Agent | Rôle | Contribution reçue | Limite |
|---|---|---|---|
| `/root` | Propriétaire de cette tranche / intégrateur | Modifications de sélection, états de l'interface, transmission d'un Snapshot sans profil hérité, correction du scénario Playwright, vérifications et ce compte rendu. | Aucun fournisseur réel ni ChatGPT Desktop testé. |
| `/root/gen01_qa` | QA distinct | Verdict **APPROUVÉ pour le correctif ciblé**, sans finding P0/P1 ; confirme sélection unique, choix explicite en cas de modèles multiples et absence du profil dans la requête modèle. | A relu le code et les tests ; ne prouve ni l'appel réel, ni `/validate` dans l'hôte, ni la critique d'un rendu visuel. |
| `/root/gen02_motion_primitives` | Relecture UX/code distincte | Avis favorable sur la distinction fournisseur/API, l'absence de sélection arbitraire et le statut d'indisponibilité ; a recommandé un libellé moins technique, corrigé en « exemple de ventes synthétiques ». | Revue source seulement, sans capture, session visuelle ni exécution de tests. |

## Résultat démontré

La pause de 1 500 ms déclenche un job modèle simulé quand une cible API unique est configurée ou qu'un modèle parmi plusieurs est choisi explicitement. Une intention récente invalide l'ancienne proposition. Le test de changement de source démontre le retour de l'aperçu modèle simulé aux règles locales, puis le retour à l'API après une nouvelle sélection. La proposition reste un candidat ; la sauvegarde exige une action distincte.

La méthode Unslop est cadrée comme manière d'analyser un produit et critiquer un rendu contextualisé, non comme profil ou thème fixe. Le runtime actuel ne donne cependant au modèle que le brief, le Snapshot et les capacités textuelles du catalogue : il n'envoie pas l'image ou le DOM rendu. Il n'est donc pas démontré que le modèle inspecte l'aspect réel du canevas.

## Vérifications

| Parcours | Résultat |
|---|---|
| E2E navigateur | 39/39 réussis après correction du test de transition local/API/local. |
| Transition ciblée | 1/1 réussi. |
| Fournisseurs / catalogue / M0 | 31/31, 15/15 et 72/72 réussis. Tous les transports modèle sont simulés. |
| Typecheck / build | Réussis ; avertissements Rolldown `use client` présents. |
| `npm run check` et `git diff --check` | Réussis : backlog valide en révision 47 ; diff sans erreurs (avertissements de normalisation CRLF/LF uniquement). |
| GitHub Actions Quality #86 | Réussie sur le commit poussé `4d3c222`, y compris contrats Python dans l'environnement CI. |
| Python `jsonschema` | Les deux commandes prescrites ont été tentées ; elles n'atteignent pas les tests car le module `jsonschema` manque. |
| API fournisseur réelle | Non exécutée ; aucun appel facturable n'a été déclenché, les essais étant simulés. |
| ChatGPT Desktop | Non testé. Le contrôle ARC-01 est volontairement différé selon la séquence demandée. |

Les tests Playwright affichent un avertissement Puck sur le coût de `setData`, sans échec observé. Pas de mesure de performance ni d'impact quantifié : aucune dette nouvelle n'est enregistrée.

## Dettes, risques et périmètre restant

| Nature | Référence | Impact / condition | Responsable |
|---|---|---|---|
| Ticket à reprendre | GEN-02 | Provenance/licence, hash source reproductible et coût catalogue mesuré non démontrés ; GEN-03 et GEN-04 restent bloqués par sa dépendance. | Backend/catalogue |
| Capacité de produit restante | GEN-04 | Faire prouver l'actualisation visuelle de plusieurs animations/vitesses et concevoir l'accès du modèle au rendu réel si une critique pixel est exigée. Aucun Screenshot/DOM n'est actuellement envoyé. | Frontend / backend selon l'architecture validée |
| Capacité de produit restante | GEN-05 | Étendre les mouvements compris au-delà des presets et primitives actuellement admis. | Backend |
| Risque de contenu externe | AI-02 | Le secret fournisseur reste serveur, mais les credentials que l'utilisateur collerait dans le brief ne sont pas filtrés de façon exhaustive avant transfert. Ne pas utiliser de données confidentielles dans un test API avant revue de ce contrôle. | Backend |
| Limite hôte | ARC-01 | Ouvrir, lire, modifier et transmettre dans ChatGPT Desktop seulement après GEN-03/04. L'observation hôte doit rester manuelle selon le skill computer-use. | Orchestrateur + commanditaire |
| Dette suivie | DEBT-005 | Couplage du contrat M0 avec l'entrée catalogue React, due à DOM-01. | Backend |

## Décisions et actions

| Action | Motif | Responsable | Jalon |
|---|---|---|---|
| Garder GEN-02 `in_progress`; ne pas soumettre GEN-03/04 | GEN-02 est seul ticket actif et ses métadonnées requises restent ouvertes. | Orchestrateur / backend | Avant GEN-03 |
| Garder le modèle API côté serveur, après le debounce | Le bridge MCP ne déclenche pas une génération cachée du modèle hôte ; le transfert au chat reste explicite avec `/validate`. | Backend | GEN-03 |
| Construire l'inspection visuelle comme capacité distincte, sans profil fixe | L'adaptateur actuel ne reçoit ni capture d'écran ni DOM rendu ; la méthode Unslop ne peut pas être présentée comme déjà exécutée sur l'image. | Backend + frontend | GEN-04, après revue du périmètre de données |
| Reprendre ARC-01 après preuves GEN-03 et GEN-04 | Évite de certifier dans l'hôte une capacité centrale encore incomplète. | Orchestrateur | Après GEN-04 |

## Verdict

**Tranche partielle — à reprendre.** La sélection sans ambiguïté, le statut d'API et le debounce vers des transports simulés sont couverts ; aucun fournisseur réel, critique d'image/DOM, animation de modèle sur plusieurs briefs ou hôte ChatGPT Desktop n'est démontré. GEN-02 demeure le seul ticket actif ; GEN-03/04 n'ont pas été clôturés ni soumis. ARC-01 reste bloqué jusqu'à la séquence fonctionnelle demandée.

Le projet dispose déjà de deux tentatives loop-verify pour cette session de travail et la limite documentée est atteinte ; aucune nouvelle tentative ni verdict loop-verify n'est revendiqué dans ce compte rendu.

## Synthèse

Le modèle configuré sera appelé par l'API serveur après 1,5 seconde ; il ne s'agit pas du modèle caché de ChatGPT. Unslop reste une méthode d'analyse, pas un profil. Les tests locaux passent avec des mocks, mais la compréhension d'animations libres, le filtrage des secrets collés dans le brief et l'inspection visuelle restent à terminer avant la vérification ARC-01.
