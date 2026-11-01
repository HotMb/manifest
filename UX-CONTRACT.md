# Contrat UX et comportements

Références : [produit](docs/spec/PRODUCT.md), [contrats de données](docs/spec/CONTRACTS.md), [identité](DESIGN.md). Les libellés ci-dessous sont les noms canoniques du produit, à utiliser sur toutes les surfaces.

## Espace de travail

Barre haute : projet/page, fournisseur et modèle, format d'aperçu, Annuler/Rétablir, Historique, Approuver et exporter. Gauche : Intention / Suggestions / Catalogue. Centre : aperçu de la page. Droite : réglages du bloc. Sur écran étroit, les panneaux deviennent des tiroirs non concurrents ; le champ actif et les actions restent accessibles au clavier virtuel.

Le thème de l'éditeur ne se confond pas avec celui du site créé. Les dimensions desktop/tablette/mobile de l'aperçu changent le viewport simulé, pas les données. Les règles responsive appartiennent au document.

## Propriété canonique des comportements

| Capacité | Propriétaire futur | Source | Variantes admises |
|---|---|---|---|
| Écriture du document | domain/DocumentController | CONTRACTS.md | manuel, IA conservée, restauration |
| Sélection et survol | editor/SelectionController | UX-CONTRACT.md | souris, clavier, toucher |
| Select/Combobox | editor/primitives/Select | DESIGN.md + présent contrat | liste courte, recherche catalogue |
| Champ d'intention | editor/IntentComposer | présent contrat | automatique, manuel, suspendu |
| Notifications | editor/FeedbackProvider | présent contrat | statut discret, erreur persistante |
| Dialogues | editor/primitives/Dialog | présent contrat | confirmation d'abandon, restauration |
| Défilement | editor/theme + layout | DESIGN.md | panneaux et viewport central |
| Autosave/conflit | editor/DraftSync | CONTRACTS.md | local, synchronisation, confirmé, conflit |

Ne pas créer de versions locales concurrentes de ces comportements dans chaque panneau. Le choix Puck ne dispense pas de vérifier ses contrôles et raccourcis dans ces parcours.

## Intention et suggestions

La première activation de l'analyse automatique montre fournisseur, transmission après pause et limite d'usage. La session conserve ce choix ; un interrupteur « Suspendre l'analyse » stoppe les nouvelles demandes. « Proposer maintenant » existe aussi et ne vide pas le champ. Enter insère une nouvelle ligne ; un raccourci explicite, documenté et compatible IME déclenche l'action manuelle. Une génération ne désactive jamais la saisie.

Après 900 ms sans frappe, hors composition IME : sauvegarder les réglages manuels, puis démarrer un job. Aucun appel si texte vide, intention et contenu inchangés, analyse suspendue, budget épuisé, hors ligne ou conflit de brouillon. Un seul job actif par session d'éditeur ; une nouvelle intention le rend immédiatement obsolète dans la vue.

| État | Affichage et comportement |
|---|---|
| Repos | champ disponible, aperçu courant, aucune animation d'attente |
| Frappe | texte local ; pas de déplacement du curseur ni d'appel immédiat |
| Attente de pause | statut discret ; nouvelle frappe relance le délai |
| Synchronisation nécessaire | conserver le dernier aperçu ; ne pas générer sur une base inconnue |
| Recherche de propositions | progression par étapes connues, arrêt disponible ; pas de pourcentage inventé |
| Proposition prête | aperçu automatique du candidat ; Conserver / Refuser ; base et état en interne |
| Alternatives | jusqu'à trois choix complets du même fournisseur ; sélection prévisualise sans approuver |
| Obsolète | résultat non appliqué ; dernier aperçu conservé identifié, nouvelle proposition possible |
| Échec/refus/quota | explication locale et action adaptée ; contenu et réglages conservés |

Une demande précise peut produire un candidat directement prévisualisé. Une demande exploratoire propose des alternatives. La classification est une aide du modèle ; les choix d'affichage et les droits restent côté produit. Les alternatives ne remplacent jamais silencieusement le brouillon.

## Projection, conservation et causalité

L'aperçu est une projection de `brouillon confirmé + modifications manuelles en attente + proposition éligible`. Les deux dernières couches sont temporaires, identifiées et réversibles. Aucun arbre indépendant n'est persisté comme une deuxième autorité.

