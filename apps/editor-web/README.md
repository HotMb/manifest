# Éditeur de qualification M0

Même entrée React et même configuration Puck pour le diagnostic navigateur et la vue MCP. Un Snapshot partagé décrit une page et un Hero ; aucun arbre de données parallèle n'est persisté.

Le navigateur autonome conserve un brouillon local sept jours uniquement si localStorage et Web Locks sont disponibles. Sans verrou inter-onglets, l'atelier reste en mémoire pour la session et le libellé le dit. Les lectures, sauvegardes et reprises sont sérialisées. Après expiration, l'atelier garde le document intact et demande « Reprendre le brouillon expiré » : cette action renouvelle la durée sans changer contenu ni version. Il ne charge pas silencieusement la fixture initiale à la place. Les reçus de replay sont limités à 1 000 par instance d'adaptateur et ne survivent pas à une réouverture ; le CAS empêche alors le replay d'une ancienne version. Leur comparaison ignore l'ordre des clés JSON. Un reçu en mémoire ne vaut pas preuve de persistance actuelle : avant de le renvoyer, l'adaptateur vérifie que le record existe, n'est ni corrompu ni expiré et n'a pas régressé de version/hash. Ce diagnostic n'est pas la persistance serveur M1.

Dans une iframe d'hôte, ou avec `?host=mcp` pour un harness de test, le SDK MCP Apps établit la connexion puis appelle read_project et commit_commands. Les handlers sont installés avant connect. Une erreur de connexion n'active jamais silencieusement le diagnostic local. La vue ne reçoit aucune clé fournisseur ni jeton de transport.

## Comportements

- Modifications de contenu et thème immédiatement visibles.
- Sauvegarde explicite avec état local/serveur distinct et une seule commande en vol.
- Saisie possible pendant l'enregistrement ; l'accusé ne remplace pas les réglages plus récents.
- Enregistrement incertain : la vérification d'une ancienne base conserve commande et clé ; une action explicite rejoue la capture en attente, sans envoyer les nouveaux réglages avec une nouvelle clé.
- Annuler/rétablir groupé pour les modifications rapprochées, historique local borné à 50 groupes.
- Conflit persistant, téléchargement JSON de récupération et rechargement explicite après dialogue.
- Mode mobile : aperçu et inspecteur alternent ; le thème du site ne modifie pas l'éditeur.

Les champs texte et radio viennent de Puck. Les trois sélecteurs de couleur sont natifs : leur popup est volontairement contrôlé par le navigateur/OS. Il n'y a ni liste de modèles active, ni suggestion IA simulée, ni export de code dans cette étape.

## Sources visuelles et techniques

DESIGN.md à la racine génère les variables CSS de l'éditeur au build via design-tokens.ts et le module virtuel `virtual:editor-tokens.css`. Le parseur accepte les scalaires entre guillemets du contrat actuel et refuse une syntaxe inconnue. Les composants consomment ces variables ; les couleurs du site viennent du Snapshot. Les polices locales sont intégrées au HTML final, sans domaine externe.

La frontière Puck emploie les types Config/Data de la bibliothèque. Le reste du projet conserve les types Snapshot, HeroProps et commandes partagés. L'extraction des props contrôle leurs formes avant de modifier le Snapshot ; le domaine effectue la validation complète avant sauvegarde. Chaque document lu dans le stockage ou reçu par MCP est aussi contrôlé par recalcul SHA-256 avant acceptation. Aucun assouplissement global de TypeScript strict n'est utilisé.

Le bundle singlefile de qualification contient l'éditeur complet. Son poids doit être mesuré et optimisé avant M1 ; les warnings de directives « use client » concernent ce build navigateur et ne sont pas masqués. La connexion dans le vrai ChatGPT et le comportement du bridge restent des preuves à obtenir séparément.
