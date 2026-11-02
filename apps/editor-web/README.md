# Manifest — éditeur de qualification

Même entrée React et même configuration Puck pour le diagnostic navigateur et la vue MCP. Un Snapshot partagé décrit une page et un Hero ; aucun arbre de données parallèle n'est persisté.

## Première tranche Manifest

La coque suit la direction validée : atelier sombre, description à gauche, page blanche au centre, suggestions et réglages à droite. Sur téléphone, ces zones se sélectionnent par boutons. Le thème de la page reste indépendant de la coque. La palette de l'atelier vient toujours de DESIGN.md et les champs Puck restent accessibles dans « Réglages ».

La description est temporaire et n'est pas enregistrée dans le Snapshot. Après **1,5 seconde** de pause, hors composition IME, un jeu de règles local peut proposer une palette, une animation disponible ou des lignes explicites « Titre : » / « Texte : ». L'interface nomme cette source locale et n'appelle aucun modèle. Une indication non reconnue ne crée pas une réponse fictive. Les pistes ne changent le document qu'après « Appliquer » ; l'opération vérifie sa base et les locks du domaine, puis reste annulable et non sauvegardée jusqu'au commit habituel.

« Rapport & version » ouvre un état réel du brouillon : version chargée, empreinte du document enregistré, réglages ouverts et intention temporaire. La copie et le téléchargement JSON fonctionnent ; ils ne prétendent ni approuver une révision ni exporter du code. Les vues de rapport distinguent ce qui est enregistré de ce qui reste à enregistrer.

Le bloc « Fournisseur et modèle » prépare uniquement un choix pour la session. Son contrat déclaratif est `provider-preparation.ts` : liste de noms de fournisseurs sans adaptateur actif, identifiant de modèle saisi librement et non vérifié, connexion/inférence désactivées. Changer de fournisseur efface l’identifiant précédent, sans modèle de remplacement implicite. Ce choix ne change ni le Snapshot, ni l’analyse locale, ni la sauvegarde et ne déclenche aucun réseau. Il figure séparément dans le rapport JSON sous `providerPreparation` avec `persisted: false`. Il n’existe ni clé fournisseur, ni connexion, ni catalogue de modèles dans la vue.

Le select natif est une décision explicite de cette étape et son propriétaire unique est `ProviderPreparationPanel`, enregistré dans la carte canonique UX. Le registre local constitue un fallback de préparation de l’interface conforme au type partagé `ModelProviderRegistry` de `@design-workbench/m0-contract`, validé à son chargement. Ses entrées sont toutes déconnectées, sans modèle ni secret configuré, avec BYOK désactivé. Un registre backend autorisé le remplacera avant toute connexion. Ce fallback n’est pas un adaptateur réseau alternatif ; l’identifiant libre reste une intention non vérifiée, et ne devient pas un `ModelDescriptor` qualifié.

Le navigateur autonome conserve un brouillon local sept jours uniquement si localStorage et Web Locks sont disponibles. Sans verrou inter-onglets, l'atelier reste en mémoire pour la session et le libellé le dit. Les lectures, sauvegardes et reprises sont sérialisées. Après expiration, l'atelier garde le document intact et demande « Reprendre le brouillon expiré » : cette action renouvelle la durée sans changer contenu ni version. Il ne charge pas silencieusement la fixture initiale à la place. Les reçus de replay sont limités à 1 000 par instance d'adaptateur et ne survivent pas à une réouverture ; le CAS empêche alors le replay d'une ancienne version. Leur comparaison ignore l'ordre des clés JSON. Un reçu en mémoire ne vaut pas preuve de persistance actuelle : avant de le renvoyer, l'adaptateur vérifie que le record existe, n'est ni corrompu ni expiré et n'a pas régressé de version/hash. Ce diagnostic n'est pas la persistance serveur M1.

Le simulateur déterministe `createDeterministicModelAdapter` exerce la frontière fournisseur sans réseau. Il reconnaît seulement quelques intentions structurées, retourne les opérations M0 avec la base de document, respecte `AbortSignal` et laisse l'appelant vérifier qu'une réponse n'est pas devenue obsolète. Il sert aux tests de contrat ; il n'est pas présenté comme un modèle ni comme une connexion fournisseur.

Dans une iframe d'hôte, ou avec `?host=mcp` pour un harness de test, le SDK MCP Apps établit la connexion puis appelle read_project et commit_commands. Les handlers sont installés avant connect. Une erreur de connexion n'active jamais silencieusement le diagnostic local. La vue ne reçoit aucune clé fournisseur ni jeton de transport.

## Comportements

- Modifications de contenu et thème immédiatement visibles.
- Sauvegarde explicite avec état local/serveur distinct et une seule commande en vol.
- Saisie possible pendant l'enregistrement ; l'accusé ne remplace pas les réglages plus récents.
- Enregistrement incertain : la vérification d'une ancienne base conserve commande et clé ; une action explicite rejoue la capture en attente, sans envoyer les nouveaux réglages avec une nouvelle clé.
- Annuler/rétablir groupé pour les modifications rapprochées, historique local borné à 50 groupes.
- Conflit persistant, téléchargement JSON de récupération et rechargement explicite après dialogue.
- Mode mobile : aperçu et inspecteur alternent ; le thème du site ne modifie pas l'éditeur.

Les champs texte et radio viennent de Puck. Les trois sélecteurs de couleur et la liste de préparation des fournisseurs sont natifs : leur popup est volontairement contrôlé par le navigateur/OS. Il n'y a ni liste de modèles active, ni suggestion IA simulée, ni export de code dans cette étape. Les pistes locales sont identifiées comme telles.

## Sources visuelles et techniques

DESIGN.md à la racine génère les variables CSS de l'éditeur au build via design-tokens.ts et le module virtuel `virtual:editor-tokens.css`, dont la sélection du bloc sur page claire. Le parseur accepte les scalaires entre guillemets du contrat actuel et refuse une syntaxe inconnue. Les composants consomment ces variables ; les couleurs du site viennent du Snapshot. Les polices locales sont intégrées au HTML final. L'entrée CSS `@puckeditor/core/no-external.css` évite l'import distant de police présent dans la feuille Puck standard.

La frontière Puck emploie les types Config/Data de la bibliothèque. Le reste du projet conserve les types Snapshot, HeroProps et commandes partagés. L'extraction des props contrôle leurs formes avant de modifier le Snapshot ; le domaine effectue la validation complète avant sauvegarde. Chaque document lu dans le stockage ou reçu par MCP est aussi contrôlé par recalcul SHA-256 avant acceptation. Aucun assouplissement global de TypeScript strict n'est utilisé.

Le bundle singlefile de qualification contient l'éditeur complet. Son poids doit être mesuré et optimisé avant M1 ; les warnings de directives « use client » concernent ce build navigateur et ne sont pas masqués. La connexion dans le vrai ChatGPT et le comportement du bridge restent des preuves à obtenir séparément.
