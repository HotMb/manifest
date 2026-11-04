# Revue GEN-01 — boucle de conception réactive — 4 novembre 2026

## Identification

| Champ | Valeur |
|---|---|
| Tâche / ticket | GEN-01 — Boucle de conception réactive |
| Date et mode de revue | 4 novembre 2026, revue d’équipe asynchrone dans le chat et revue de preuves versionnée |
| Branche et révision de tickets | `work/arc-01`, registre révision 33 avant décision |
| Build et environnement | Chromium/Playwright local, navigateur réel `127.0.0.1:5173`; les tests fournisseur utilisent des adaptateurs simulés |
| Responsable | `/root`, orchestrateur |
| Preuves | [Implémentation](../evidence/GEN-01/implementation.md), [revue QA](../evidence/GEN-01/review.md), PR #27 en brouillon |

## Participants et contributions

| Agent ou personne | Rôle | Contribution reçue | Présence / limite |
|---|---|---|---|
| `/root/debounce_core` | Frontend, propriétaire | Analyse après debounce automatique, invalidation des candidats périmés, recette ventes/nuages, mouvements haut/bas et vitesse, réglage temporaire reduced-motion, tests et preuve d’implémentation. A soumis GEN-01 à la revue via le CLI. | N’a pas clôturé son ticket ni committé dans l’arbre partagé. |
| `/root/arc01_code_review` | Revue de code indépendante | A approuvé le correctif pour passage en QA ; confirme que les mouvements seuls gardent leur opacité pleine et sépare GEN-02/03 et le filtre de secrets du périmètre GEN-01. | Revue en lecture seule ; les résultats d’exécution lui ont été fournis par l’orchestrateur. |
| `/root/arc01_design_review` | Design / accessibilité | A revu le contrôle reduced-motion dans la barre du canevas, sa taille mobile, son nom accessible et l’absence de persistance. Le CSS final utilise 11 px et le test vérifie 375 px. | Pas d’observation dans ChatGPT Desktop. |
| `/root/gen01_qa` | QA indépendant | Verdict APPROVED dans le périmètre GEN-01. Confirme les critères par revue du code, des tests et des preuves ; demande de garder explicites les limites fournisseur et hôte. | A relevé que la chaîne modèle est couverte en couches, pas par une seule assertion E2E multi-modèle. |
| `/root` | Orchestrateur / vérification exécutée | A relancé la suite complète et les tests ciblés, inspecté la page locale et ses journaux, puis synchronisé l’évidence et le registre. | La vérification locale ne représente pas ChatGPT Desktop. |

Le commanditaire n’a pas participé à cette revue asynchrone ; le résultat et le compte rendu lui sont communiqués dans le chat.

## Résultat démontré

- Une saisie libre déclenche automatiquement les règles locales après 1 500 ms sans frappe. Une nouvelle saisie redémarre le délai ; l’IME et l’invalidation des résultats périmés sont couverts.
- Sans fournisseur, le tableau de bord de démonstration avec nuages et deux graphiques apparaît dans le canevas. Les directions haut/bas, les combinaisons fondu + déplacement et la vitesse modifient le candidat sans sauvegarder le brouillon.
- Lors d’une préférence système de mouvement réduit, l’aperçu reste statique par défaut. « Lire » permet une exception temporaire dans le seul canevas et « Réduire » rétablit l’état statique.
- Dans le navigateur local, après 1,8 s, deux graphiques et les nuages sont visibles. Le preset `fade-slide-up` affiche 14 px et 373 ms à x1,5. Aucun log d’erreur n’est apparu ; le navigateur a signalé l’avertissement Puck `setData` coûteux.
- À 1920 × 911, l’atelier reste contenu dans la fenêtre ; les panneaux latéraux défilent indépendamment. L’émulation 375 px ne déborde pas horizontalement.

## Vérifications et critères

