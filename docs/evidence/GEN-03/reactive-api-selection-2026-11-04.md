# Preuve partielle — sélection API et aperçu réactif — 4 novembre 2026

## Périmètre observé

Cette preuve couvre la tranche locale de GEN-03 préparant l'appel modèle après le debounce de 1 500 ms : sélection d'une cible non ambiguë, statut présenté près du brief, attente d'un modèle explicite lorsqu'il en existe plusieurs, invalidation des résultats anciens et repli sur les pistes locales limitées. Le registre GEN-03 reste `todo`, car GEN-02 n'est pas terminé ; cette preuve ne clôt ni ne soumet le ticket.

Quand un seul fournisseur et un seul modèle configurés sont reçus du serveur, Manifest les sélectionne et le brief affiche que le prochain arrêt de saisie appellera l'API de ce fournisseur. Si le registre expose plusieurs modèles, aucun n'est choisi au hasard : aucun job ne démarre avant que l'utilisateur en sélectionne un. Si aucune API n'est configurée, les pistes locales sont annoncées comme limitées. Un changement de brief rend immédiatement un candidat précédent inéligible ; une réponse tardive ne remplace pas la demande actuelle.

La clé reste côté serveur. Pour ChatGPT, l'inférence de l'aperçu passe par l'API configurée, facturée séparément de ChatGPT lorsque le fournisseur la facture. Le plugin ne déclenche pas un tour caché du modèle hôte à chaque frappe ; `/validate` reste un transfert explicite.

Le secret serveur de fournisseur ne fait pas partie du job ni du prompt. En revanche, aucun filtre exhaustif des credentials que l'utilisateur pourrait coller lui-même dans son brief n'est encore implémenté ; le contrat AI-02 doit vérifier ce risque avant un essai avec des données confidentielles.

Unslop n'est pas un profil visuel à injecter. Le prompt demande au modèle de déduire une direction du produit, du brief et des contraintes ; le schéma hérité `designPolicy` est supprimé de la copie sérialisée vers le fournisseur. L'adaptateur transmet la description, le Snapshot structuré et les capacités textuelles du catalogue. Il ne transmet pas de capture d'écran, le DOM/CSS rendu ou le viewport choisi : aucune inspection visuelle Unslop du canevas réel n'est donc prouvée.

## Vérifications exécutées

| Vérification | Résultat observé |
|---|---|
| Playwright complet | 39/39 réussis. Comprend le délai modèle exact de 1 500 ms, l'absence de job sans modèle parmi plusieurs, le choix explicite, les réponses périmées et la transition local → API simulée → local. |
| Playwright ciblé — transition de source | 1/1 réussi après mise à jour du scénario : le modèle unique étant présélectionné par défaut, le test choisit explicitement le mode sans fournisseur pour démarrer sa branche locale. |
| `npm run test:providers` | 31/31 réussis. Adapter et job utilisent des réponses simulées ; aucun appel fournisseur facturable. |
| `npm run test:catalog` | 15/15 réussis. |
| `npm run test:m0` | 72/72 réussis avec accès loopback local autorisé. |
| `npm test` | 22 réussis et 1 ignoré, l'environnement Windows ne permettant pas la création du lien symbolique requis ; la commande se termine avec succès. |
| Typecheck et build | Réussis. Le build émet les avertissements Rolldown existants `use client`. |
| `npm run check` | Réussi : backlog valide, 31 tickets, révision 47. |
| `git diff --check` | Réussi ; Git signale seulement des conversions de fins de lignes CRLF/LF à la prochaine écriture. |
| GitHub Actions `Quality #86` | Réussie sur le commit poussé `4d3c222`; contrats Python exécutés avec dépendances CI disponibles. |
| Contrats Python | Les deux commandes ont été tentées mais échouent au chargement, car le module `jsonschema` manque dans l'environnement. |
| API fournisseur réelle / ChatGPT Desktop | Non exécutés : les tests s'arrêtent aux transports simulés ; aucune clé fournisseur ni preuve de l'hôte n'a été utilisée. |

La suite navigateur affiche l'avertissement Puck `setData` coûteux pendant le montage ; aucun test n'échoue et aucune mesure de performance n'est disponible. Cette observation est à mesurer avant d'en faire une dette acceptée.

## Limites et suite

- Le modèle ne peut proposer que des opérations acceptées par les contrats et la release catalogue. Il ne peut pas exécuter une animation ou dépendance absente de la release.
- GEN-02 reste à `in_progress` (provenance/licence, empreinte source et coût mesuré encore ouverts). GEN-03/04/05 restent dépendants de ce travail ; aucun changement de statut n'est revendiqué.
- Les variables fournisseur `MANIFEST_PROVIDER`, `MANIFEST_MODEL`, `MANIFEST_API_BASE_URL` et `MANIFEST_API_KEY` ne sont pas présentes dans l'environnement courant ; il n'y a donc pas de test live possible ici. Aucun filtre exhaustif des credentials saisis dans le brief n'est livré.
- GEN-04 doit prouver, avec des fixtures de fournisseur, que plusieurs briefs d'animation et de vitesse changent le même aperçu central, et doit définir une voie contrôlée pour faire examiner le rendu réel par un modèle multimodal si la critique pixel/DOM est requise.
- GEN-05 doit étendre les mouvements usuels compris depuis le langage libre tout en restant limité aux capacités admises et rendues localement.
- ARC-01 ne sera repris qu'après ces preuves fonctionnelles, puis vérifié séparément dans ChatGPT Desktop. Aucune ouverture ou modification de l'hôte réel n'est revendiquée ici.

Cette preuve est liée au compte rendu [GEN-03/04 — tranche d'inférence et d'aperçu réactif](../../meetings/2026-11-04-GEN-03-live-inference-review.md).
