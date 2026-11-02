# Manifest — éditeur de qualification

Même entrée React et même configuration Puck pour le diagnostic navigateur et la vue MCP. Un Snapshot partagé décrit une page et un Hero ; aucun arbre de données parallèle n'est persisté.

## Flux de suggestion

La description reste temporaire et n'est pas enregistrée dans le Snapshot. Les règles locales reconnaissent quelques choix de couleur, l'animation disponible et les lignes explicites « Titre : » / « Texte : ». Elles restent actives sans modèle configuré.

Dans une vue MCP, `get_provider_registry` fournit uniquement les fournisseurs et modèles publics configurés par le serveur. L'interface dit « configuré » sans prétendre vérifier la disponibilité réelle. L'utilisateur choisit explicitement un modèle ; l'envoi automatique est désactivé par défaut. S'il l'active, après **1,5 seconde** sans frappe et hors composition IME, l'éditeur envoie l'intention et le brouillon enregistré à `start_suggestion`, suit le job et lit une proposition structurée. « Proposer maintenant » lance une seule demande ; pendant un job, cette action permet de l'annuler. Les requêtes peuvent être facturées selon l'offre du fournisseur. M0 ne met pas en œuvre de plafond de dépenses : configurer un budget côté fournisseur ou hôte avant tout essai réel. La vue ne reçoit ni clé, ni endpoint privé, ni valeur dérivée d'un secret. Le navigateur autonome n'appelle aucun fournisseur.

Le candidat est appliqué à une projection temporaire et prévisualisé en lecture seule. « Conserver » appelle `keep_proposal` : le serveur vérifie la version, applique les opérations M0 dans une commande idempotente et retourne la nouvelle version. « Ignorer » rejette le candidat sans modifier le Snapshot. Si l’intention ou le brouillon change, `mark_proposal_stale` le rend non applicable sans rejeter le choix à la place de l’utilisateur ; son aperçu reste en lecture seule jusqu’à la prochaine réponse. Les jobs sont isolés entre sessions. Le M0 actuel produit un candidat direct sur un Hero ; les alternatives, les catalogues étendus et les adaptateurs Anthropic/Google natifs restent à construire.

Les modifications manuelles sont enregistrées après 900 ms d'inactivité ; le bouton « Enregistrer le brouillon » reste disponible. Les conflits bloquent la génération et la sauvegarde automatique, sans remplacer les réglages ouverts. « Rapport & version » sépare le brouillon enregistré, les réglages de travail et le candidat prévisualisé. Son JSON transmet les opérations et les identifiants non sensibles du modèle, jamais de credential. Il ne prétend ni approuver une révision ni exporter du code.

## Hôte et persistance

Dans une iframe d'hôte, ou avec `?host=mcp` pour un harness, le SDK MCP Apps établit la connexion puis appelle les outils `read_project`, `commit_commands` et, si le runtime est configuré, les outils de suggestion réservés à la vue. Les handlers sont installés avant `connect`. Une erreur de connexion n'active jamais silencieusement le diagnostic navigateur.

Le diagnostic navigateur conserve un brouillon local sept jours uniquement si localStorage et Web Locks sont disponibles. Sans verrou inter-onglets, l'atelier reste en mémoire pour la session. Après expiration, le document reste intact et doit être repris explicitement. Les reçus de replay sont limités à 1 000 par instance et ne survivent pas à une réouverture ; le CAS empêche le replay d'une ancienne version.

Le runtime distant compatible est facultatif et se configure hors Git avec `MANIFEST_PROVIDER`, `MANIFEST_MODEL`, `MANIFEST_API_BASE_URL` et `MANIFEST_API_KEY`. Les quatre variables sont nécessaires. Les valeurs acceptées pour le protocole disponible sont `openai`, `deepseek` et `custom`. Le détail d'exploitation est dans [services/api/README.md](../../services/api/README.md). Aucun appel réel n'est requis par les tests par défaut.

## Conception et implémentation

La coque suit la direction validée : atelier sombre, description à gauche, page claire au centre, suggestions et réglages à droite. Sur téléphone, ces zones se sélectionnent par boutons. Le thème de la page reste indépendant de la coque. `DESIGN.md` génère les variables CSS de l'éditeur ; les couleurs du site viennent du Snapshot. Les listes fournisseur/modèle sont des `<select>` natifs, choix enregistré dans la carte canonique UX.

La frontière Puck emploie les types Config/Data de la bibliothèque. Le reste du projet conserve les types Snapshot, HeroProps et commandes partagés. Les opérations de modèle sont validées contre le contrat M0 avant conservation ; aucun HTML, callback, asset externe ou code de modèle n'est exécuté. Chaque projet lu depuis le stockage ou reçu par MCP est contrôlé par recalcul SHA-256.

Le bundle singlefile de qualification contient l'éditeur complet. Son poids doit être mesuré et optimisé avant M1. La connexion dans le vrai ChatGPT, le comportement du bridge, les appels à un fournisseur configuré et la persistance de production restent à qualifier séparément.
