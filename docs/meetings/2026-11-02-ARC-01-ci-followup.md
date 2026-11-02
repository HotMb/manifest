# Revue de tâche — ARC-01 — 2 novembre 2026 — suivi CI navigateur

## Identification

| Champ | Valeur réelle |
|---|---|
| Tâche / ticket / objectif | Diagnostiquer puis corriger le sélecteur du helper E2E après reprise d’un brouillon expiré |
| Date et mode de revue | 2 novembre 2026, revue asynchrone dans le chat et inspection des journaux GitHub Actions |
| Branche, commit ou diff examiné | `work/arc-01-qualification`, base `05480d0`, diff local dans `tests/e2e/arc01.spec.ts` |
| Build, environnement et hôte | CI : Ubuntu 24.04, Node 24.22.1, Playwright Chromium ; vérifications locales : Windows, Node 24.5.0, npm 11.5.1 |
| Responsable de la réunion | Orchestrateur |
| Preuves et PR / issue liées | [Run CI 41498686690](https://github.com/HotMb/manifest/actions/runs/41498686690/job/125460261711) · [PR #27](https://github.com/HotMb/manifest/pull/27) · [preuve du diagnostic](../evidence/ARC-01/ci-linux-timeout-2026-11-02.md) |

## Participants et contributions

| Agent ou personne réelle | Rôle | Contribution reçue et référence | Présence / limite |
|---|---|---|---|
| Orchestrateur (`/root`) | Intégration | A extrait le timeout et le helper fautif des logs CI, comparé le choix du helper au breakpoint CSS, préparé le changement puis lancé les vérifications statiques. | Présent ; ne revendique pas la réussite du parcours navigateur. |
| `audit_ui_flow` | Revue frontend en lecture seule | A identifié la course entre `recoverExpired()` et la vérification instantanée `isVisible()` ; a relié la branche mobile au breakpoint 767 px. | Présent par son rapport ; n’a modifié aucun fichier et n’a pas exécuté de test. |
| `arc01_ci_review` | Reviewer Test Automation Engineer | A relu le diff et confirmé que le choix par viewport évite de sélectionner le bouton mobile pendant le rendu de reprise ; a demandé test Chromium ciblé, répétition et CI Linux. | Reviewer distinct ; n’a modifié aucun fichier et n’a pas exécuté de test. |
| Designer | Non requis | Aucun changement d’interface utilisateur ; seul le helper de test change. | Non sollicité. |

## Démonstration du résultat

- Avant : après « Reprendre le brouillon expiré », `openSettings` testait une seule fois la visibilité de l’onglet desktop. Pendant que la vue de reprise était encore affichée, la vérification pouvait retourner faux et le helper attendait ensuite le bouton mobile « Réglages du bloc », caché au-dessus de 767 px.
- Changement local : `openSettings` choisit le contrôle depuis `page.viewportSize()` et le breakpoint mobile CSS de 767 px. Le clic Playwright attend ensuite le contrôle correspondant au viewport.
- Les logs du run Linux confirment 7 scénarios E2E réussis sur 8 ; le dernier a dépassé 30 secondes exactement en attendant le bouton mobile dans `openSettings`.
- Le changement ne modifie pas la logique de reprise de l’application. Il ne prouve pas encore que l’éditeur sort toujours de son écran de reprise dans tous les environnements.

## Tests et critères d’acceptation

| Critère / scénario | Vérification exécutée et version | Résultat observé | Preuve | Reste à faire |
|---|---|---|---|---|
| Le helper choisit le contrôle selon le vrai breakpoint responsive | Relecture du code `tests/e2e/arc01.spec.ts` et `apps/editor-web/src/style.css` | Réussi à la relecture | Diff local ; CSS mobile à 767 px | Confirmer par Chromium ciblé |
| La CI Linux termine la reprise et l’ouverture des réglages | Run GitHub Actions sur le code antérieur, 2 nov. 2026 | Échoué avant correction : 7/8 ; timeout de 30 s sur le bouton mobile | [Run 41498686690](https://github.com/HotMb/manifest/actions/runs/41498686690/job/125460261711) | Pousser le diff puis observer le nouveau run |
| Le test ciblé réussit sur l’environnement local | `npm run test:e2e -- --grep "brouillon expiré"` | Incomplet : aucun rapport après environ 60 s ; processus interrompu | Session locale ; aucun résultat Playwright produit | Réessayer quand le lancement local du navigateur sera diagnostiqué |
| Backlog et types restent cohérents | `npm run check`, `npm run typecheck`, `git diff --check` | Réussi : 26 tickets valides, types sans erreur, diff propre | Sortie locale du 2 nov. 2026 | Aucun pour ce changement |
| Revue indépendante loop-verify | Deux appels sur les critères et preuves de ce changement | Échec : le premier artifact n’incluait pas le compte rendu / les statuts détaillés ; le second n’incluait pas le code du helper | Retours des deux vérifications ; le code est fourni ici et relu séparément par le reviewer Test Automation Engineer | Pas de troisième tentative selon la limite du skill ; aucun verdict global positif revendiqué |

## Avis des spécialistes

| Rôle ayant contribué | Constat vérifiable | Conséquence / recommandation |
|---|---|---|
| Revue frontend (`audit_ui_flow`) | Le clic de reprise déclenche une promesse ; l’ancien helper décidait du layout avant le retour garanti de l’éditeur. | Sélectionner le contrôle à partir du viewport, puis attendre son apparition avec l’auto-wait Playwright. |
| Test Automation Engineer (`arc01_ci_review`) | Le diff corrige la cause du mauvais sélecteur ; si le produit reste sur l’écran de reprise, le test échouera désormais sur le bouton desktop attendu plutôt que sur le bouton mobile caché. | Exécuter le parcours ciblé et répéter le scénario avant d’interpréter le prochain échec comme un défaut produit. |

## Dettes, risques et limites

| Nature | Référence | Impact constaté | Propriétaire | Critère de levée et jalon |
|---|---|---|---|---|
| Défaut de qualification à confirmer après correction | ARC-01 | Le run Linux échoue avant correction ; le changement local n’a pas encore de résultat navigateur. | Frontend (propriétaire ARC-01), intégration par orchestrateur | Test Chromium ciblé puis run CI Linux vert ; sinon investiguer la reprise de l’éditeur avant d’avancer ARC-01. |
| Preuve hôte / identité manquante | ARC-01, blocage existant | Aucun vrai lancement ChatGPT ni preuve d’identité OAuth réelle. | Orchestrateur et propriétaire ARC-01 | Exécuter la matrice de capacités dans le vrai hôte avec compte de test autorisé et consigner la preuve sans jetons. |

Aucune nouvelle dette technique n’est retenue. Les entrées DEBT-001 à DEBT-003 restent inchangées ; l’échec de test et la preuve hôte manquante sont suivis comme défaut/critère ARC-01.

## Décisions et actions

| Décision ou action | Motif | Responsable unique | Ticket / preuve attendue | Échéance par jalon |
|---|---|---|---|---|
| Pousser le sélecteur par viewport et observer la CI Linux | Le run actuel est antérieur à la correction locale ; aucune résolution n’est encore prouvée. | Orchestrateur | ARC-01 · run `Quality` sur le nouveau SHA | Avant de déclarer la qualification E2E stable |
| Si le run échoue encore, examiner capture et trace Playwright et corriger le comportement réellement observé | Éviter de confondre échec du helper et défaut de reprise de l’application. | Frontend, avec revue QA distincte | ARC-01 · preuve navigateur mise à jour | Avant de rouvrir ARC-02 |
| Préparer l’essai dans le vrai hôte ChatGPT et l’environnement d’identité | Dépendance actuelle à la clôture d’ARC-01. | Orchestrateur | ARC-01 · matrice réelle et preuve sans secret | Avant ARC-02 |

## Verdict et prochaine étape

- **Verdict : à reprendre.** Le diff paraît corriger la course du sélecteur, mais l’E2E local est incomplet et la CI du nouveau diff n’a pas encore tourné.
- Critères satisfaits : le diagnostic des logs CI correspond au helper et au breakpoint responsive ; le diff sélectionne le contrôle par viewport ; check, typecheck et diff-check passent.
- Critères manquants : test Chromium ciblé réussi et stable ; run Linux réussi ; vrai hôte ChatGPT et identité réelle.
- État ARC-01 avant / après : `blocked` / `blocked`, révision du registre inchangée à 3. Aucun ticket M1 n’est éligible.
- Prochaine étape : pousser le correctif E2E, vérifier le run Linux, puis traiter les preuves hôte et identité. Aucun besoin de décision du commanditaire pour le correctif local réversible.

## Synthèse partagée dans le chat

Le helper E2E choisissait parfois le bouton mobile pendant la reprise de l’éditeur. Il choisit maintenant les réglages d’après le viewport. Les vérifications statiques passent ; le test navigateur local n’a pas rendu de résultat, et la CI doit encore confirmer la correction. ARC-01 reste bloqué et aucun ticket suivant n’est débloqué.
