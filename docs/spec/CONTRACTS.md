# Contrats de domaine, HTTP, MCP et modèles

## Statut

Contrat normatif de départ, version 1.0. Le [schéma de domaine](contracts/domain.schema.json) ferme les enveloppes JSON ; le catalogue et les invariants ci-dessous ferment la sémantique. Les noms de fonctions ci-dessous sont ceux du produit à développer, pas une transcription des API des SDK.

## Objets et stockage

| Objet | Contenu / invariants |
|---|---|
| Project | id, ownerId, draftId, approvedHeadRevisionId nullable, dates ; jamais un tableau de snapshots imbriqués |
| Draft | projectId, draftVersion entier monotone, snapshot, contentHash, date ; une ligne autoritative par projet M1 |
| Snapshot | schemaVersion, pages, theme, assetRefs, catalogLock, designPolicy et designBrief ; uniquement du contenu, sans historique |
| Revision | id, projectId, parentRevisionId nullable, snapshotHash, snapshot, approvedAt, authorId ; immuable |
| Proposal | id, jobId, session, intentEpoch, baseDraftVersion, opérations atomiques, explication courte, statut |
| Job | id, projectId, utilisateur, type, état, fournisseur/modèle si IA, lease, usage, curseurs ; résultat durable |
| Asset | id, propriétaire/projet, SHA-256, MIME, taille, stockage, attribution et état de contrôle |
| Artifact | id, projectId, revisionId, SHA-256, manifeste, stockage privé, expiration éventuelle du lien |
| OperationReceipt | projet, clé d'idempotence, hash de requête, résultat et draftVersion issue de la transaction |

Tables proposées : projects, drafts, revisions, proposals, jobs, job_events, assets, artifacts, operation_receipts, provider_connections, audit_events. Ajouter des foreign keys et index owner/project/version/job/sequence. Une ressource d'un autre projet ne devient pas accessible parce que son UUID est connu.

Les IDs sont stables, opaques et générés côté produit ; les exemples utilisent des IDs lisibles pour la spécification. Les URLs de page sont uniques dans le projet et internes (chemin commençant par `/`). Aucun identifiant de bloc n'est réutilisé lors d'une duplication. `catalogLock` désigne une release et une empreinte immuables ; les sources et dépendances détaillées sont dans le manifeste de release.

## Contenu Puck

Chaque page porte `composition.content` et `composition.root.props`. Un bloc porte `type` et `props.id`. Les slots sont des propriétés déclarées par le catalogue contenant des tableaux de blocs ; parcourir uniquement ces slots pour retrouver les descendants. Les valeurs de contenu non liées à un slot ne doivent pas être interprétées comme du code ou des composants.

Le registre doit vérifier : type existant, propriétés exactes et bornes, slots autorisés, unicité globale des IDs, arbre acyclique, profondeur et nombre de blocs, références de thème/asset/action valides, liens sûrs, ressources autorisées. Rejeter les clés `__proto__`, `prototype` et `constructor` lors du décodage/assemblage. Le schéma générique n'autorise pas à contourner le schéma propre d'un composant.

## Opérations

| Opération | Champs utiles | Vérification particulière |
|---|---|---|
| insert_block | pageId, parentBlockId nullable, slot, beforeBlockId nullable, block | destination et type admis ; IDs neufs |
| update_props | pageId, blockId, props | aucun changement d'id/type ni remplacement de slot brut |
| move_block | pageId, blockId, parentBlockId nullable, slot, beforeBlockId nullable | pas de cycle ; référence before dans la destination |
| remove_block | pageId, blockId | suppression du sous-arbre ; verrouillages et annulation |
| update_theme | tokens | noms, valeurs et rôles autorisés ; portée projet annoncée |
| add_page | page | route et identifiants uniques |
| update_page | pageId, title, route | route interne unique ; impact navigation contrôlé |
| remove_page | pageId | action humaine seulement ; au moins une page reste |
| update_brief | brief | direction de design propre au projet ; portée globale explicite |
| set_locks | locks | action humaine seulement ; cibles/propriétés existantes |

M1 limite les mutations IA aux blocs des pages/sous-arbres autorisés et aux tokens explicitement autorisés. Une demande générale n'accorde pas implicitement `remove_page` ou un changement de tout le thème. Les composants/propriétés verrouillés ne peuvent être modifiés par l'IA ; un déverrouillage est une action humaine distincte.

## Commandes transactionnelles

Enveloppe : `projectId`, `expectedDraftVersion`, `idempotencyKey`, `action`, `payload`. Approbation et restauration portent aussi `expectedHeadRevisionId` (nullable à la première approbation), vérifié dans la même transaction pour protéger le head. L'identité vient du token vérifié, jamais d'un `ownerId` fourni par le client.

