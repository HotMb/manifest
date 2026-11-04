# Contrats de domaine, HTTP, MCP et modèles

## Statut

Contrat normatif de départ, version 1.1. Le [schéma de domaine](contracts/domain.schema.json) ferme les enveloppes JSON ; le catalogue et les invariants ci-dessous ferment la sémantique. Les noms de fonctions ci-dessous sont ceux du produit à développer, pas une transcription des API des SDK.

## Objets et stockage

| Objet | Contenu / invariants |
|---|---|
| Project | id, ownerId, draftId, approvedHeadRevisionId nullable, dates ; jamais un tableau de snapshots imbriqués |
| Draft | projectId, draftVersion entier monotone, snapshot, contentHash, date ; une ligne autoritative par projet M1 |
| Snapshot | schemaVersion, pages, theme, assetRefs, catalogLock, designPolicy, designBrief et `dataIntegrationSpecs` ; contenu versionné, sans historique ni secrets |
| Revision | id, projectId, parentRevisionId nullable, snapshotHash, snapshot, approvedAt, authorId ; immuable |
| Proposal | id, jobId, session, intentEpoch, baseDraftVersion, opérations atomiques, explication courte, statut |
| Job | id, projectId, utilisateur, type, état, fournisseur/modèle si IA, lease, usage, curseurs ; résultat durable |
| Asset | id, propriétaire/projet, SHA-256, MIME, taille, stockage, attribution et état de contrôle |
| Artifact | id, projectId, revisionId, SHA-256, manifeste, stockage privé, expiration éventuelle du lien |
| HandoffReport | manifeste dérivé `manifest.design-report.v1`, toujours attaché à une révision immuable |
| LaunchContext | handoff éphémère et explicite de l'hôte : opération de création/modification, cible/version et proposition d'assistant ; aucun accès au texte natif non envoyé |
| DataIntegrationSpec | description non secrète d'une source de données, de son schéma et des liaisons de visualisation demandées |
| OperationReceipt | projet, clé d'idempotence, hash de requête, résultat et draftVersion issue de la transaction |

Tables proposées : projects, drafts, revisions, proposals, jobs, job_events, assets, artifacts, operation_receipts, provider_connections, audit_events. Ajouter des foreign keys et index owner/project/version/job/sequence. Une ressource d'un autre projet ne devient pas accessible parce que son UUID est connu.

### Rapport de transmission

`manifest.design-report.v1` est un manifeste dérivé d'une révision immuable, et non une deuxième source de vérité. Il porte au minimum `format`, `projectId`, `pageIds`, `revisionId`, `snapshotHash`, `catalogLock`, `assistantProposal` (nullable, origine hôte), `originalDescription`, `designSpec`, `pagesAndRoutes`, `themeTokens`, `componentManifest`, `interactions`, `motion`, `responsiveRules`, `assetRefs`, `accessibility`, `dataIntegrationSpecs` (tableau, vide si aucune), `modelProvenance`, `eligibilityEvidence`, `assumptions`, `unsupportedFeatures` et `reportHash`. Chaque entrée du manifeste de composants conserve le type, les propriétés utilisées, l'ID/version de catalogue, les dépendances autorisées et l'identification de licence/source. Un schéma JSON strict et ses fixtures seront livrés avec le ticket qui implémente cette capacité ; aucun runtime ne doit traiter cette liste comme un schéma permissif.