| Scénario | Vérification | Résultat |
|---|---|---|
| Debounce, reprise à la frappe et composition IME | Horloge Playwright, tests E2E | Réussi, seuil 1 499/1 500 ms. |
| Dashboard, nuages, graphiques, direction et vitesse | Playwright + observation navigateur locale | Réussi avec données synthétiques et aperçu temporaire. |
| Mouvement réduit et déplacement sans fondu | Tests E2E à horloge contrôlée, y compris préférence simulée | Réussi ; aucun fondu ajouté au déplacement seul. |
| Modèle, brief et Snapshot | E2E du candidat simulé, tests multi-modèle et adaptateur HTTP | Réussi par couches ; aucun appel fournisseur réel. |
| Parcours navigateur complet | Playwright Chromium | 36/36 réussis en 2 min 30. |
| E2E ciblés reduced-motion / déplacement | Playwright | 4/4 réussis en 16,1 s. |
| Tests unitaires et intégration | parser 13/13 ; `npm test` 22 réussis, 1 ignoré ; fournisseurs 29/29 ; M0 72/72 | Réussi, sauf test ignoré pour la restriction Windows sur les liens symboliques. |
| Typecheck, build et contrôle du registre | `npm run typecheck`, `npm run build`, `npm run check` | Réussi ; registre valide révision 33 avant clôture. Le build émet des avertissements Rolldown `use client`. |
| Contrats Python | `python scripts/check_contracts.py` et tests Python | Non exécutés : le module `jsonschema` est absent de cet environnement. |
| Contrôle loop-verify | Envoi limité aux extraits après refus du diff complet | Aucun verdict exploitable : l’espace isolé ne contenait pas les fichiers. Aucun PASS revendiqué. |
| ChatGPT Desktop, API réelle, credentials utilisateur | Non exécutés | Non démontrés ; ARC-01 reste bloqué. |

## Dettes, risques et limites

- GEN-01 couvre le vocabulaire local et le catalogue actuellement présents. Il ne promet pas toute animation décrite en français ; la composition de primitives paramétrables est le travail de GEN-02, puis GEN-03 doit faire interpréter la demande par le fournisseur choisi et contraindre sa sortie au catalogue audité.
- Le fournisseur n’a pas été configuré ni appelé. Le test du modèle utilise un transport simulé. Les secrets saisis dans le brief ou le Snapshot ne sont pas encore filtrés avant transfert ; GEN-03 porte cette exigence.
- La chaîne de sélection fournisseur/modèle, du brief et du Snapshot est testée par couches. Une future amélioration pourrait ajouter une assertion E2E de bout en bout avec plusieurs modèles.
- DEBT-005 demeure ouverte : séparer les types et validateurs purs du renderer React avant DOM-01.
- Aucun appareil mobile physique, serveur distant, hôte ChatGPT Desktop ou identité OAuth n’a été validé. ARC-01 reste bloqué pour son gate hôte/identité/rafraîchissement.

## Décisions et prochaines actions

| Action | Responsable | État / jalon |
|---|---|---|
| Clôturer GEN-01 après approbation QA et preuve de revue distincte | Orchestrateur | Fait via CLI à la révision 34. |
| Poursuivre l’inventaire et le catalogue typé versionné, dont les mouvements paramétrables et leurs licences | Backend, GEN-02 | En cours ; revue des sources, compatibilité, coûts et sécurité nécessaire. |
| Ajouter ensuite la génération guidée par modèle, la méthode de revue contextualisée inspirée d’Unslop (sans profil fixe) et le traitement des secrets | Backend, GEN-03 | Bloqué par GEN-02 ; pas d’appel payant par défaut. |
| Produire la preuve d’hôte et d’identité ChatGPT Desktop | Orchestrateur avec le commanditaire | ARC-01 bloqué ; les tests locaux ne lèvent pas ce gate. |

## Verdict

**GEN-01 : terminé** après vérification QA indépendante et clôture par le CLI. Le ticket valide l’expérience locale réactive définie ; il ne valide pas la génération générale de toute animation, un fournisseur réel ni ChatGPT Desktop. Le registre est à la révision 34 ; le tableau a été régénéré et `npm run check` passe. `team:next` ne retourne aucun nouveau ticket éligible.

## Synthèse partagée

Le debounce automatique et les mises à jour du canevas fonctionnent dans le navigateur local : 36/36 E2E passent, dont la mise à jour après 1,5 s, les nuages/graphiques et les préférences de mouvement. Les logs ne montrent aucune erreur, seulement un avertissement Puck. La QA approuve GEN-01. Les animations restent limitées au catalogue actuel ; GEN-02/03 doivent apporter les primitives paramétrables et l’interprétation par modèle. Voir [la preuve d’implémentation](../evidence/GEN-01/implementation.md) et [la décision QA](../evidence/GEN-01/review.md).