| action | payload | Effet |
|---|---|---|
| apply_ops | operations[] | sauvegarde manuelle d'un lot ; incrémente draftVersion si contenu différent |
| keep_proposal | proposalId, operationsAfter[] | vérifie proposition/base, applique ses opérations puis le réglage manuel éventuel, un seul commit |
| approve | proposalId nullable | conserve au besoin la proposition éligible puis crée la révision approuvée de l'état exact |
| restore | revisionId | copie un ancien snapshot vers le brouillon et crée une nouvelle révision approuvée avec parent = head actuel |

Transaction : autorisation -> récupération du reçu d'idempotence -> contrôle atomique expectedDraftVersion -> vérification des opérations/locks/quotas -> application sur copie -> validation complète -> écriture + audit + reçu -> réponse. Tout le lot est refusé si une opération échoue. Le serveur ne fait pas d'écriture partielle.

Les révisions approuvées ne changent jamais. Approuver un brouillon sans modification de contenu peut créer une révision pointant le même hash ; le reçu évite de la doubler en cas de retry. La commande approve vérifie aussi que la proposition est toujours active dans la session et compatible avec le brouillon.

Réponse : projectId, draftVersion, contentHash, snapshot confirmé, revisionId nullable et receiptId. Le document complet est réservé à la vue lorsque livré par MCP ; le contexte modèle reçoit un résumé compact. Une réponse périmée ne doit pas remplacer une projection locale plus récente.

## Jobs et événements

| État | Signification |
|---|---|
| queued | en attente, aucun appel fournisseur commencé |
| running | traitement actif, lease détenu |
| succeeded | résultat complet et disponible |
| failed | erreur connue ; catégorie et reprise indiquées |
| cancelled | aucun nouveau résultat appliquable ; appel externe peut néanmoins avoir été facturé |
| outcome_unknown | appel parti mais issue non récupérable ; aucune relance coûteuse automatique |

Transitions : queued -> running/cancelled ; running -> succeeded/failed/cancelled/outcome_unknown. Les états terminaux ne reviennent pas à running avec le même jobId. Un retry explicite crée un nouveau job et référence le précédent. Une demande d'annulation garde un reçu et rend la proposition inéligible dès confirmation serveur ; la vue l'invalide immédiatement sans attendre.

Événement : jobId, seq entier croissant, type, timestamp, data. Types M1 : queued, started, progress, proposal_ready, usage, succeeded, failed, cancelled, outcome_unknown. `proposal_ready` contient une proposition complète et vérifiée. Le serveur déduplique les événements ; le client ignore seq déjà reçu. Les événements sont des mises à jour du produit, pas des tours de conversation.

Pagination : `afterSeq` exclusif, `limit` 1..100 (défaut 50), réponse events[], nextSeq et état courant. Si le curseur a expiré, réponse `CURSOR_EXPIRED` avec consigne de relire le job/résultat final ; ne pas redémarrer l'inférence. Conservation initiale des événements 7 jours, résultat/propositions selon politique projet.

## API HTTP proposée

Toutes les routes sauf discovery et health sont authentifiées. L'OpenAPI jointe décrit les opérations de départ ; le bootstrap OAuth est documenté séparément et implémenté avec un composant maintenu. Si projectId figure dans le chemin et le corps, les deux doivent être identiques, sinon INVALID_INPUT ; l'autorisation porte toujours sur la ressource effectivement utilisée. Un jobId, proposalId ou revisionId reçu doit appartenir à ce même projet.

| Méthode / route | Résultat |
|---|---|
| POST /api/v1/projects | crée un projet vide depuis le template versionné |
| GET /api/v1/projects/{projectId} | brouillon et head approuvé autorisés |
| POST /api/v1/projects/{projectId}/commands | exécute une commande atomique |
| POST /api/v1/projects/{projectId}/suggestions | crée un job d'inférence ; 202, pas attente du modèle |
| POST /api/v1/projects/{projectId}/exports | crée un job pour une revisionId approuvée |
| GET /api/v1/jobs/{jobId} | état et références de résultats autorisées |
| GET /api/v1/jobs/{jobId}/events | événements bornés après curseur |
| GET /api/v1/proposals/{proposalId} | résultat complet autorisé, notamment après expiration des événements |
| POST /api/v1/jobs/{jobId}/cancel | annulation idempotente |
| GET /api/v1/projects/{projectId}/revisions | historique paginé ; cursor opaque, limit 1..50 |
| GET /api/v1/projects/{projectId}/revisions/{revisionId} | snapshot immuable |
| POST /api/v1/projects/{projectId}/assets | upload binaire contrôlé ; spécification de transport à qualifier M0 |
| POST /api/v1/projects/{projectId}/assets/resolve | URLs courtes et métadonnées des assets autorisés pour l'aperçu |
| GET /api/v1/artifacts/{artifactId}/download | vérifie les droits puis lien temporaire ou flux privé |
| GET /api/v1/artifacts/{artifactId} | manifeste autorisé et chemin interne de téléchargement |

