# Revue de tâche — ARC-01 — 2 novembre 2026

## Identification

| Champ | Valeur |
|---|---|
| Tâche / ticket / objectif | Tenter la qualification ChatGPT ARC-01 et déterminer précisément le prochain blocage |
| Date et mode de revue | 2 novembre 2026 — revue asynchrone documentée dans le chat |
| Branche, commit ou diff examiné | `work/arc-01-qualification`, première tentative sur `3694f2ea63f1af1868e5cf05704a518931599210`, addendum desktop après `1c719c0` |
| Build, environnement et hôte | Windows, processus MCP local stdio ; hôte ChatGPT non atteint |
| Responsable de la réunion | Orchestrateur Codex |
| Preuves liées | [Tentative d'accès au vrai hôte](../evidence/ARC-01/host-attempt-2026-11-02.md), [preuve locale](../evidence/ARC-01/implementation.md) |

## Participants et contributions

| Agent ou personne réelle | Rôle | Contribution reçue et référence | Présence / limite |
|---|---|---|---|
| Orchestrateur Codex | Exécution et synthèse | Client du SDK MCP lancé contre le vrai processus stdio du dépôt ; résultats et limites consignés dans la preuve d'accès | A exécuté la vérification locale ; n'a pas automatisé l'UI ChatGPT |
| `audit_mcp_flow` | Reviewer distinct | A relu les critères du ticket et conclu que le handshake local ne démontre pas les critères ChatGPT/identité ; recommande de conserver `blocked` — [retour archivé](../evidence/ARC-01/review-2026-11-02.md) | Agent différent du responsable de l'essai, mandat lecture seule ; aucun test hôte |
| `arc01_backend` | Backend / plateforme | A confirmé par la documentation que Secure MCP Tunnel accepte un lancement MCP stdio, donc aucun changement de transport n'est requis ; a distingué la clé runtime du tunnel de l'identité OAuth utilisateur — [retour archivé](../evidence/ARC-01/review-2026-11-02.md) | Revue en lecture seule ; aucun tunnel ni secret configuré |
| `arc01_design_review` | Designer / UX | WebMCP demande que la page soit ouverte ; le champ de la page peut réagir, mais ni une commande native `/manifest` ni une réponse ChatGPT après chaque pause ne sont garanties. `/validate` doit figer la révision approuvée — [retour archivé](../evidence/ARC-01/review-2026-11-02.md) | Agent design distinct, revue en lecture seule ; aucun test d'hôte |

## Démonstration du résultat

- Le processus `node --import tsx services/api/src/main.ts --stdio` a été lancé comme sous-processus MCP du client du SDK.
- `tools/list` a retourné quatre outils de base ; `open_designer` a répondu avec le projet M0 version 0 ; la ressource `ui://design/editor.html` a été lue en `text/html;profile=mcp-app` (2 198 119 octets).
- Le processus local fonctionne sur le transport stdio. ChatGPT n'a pas été connecté et aucune identité réelle n'a été présentée.
- `tunnel-client` et la variable d'environnement `CONTROL_PLANE_API_KEY` sont absents. Le plan, le workspace, les permissions et le `tunnel_id` n'ont pas été vérifiés.
- Le chemin officiel de tunnel sait lancer stdio ; cela évite une conversion HTTP, mais ne rend pas le processus accessible à ChatGPT sans les paramètres et droits de tunnel.
- L'utilisateur maintient l'application ChatGPT desktop. Les sources OpenAI documentent les site tools WebMCP du navigateur intégré ; le dépôt ne possède pas encore cet adaptateur. Une autre voie desktop stdio est soumise à l'allowlist de partenaires.

## Tests et critères d'acceptation

| Critère / scénario | Vérification exécutée et version | Résultat observé | Preuve | Reste à faire |
|---|---|---|---|---|
| Processus MCP local stdio, liste des outils, ouverture et lecture de la ressource | Client SDK réel, commit de base `3694f2e` | réussi | [Tentative hôte](../evidence/ARC-01/host-attempt-2026-11-02.md) | Refaire la découverte et l'ouverture depuis le vrai hôte ChatGPT |
| Intégrité documentaire | `git diff --check` | réussi | Diff de cette tâche | Aucun |
| Éligibilité du backlog | `npm run team:next` | 0 ticket éligible, révision 3 | Sortie CLI du 2 novembre | ARC-01 reste bloqué jusqu'aux preuves manquantes |
| Contrats Python | `python scripts/check_contracts.py` | bloqué au démarrage : `jsonschema` absent de l'environnement Python actif ; ce n'est pas une réussite ni un échec du code | Sortie locale du 2 novembre | Installer les dépendances du dépôt dans le venv avant le prochain contrôle Python |
| Revue indépendante du compte rendu | `loop-verify-review`, deux tentatives maximum | seconde passe PASS, 5/5 après archivage des retours ; même lignée Codex/OpenAI, pas une revue inter-fournisseurs | [Retours agent archivés](../evidence/ARC-01/review-2026-11-02.md) et sortie de la seconde passe dans le chat | Aucun autre essai loop-verify ; la preuve hôte reste non exécutée |
| Relecture de l'addendum desktop/WebMCP | `loop-verify-review`, une passe sur le nouvel addendum | PASS, 5/5 ; relecture de l'analyse, pas de l'hôte | Sortie de revue dans le chat | Site Tools réel toujours à vérifier manuellement |
| Ouverture, rafraîchissement et modification dans le vrai ChatGPT | Non exécuté | non exécuté | [Tentative hôte](../evidence/ARC-01/host-attempt-2026-11-02.md) | Obtenir accès au connecteur/tunnel et exécuter M0-D01 à D03 |
| Bridge dans ChatGPT, identité autorisée et identité invalide | Non exécuté | non exécuté | Même preuve | Exécuter M0-D04 et M0-D05 avec identité réelle de test, sans déposer de jeton |
| Clavier, vues étroites, poll et capacités de l'hôte | Non exécuté dans ChatGPT | non exécuté | Même preuve | Compléter M0-D06 à D20 et la matrice des capacités |
| Sauvegarde depuis le vrai hôte | Non exécuté | non exécuté | Même preuve | Sauvegarder et vérifier la révision côté hôte |

## Avis des spécialistes

| Rôle ayant contribué | Constat vérifiable | Conséquence / recommandation |
|---|---|---|
| Reviewer MCP distinct | La réponse stdio, le rendu de ressource lu par SDK et l'identité ChatGPT sont des niveaux de preuve différents ; les deux premiers ne satisfont pas ARC-01 | Garder `blocked`, ne pas avancer ARC-02 |
| Backend / plateforme | Secure MCP Tunnel accepte le lancement stdio existant ; la clé runtime du tunnel ne prouve pas l'identité OAuth utilisateur — [avis archivé](../evidence/ARC-01/review-2026-11-02.md) | Aucun changement de transport n'est nécessaire ; obtenir les droits et la configuration runtime avant l'essai ChatGPT |
| Design / UX | WebMCP convient à une édition live dans la page, mais l'ouverture `/manifest` et le retour `/validate` ne sont pas des commandes natives prouvées — [avis archivé](../evidence/ARC-01/review-2026-11-02.md) | Garder l'éditeur et l'aperçu dans un même document ; vérifier manuellement le host, puis qualifier le scénario conversationnel |

## Dettes, risques et limites

| Nature | Référence | Impact constaté | Propriétaire | Condition de sortie |
|---|---|---|---|---|
| Critères non prouvés / blocage du ticket, pas une dette technique | ARC-01 ; preuve d'accès du 2 novembre | Aucun accès au tunnel ou au vrai connecteur n'est disponible dans cet essai ; identité et capacités host restent inconnues | Propriétaire du compte/workspace pour fournir l'accès ; frontend ARC-01 pour exécuter la recette ensuite | Disposer d'un chemin Secure MCP Tunnel et des droits ChatGPT nécessaires, puis compléter les scénarios hôte/identité avec preuves expurgées |

Aucune nouvelle dette de code n'est retenue. Les dettes DEBT-001 à DEBT-003 demeurent inchangées.

## Décisions et actions

| Décision ou action | Motif | Responsable unique | Ticket / preuve attendue | Échéance par jalon |
|---|---|---|---|---|
| Conserver ARC-01 en `blocked` et ne pas ouvrir ARC-02 | Les exigences d'hôte et d'identité sont non exécutées | Orchestrateur | Révision du registre inchangée ; preuve du vrai hôte exigée | Avant ARC-02 |
| Vérifier en manuel dans ChatGPT desktop si les Site Tools sont disponibles, en ouvrant l'exemple Webroom et en inspectant l'icône d'outils | La cible confirmée est desktop ; la disponibilité varie selon le compte, le modèle et le site ; l'agent ne peut pas automatiser cette UI | Commanditaire | Présence d'outils WebMCP et test de lecture `Get edit state`, sans modification | Avant choix d'architecture |
| Si WebMCP est disponible, proposer un spike d'adaptateur de page et la mise à jour des critères ARC-01 avant implémentation | L'éditeur actuel n'enregistre pas `navigator.modelContext` et les critères décrivent le bridge MCP Apps ; la page doit d'abord être ouverte | Orchestrateur + designer | Proposition d'architecture distincte, puis tests dans le vrai host | Avant reprise ARC-01 |
| Si WebMCP est indisponible, vérifier si l'organisation peut obtenir l'allowlist de plugins locaux | Le plugin desktop stdio est réservé aux partenaires approuvés et exige une vérification d'identité | Propriétaire de l'organisation / commanditaire | Éligibilité confirmée par OpenAI | Avant nouvelle tentative locale |

## Verdict et prochaine étape

- **Verdict : bloqué.** La couche MCP locale a répondu ; aucun échange dans ChatGPT ni aucune preuve d'identité réelle n'a été effectué.
- Critère satisfait dans ce tour : processus stdio local et ressource UI empaquetée répondent au SDK.
- Critères ARC-01 manquants : hôte ChatGPT, identité autorisée/invalide, comportement interactif du bridge, capacités réelles et sauvegarde.
- État du ticket avant / après : `blocked` / `blocked`, révision du registre 3 / 3.
- Prochain ticket éligible : aucun (`npm run team:next` donne 0).
- Décision du commanditaire reçue après la première synthèse : conserver l'application desktop. Cela fixe la cible mais ne choisit pas entre WebMCP et plugin local ; l'offre et l'accès de l'organisation restent inconnus. Le test de visibilité WebMCP nécessite une action manuelle de l'utilisateur, car le skill `computer-use` interdit l'automatisation de l'UI ChatGPT.

## Synthèse partagée dans le chat

Le processus MCP local passe son handshake, mais ARC-01 reste bloqué parce que l'hôte et l'identité ne sont pas testés. La tâche suivante est de préparer le tunnel et l'accès au workspace, puis d'exécuter la grille dans ChatGPT ; aucun ticket M1 n'est éligible.