Pour peindre une proposition : generationId actif, même session/intentEpoch et même baseDraftVersion, aucune modification manuelle non synchronisée. Une nouvelle frappe invalide son éligibilité immédiatement ; la dernière image peut rester visible avec « Proposition précédente » pendant l'attente, sans l'exporter implicitement.

« Conserver » applique les opérations par une commande atomique. Une édition manuelle sur une proposition toujours éligible envoie `keep_proposal` avec `operationsAfter` dans la même transaction. Sur une proposition obsolète, demander soit une nouvelle proposition, soit « Reprendre cette proposition » explicitement : cette récupération annule l'intention courante, recharge la base et refait la validation ; elle n'écrase pas les nouvelles données.

Annuler/Rétablir porte sur des groupes de modifications du document, pas sur les frappes du prompt ni sur des tokens du modèle. Un groupe IA conservé s'annule en une opération métier. Une réponse de sauvegarde ou de poll ne vole ni focus ni scroll et ne remplace pas un état local plus récent.

## Sauvegarde et récupération

Autosave manuel : une seconde d'inactivité, un lot en vol au maximum, lots suivants en attente dans l'ordre. Une réponse de conflit bloque la file ; pas de rebase aveugle. La révision du serveur et les modifications locales sont comparables avant choix Recharger / Copier mes changements / Reprendre sur une copie.

« Sauvegardé » signifie accusé serveur ; distinguer « Brouillon local » et « Enregistrement ». Une proposition seulement prévisualisée porte cet état et n'est pas annoncée comme sauvegardée. En cas de fermeture, proposer de conserver une proposition non enregistrée ; ne pas multiplier les confirmations pour les réglages réversibles déjà sauvegardés.

La récupération locale est scindée par utilisateur et projet, expire après sept jours et ne contient ni clé ni token d'authentification. Au retour, elle est proposée à la restauration, sans remplacer le serveur. Si le stockage local est indisponible dans l'hôte, informer de cette limite ; la sauvegarde serveur reste le chemin normal.

## Versions et export

« Approuver et exporter » confirme l'état effectivement visible et éligible, reçoit une revisionId, puis démarre l'export. Si la sauvegarde/approbation échoue, aucun export n'est lancé. L'utilisateur peut continuer d'éditer pendant l'export : l'artefact reste lié à la révision initiale.

L'historique nomme les révisions, la date locale et l'auteur. Restaurer préserve l'historique, annonce la révision créée et ne relance pas automatiquement un export. Une comparaison est un affichage de deux snapshots, pas une fusion automatique.

L'export affiche des étapes réelles : préparation, compilation, contrôle de rendu, archive prête. En cas d'échec, conserver la révision et fournir Réessayer si sûr. Télécharger livre l'archive et le manifeste, pas un mur de code dans le chat.

## Accessibilité, responsive et contenu

Cible : WCAG 2.2 AA à vérifier, sans prétendre à une certification. Boutons/liens natifs, noms accessibles, focus visible et non masqué, alternatives au drag, actions disponibles sans survol, contrastes et mouvement réduit. Annoncer les changements de statut avec une fréquence raisonnable, pas chaque fragment réseau.

Sélection de bloc au clavier, déplacement via actions Monter/Descendre/Déplacer vers, accès aux propriétés et restauration du focus après fermeture des panneaux. La sélection est une surcouche de l'éditeur, absente de l'export. Les popovers ne changent pas la mise en page ; les erreurs restent près du contrôle concerné.

Les panneaux ont un propriétaire de scroll explicite et des barres utilisables. Pas de scroll forcé vers une suggestion si l'utilisateur explore ailleurs. Images et polices réservent leur géométrie. Des états vide, recherche sans résultat, chargement, erreur et contenu long sont prévus.

## Scénarios d'arbitrage obligatoires

Tester la même page avec dix intentions : modification ciblée, hésitation, demande globale, demande impossible, verrouillage, deux corrections rapides, édition manuelle pendant génération, changement de modèle, quota atteint et fermeture/reconnexion. Comparer contrôle perçu, délai utile et annulations avant de figer les réglages de la boucle.