Idempotency-Key obligatoire pour création de projet/job/export ; présent aussi dans le corps des commandes. Une incohérence clé header/corps est refusée. Annuler deux fois ne relance rien. Les clés sont uniques dans la portée utilisateur/projet/opération et conservées au moins 24 h ; après expiration le client doit vérifier le statut avant un retry.

Codes communs : UNAUTHENTICATED (401), FORBIDDEN (403), NOT_FOUND (404), INVALID_INPUT (422), VERSION_CONFLICT (409), IDEMPOTENCY_CONFLICT (409), LOCKED_TARGET (409), STALE_PROPOSAL (409), CURSOR_EXPIRED (409), CAPABILITY_UNSUPPORTED (422), BUDGET_EXCEEDED (429), RATE_LIMITED (429), PROVIDER_REFUSAL (422), PROVIDER_UNAVAILABLE (503), INTERNAL_ERROR (500). Les ressources privées inexistantes et inaccessibles peuvent répondre 404 pour éviter leur énumération. Les erreurs contiennent code, message exploitable, requestId, retryable et détails non sensibles.

Les statuts HTTP d'erreur concernent la requête courante, dont les contrôles avant création d'un job. Une erreur fournisseur survenue après le démarrage est enregistrée dans `Job.error` et les événements ; lire ce job reste une réponse HTTP 200. Le client décide d'une reprise à partir de l'état métier, jamais du seul statut HTTP de lecture.

## Outils MCP

Les noms et schémas proviennent des mêmes contrats que HTTP. `open_designer` est visible du modèle et de l'app ; les outils techniques de la vue sont app-only lorsque supporté, mais tous passent les contrôles de droits.

| Outil | Cas d'usage commun |
|---|---|
| open_designer | lire/créer le projet autorisé, session d'éditeur, ressource UI |
| read_project | lire le brouillon autorisé |
| commit_commands | apply_ops / keep_proposal / approve / restore |
| start_suggestion | démarrer un job |
| get_job / get_job_updates / cancel_job / read_proposal | suivre, annuler ou retrouver un résultat |
| list_revisions / read_revision | historique |
| start_export / get_artifact | artefact approuvé et téléchargement |
| resolve_assets | résolution autorisée des images pour l'aperçu, résultats réservés à la vue |

Les outils retournent un `structuredContent` conforme à leur outputSchema. Éviter le code source complet dans le contexte modèle : exporter une archive avec id/hash/manifeste et lien autorisé. Les réponses de données ne portent pas la ressource UI d'ouverture.

La résolution d'assets retourne assetId, sha256, URL de lecture courte et expiresAt, exclusivement après contrôle de projet. Ces URLs sont des données runtime réservées à la vue, jamais des valeurs persistées dans le Snapshot, les prompts, les logs ou l'export. L'origine d'assets est autorisée par la CSP ; à expiration, la vue renouvelle la résolution. L'export copie les fichiers autorisés depuis leurs références immuables, pas depuis un lien expiré.

## Adaptateurs de modèles

Interface métier proposée : `getCapabilities()`, `generateProposal(context, signal) -> événements`, `normalizeError(error)`, `normalizeUsage(response)`. `context` comprend intent, snapshot réduit, allowedOperations, allowedTargets, catalogSubset, designPolicyRef, locks, provider/model explicites, budgets et identifiants de causalité.

Chaque adaptateur utilise le SDK officiel et une projection du schéma compatible avec le modèle sélectionné. Le résultat est revalidé avec le schéma commun et le domaine. Les limites du fournisseur ne changent pas les invariants du produit. Au plus une réparation de sortie invalide, facturée/mesurée ; aucun retry en cas de refus, erreur d'auth, budget dépassé ou résultat incertain.

Générer des opérations et de courtes raisons de design, pas des instructions pour l'hôte ni du code à évaluer. Une classification `direct`/`alternatives` ne donne aucun droit supplémentaire. Le contexte se limite à la page sélectionnée et aux dépendances nécessaires, sauf demande explicitement globale.

## Versionnage des contrats

HTTP /v1, schemaVersion = 1 et version de release du catalogue sont indépendants. Une migration de snapshot est pure, testée sur fixtures et crée une nouvelle version ; elle ne réécrit pas l'historique. Une version inconnue est refusée avec un message de mise à niveau. Les changements de contrat sont accompagnés de tests de compatibilité et d'une décision enregistrée.
