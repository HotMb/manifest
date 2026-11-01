# Sécurité et exploitation

## Frontières

L'hôte, la vue, le serveur, le fournisseur IA, le worker et le stockage sont des frontières distinctes. L'iframe protège l'hôte selon son implémentation ; elle ne rend pas sûr un code arbitraire exécuté à côté du bridge de l'éditeur. Le catalogue M1 reste une allowlist de sources approuvées et de propriétés contrôlées.

## Identité et autorisation

- Serveur MCP distant protégé, même pour un seul utilisateur. Ne pas exposer un tunnel public sans authentification au prétexte d'un usage personnel.
- OAuth selon le contrat de l'hôte et la spécification courante ; valider émetteur, audience, expiration, scopes et révocation. Le token d'accès à notre API n'est jamais un token OpenAI/Anthropic/Google.
- Vérifier l'appartenance du projet sur chaque draft, révision, job, événement, asset et artefact ; tester les références croisées entre deux comptes.
- Les identifiants et paramètres du client ne confèrent pas de droits. Un rôle/interface cachée ou une annotation MCP n'est pas une autorisation.
- M1 : propriétaire seulement. Préparer des interfaces d'autorisation, sans rôles d'équipe ou partage public implicite.

## Secrets et fournisseurs

Développement : configuration serveur hors versionnement. Production : coffre de secrets ou chiffrement avec clé séparée et rotation. Chaque connexion fournisseur appartient à un utilisateur ; son identifiant peut être référencé, jamais sa valeur retournée. Ne pas demander une clé dans le chat ou dans le plugin. Toute configuration BYOK ultérieure se fait sur une surface externe autorisée et doit être revue selon les règles de l'hôte.

Ne pas journaliser clés, tokens, cookies, liens signés, prompts complets ou documents par défaut. Logs : requestId, opération, job, modèle, volumes et catégories d'erreur, avec rétention limitée. Les exemples de ce dossier sont fictifs.

## Données et contenu non fiable

Le texte utilisateur, les métadonnées de ressources et les résultats de modèle sont des données. Ils ne peuvent pas changer les permissions, provoquer une lecture de secrets ou contourner un verrouillage. L'IA ne reçoit que les cibles et opérations autorisées et les informations nécessaires au contexte.

Échapper les textes et attributs dans le rendu ; refuser protocoles et URLs dangereux, propriétés d'événements arbitraires, HTML/script brut et pollution de prototypes. Valider structure puis sémantique du catalogue, contraintes d'arbre, assets et limites. Ne jamais utiliser eval ou une compilation de code renvoyé par l'IA dans la vue M1.

Uploads M1 : images raster reconnues (PNG/JPEG/WebP/AVIF), limite initiale 20 Mio, contrôle réel du type, décodage et dimensions/pixels, normalisation et suppression des métadonnées inutiles. SVG, HTML et archives arbitraires hors M1. Les polices proviennent de releases approuvées. Ne pas importer une URL externe arbitraire avec les droits réseau du serveur. Les fichiers choisis via l'hôte requièrent une capacité explicitement vérifiée en M0 ; sinon utiliser la bibliothèque autorisée via le navigateur.

## Limites initiales à éprouver

| Ressource | Limite proposée M1 |
|---|---|
| Snapshot | 2 Mio JSON, 10 pages, 500 blocs total, profondeur 8 |
| Lot d'opérations | 100 opérations, transaction intégrale |
| Suggestions | une active par session ; deux maximum par compte |
| Appels automatiques | au plus 10 démarrages/minute/compte, limite configurable |
| Inférence | timeout 60 s hors file ; budget tokens et coût configurés avant activation |
| Réparation de schéma | une tentative au plus dans le budget de la requête |
| Reprises transitoires connues | deux reprises maximum, backoff avec jitter/Retry-After et budget restant |
| Export | un actif par projet ; CPU/mémoire/durée bornés par profil du worker |

Ces limites sont des décisions initiales, pas des capacités mesurées. Les plafonds du fournisseur restent applicables. Réserver le budget avant l'appel, rapprocher l'usage final ensuite ; usage inconnu = montant réservé conservé jusqu'à réconciliation, jamais zéro implicite. Aucun fallback vers un autre fournisseur sans choix explicite.