`LaunchContext` est fourni explicitement par l'hôte ou les arguments de `open_designer` : `operation` (`create_project`/`create_page`/`modify_page`), cible, `baseDraftVersion` lorsqu'un projet existe, `assistantProposal` (texte de la proposition ChatGPT) et `initialCandidate` facultatif. `create_project` n'a ni `projectId` ni `pageId` et utilise un Snapshot vide ; `create_page` exige un `projectId` autorisé, aucun `pageId`, et `baseDraftVersion`, puis charge ce projet ; `modify_page` exige projet, page et `baseDraftVersion`. Un candidat structuré expose sa cible et `baseDraftVersion` et contient soit la page à créer, soit les opérations à prévisualiser. La version/cible attendue doit correspondre au Snapshot rechargé avant affichage comme proposition. Un handoff d'assistant ne vaut pas approbation. Si seul un texte est transmis, il préremplit le champ et l’analyse locale démarre automatiquement après 1 500 ms ; une API distante est appelée seulement si un fournisseur et un modèle ont été configurés et choisis explicitement. La recherche catalogue reste indépendante. Si aucun contexte n'est transmis, la vue ne tente pas d'extraire le texte du compositeur natif. Ce contrat décrit la cible : le schéma exécutable MCP/LaunchContext et les fixtures d'hôte sont encore à livrer/qualifier via UI-03 et la recette de l'hôte ; le fichier `domain.schema.json` courant n'est pas une preuve que ces champs sont déjà pris en charge.

Chaque `DataIntegrationSpec` est conservée dans le `Snapshot.dataIntegrationSpecs[]` avec un identifiant stable et non secret. L'opération domaine `set_data_integration_spec` la crée ou la met à jour au sein de `apply_ops` et incrémente la version du brouillon ; l'approbation de cette version en fige le contenu avec la révision. Elle peut contenir un libellé/référence de source non secrète, un identifiant de connecteur autorisé si disponible, le dataset, les champs et types du schéma utiles, les liaisons d'un bloc graphique vers métriques/dimensions, les agrégations/filtres, la fréquence souhaitée de rafraîchissement, `previewMode` (`synthetic`/`connected`) et les prérequis d'autorisation. Le rapport est construit depuis la révision et recopie exactement ces spécifications ; le modèle hôte les reçoit à `/validate` pour comprendre le code d'intégration attendu. Ni mot de passe, clé, jeton, credential ni jeu brut de données sensibles ne sont admis dans ces objets ; l'accès réel exige un connecteur autorisé ou des secrets configurés séparément dans l'application générée.

`modelProvenance` est absente si aucune proposition de modèle n'a été conservée ; sinon elle référence la provenance capturée dans le job/proposal (source locale ou fournisseur, providerId/modelId, jobId/generationId et `baseDraftVersion`). Elle n'est jamais reconstruite à partir du fournisseur actuellement choisi. L'état « à jour » est calculé avec les mêmes contrôles que l'aperçu. Le rapport ne contient jamais de clé, jeton ou secret.

`eligibilityEvidence` capture le résultat au moment où le domaine valide la révision : `ruleVersion`, `result` (`passed` ou `not_applicable`), `sourceProposalId` nullable, `baseDraftVersion`, `approvedRevisionId`, `approvedSnapshotHash` et les contrôles nommés (session, intention, version source, fournisseur/modèle et absence de modifications manuelles non synchronisées). `not_applicable` signifie que la révision n'a pas retenu de proposition modèle. Ces valeurs sont immuables avec la révision ; un contrôle courant différent ne réécrit pas l'évidence historique.

Le hash est reproductible : `reportHash = SHA-256(JCS(report sans reportHash))`, avec JCS conforme à RFC 8785 sur l'objet JSON UTF-8. Les tableaux suivent l'ordre sémantique du Snapshot ou un ordre stable par ID ; l'état de livraison du message, un horodatage de préparation et les informations volatiles de transport restent hors de l'objet hashé. L'identifiant de révision, l'empreinte du Snapshot, la release et la preuve d'éligibilité font partie des champs hashés.

Le rapport ne peut être préparé qu'à partir d'une révision figée. L'extension présente le résumé et les limites puis transmet explicitement le contenu au chat courant si l'hôte le permet afin que son modèle puisse poursuivre la génération de l'application et interpréter `dataIntegrationSpecs`. Le rapport décrit la connexion demandée, mais ne confère pas lui-même l'accès à la source. L'échec ou l'absence de capacité de transmission conserve la révision et propose copie/téléchargement ; aucun succès d'envoi n'est annoncé sans confirmation de l'hôte. Le code complet reste un artefact séparé lié à la révision.

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
| set_data_integration_spec | integrationSpecId, spec | crée/met à jour une spécification non secrète dans le Snapshot via apply_ops ; champs, cible graphique et connecteur autorisé validés |
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