## Tâches, reprise et annulation

Enregistrer job et clé d'idempotence avant dispatch. Le lease est détenu par un worker, renouvelé par heartbeat. Un job queued peut être repris sans appel déjà effectué. Après un appel externe commencé et un résultat perdu, passer outcome_unknown ; ne pas déclencher automatiquement un nouvel appel facturable. L'utilisateur peut choisir une nouvelle tentative informée, avec nouveau jobId.

L'annulation invalide l'éligibilité du résultat et transmet l'abort si supporté. Un fournisseur peut continuer et facturer ; l'interface et la comptabilité doivent refléter cette incertitude. Si un résultat terminal arrive après une annulation, le conserver au besoin pour l'usage facturé mais ne pas réactiver la proposition.

## Export et exécution isolée

Entrées : snapshot approuvé, release catalogue, sources et assets contrôlés. Répertoire éphémère, utilisateur sans privilège, CPU/mémoire/disque/temps limités. Aucun secret fournisseur, token de production ou accès base dans l'environnement de build/rendu. Réseau désactivé pour le build lorsque les dépendances proviennent du cache approuvé ; éventuelle acquisition préalable séparée, allowlist et empreintes contrôlées.

Ne pas lancer des scripts d'installation non revus. Verrouiller les dépendances et leurs intégrités. Valider tous les chemins de fichiers et ZIP : pas de chemin absolu, de `..`, de sortie du workspace, de lien symbolique inattendu. Les routes web ne sont jamais transformées directement en chemins de fichiers sans normalisation.

La comparaison navigateur tourne sur l'artefact isolé, avec ressources figées et sans secrets. Un export réussi en compilation mais échouant au contrôle fonctionnel/visuel n'est pas annoncé comme validé.

## Sauvegardes et rétention

- Brouillons serveur et révisions : conservés jusqu'à suppression du projet ; politique de purge explicite à définir avant ouverture multi-utilisateur.
- Reçus d'idempotence : au moins 24 h ; événements de jobs : 7 jours ; logs techniques minimisés : 14 jours proposés.
- Brouillon local : 7 jours, scindé compte/projet, jamais de secret ; indisponibilité de stockage gérée.
- Artefacts : objets immuables ; liens de téléchargement courts et renouvelables après autorisation. Ne pas supprimer un asset encore référencé par une révision.
- Avant production, l'équipe fixe RPO/RTO avec le propriétaire produit et exécute une restauration réelle de DB + assets + manifests. La présence d'une sauvegarde ne prouve pas la restauration.

## Observabilité et déploiement

Mesurer latence jusqu'à proposition valide, fréquence des réponses obsolètes, erreurs par catégorie, sauvegardes en conflit, coût réservé/mesuré/inconnu, échecs de build et qualité des exports. Ne pas transformer ces mesures en collecte du contenu des projets.

CI : schémas/contrats, tests domaine, tests adaptateurs, build éditeur, recette navigateur et sécurité ciblée. Versions verrouillées, migrations documentées et rollback de release testé. Une ancienne révision garde sa release ; si une vulnérabilité impose sa désactivation, signaler le blocage et proposer une migration, sans modifier silencieusement le snapshot.

En cas d'incident : suspendre nouveaux jobs concernés, préserver brouillons, retirer les liens compromis, révoquer les secrets concernés puis vérifier la récupération. Les logs publics ne contiennent pas les documents ou secrets.

## Commercialisation

Hors chemin critique M1. Avant diffusion publique, revoir licences, confidentialité, droits utilisateurs et règles actuelles des hôtes. Selon les règles OpenAI consultées le 1er novembre 2026, une redirection transactionnelle depuis le plugin ne suffit pas à autoriser la vente de nouveaux abonnements/crédits numériques. Accès à des droits préexistants et pages informatives sont encadrés. Ne pas inclure un upsell ou un checkout numérique dans M1.

Source : [règles officielles des plugins](https://developers.openai.com/plugins/plugin-guidelines). Cette règle doit être revérifiée au moment de commercialiser ; aucune validation de conformité commerciale n'est revendiquée ici.