Événement : jobId, seq entier croissant, type, timestamp, data. Types M1 : queued, started, progress, proposal_ready, usage, succeeded, failed, cancelled, outcome_unknown. `proposal_ready` contient une proposition complète et vérifiée. Le serveur déduplique les événements ; le client ignore seq déjà reçu. Les événements sont des mises à jour du produit, pas des tours de conversation. Le prototype M0 émet également `proposal_stale`, `proposal_kept` et `proposal_rejected` pour refléter les décisions et les contrôles de version dans la vue.

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
| open_designer | recevoir un LaunchContext explicite, lire/créer le projet autorisé, session d'éditeur, ressource UI |
| read_project | lire le brouillon autorisé |
| prepare_handoff_report | construire le rapport déterministe depuis une révision approuvée et sa release de catalogue, pour relecture dans la vue |
| get_provider_registry | lire les fournisseurs et modèles publics configurés pour cette session ; jamais les secrets |
| commit_commands | apply_ops / keep_proposal / approve / restore |
| start_suggestion | démarrer un job |
| get_job / get_job_updates / cancel_job / read_proposal | suivre, annuler ou retrouver un résultat |
| keep_proposal / reject_proposal | conserver explicitement un candidat vérifié ou l'ignorer |
| list_revisions / read_revision | historique |
| start_export / get_artifact | artefact approuvé et téléchargement |
| resolve_assets | résolution autorisée des images pour l'aperçu, résultats réservés à la vue |

Les outils retournent un `structuredContent` conforme à leur outputSchema. Éviter le code source complet dans le contexte modèle : exporter une archive avec id/hash/manifeste et lien autorisé. Les réponses de données ne portent pas la ressource UI d'ouverture.

La résolution d'assets retourne assetId, sha256, URL de lecture courte et expiresAt, exclusivement après contrôle de projet. Ces URLs sont des données runtime réservées à la vue, jamais des valeurs persistées dans le Snapshot, les prompts, les logs ou l'export. L'origine d'assets est autorisée par la CSP ; à expiration, la vue renouvelle la résolution. L'export copie les fichiers autorisés depuis leurs références immuables, pas depuis un lien expiré.

## Adaptateurs de modèles

Interface métier proposée : `getCapabilities()`, `generateProposal(context, signal) -> événements`, `normalizeError(error)`, `normalizeUsage(response)`. `context` comprend intent, `assistantProposal` lorsqu'elle a été transmise, snapshot réduit, dataIntegrationIntent non secrète, allowedOperations, allowedTargets, catalogSubset, designPolicyRef, locks, provider/model explicites, budgets et identifiants de causalité.

Chaque adaptateur utilise le SDK officiel et une projection du schéma compatible avec le modèle sélectionné. Le résultat est revalidé avec le schéma commun et le domaine. Les limites du fournisseur ne changent pas les invariants du produit. Au plus une réparation de sortie invalide, facturée/mesurée ; aucun retry en cas de refus, erreur d'auth, budget dépassé ou résultat incertain.

Générer des opérations et de courtes raisons de design, pas des instructions pour l'hôte ni du code à évaluer. Une classification `direct`/`alternatives` ne donne aucun droit supplémentaire. Le contexte se limite à la page sélectionnée et aux dépendances nécessaires, sauf demande explicitement globale.

## Versionnage des contrats

HTTP /v1, schemaVersion = 1 et version de release du catalogue sont indépendants. Une migration de snapshot est pure, testée sur fixtures et crée une nouvelle version ; elle ne réécrit pas l'historique. Une version inconnue est refusée avec un message de mise à niveau. Les changements de contrat sont accompagnés de tests de compatibilité et d'une décision enregistrée.
