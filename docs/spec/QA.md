# Plan de recette et preuves attendues

**Statut au cadrage : scénarios applicatifs non exécutés.** Aucun logiciel n'est présent dans ce dossier. Les vérifications documentaires et des exemples sont consignées séparément dans VERIFICATION.md ; elles ne prouvent pas ces comportements futurs.

## Jalons

| Jalon | Preuve minimale |
|---|---|
| M0 | éditeur minimal dans le vrai ChatGPT, appel autorisé, invalid token refusé, matrice des capacités et versions |
| M1 | parcours complet depuis intention jusqu'à archive reconstruite ; scénarios ci-dessous réussis ou écart explicitement accepté |
| M2 | même suite étendue aux fournisseurs/hôtes/branches ajoutés |
| M3 | tests propres à chaque scène, effet ou cible d'export |

## Scénarios M1

| ID | Déclencheur et contexte | Résultat observable |
|---|---|---|
| AT-01 | saisir vite puis s'arrêter ; répéter avec IME | une requête au seuil ; aucune pendant composition ; champ disponible |
| AT-02 | job lent A, nouvelle intention B | A n'altère ni proposition éligible ni brouillon B ; annulation tentée |
| AT-03 | changer modèle ou couper analyse pendant un job | ancien résultat inéligible ; aucun fallback fournisseur silencieux |
| AT-04 | recevoir proposition valide puis la refuser | aperçu précédent récupérable ; aucune révision approuvée créée |
| AT-05 | régler manuellement un bloc proposé puis conserver | promotion et réglage dans un seul lot ; annulation cohérente |
| AT-06 | modifier le brouillon dans un autre onglet avant Conserver | conflit, aucune écriture partielle, proposition non exportée |
| AT-07 | événements fragmentés/dupliqués/hors ordre, puis reconnexion | séquences dédupliquées, données partielles non appliquées ; reprise sans nouvel appel IA |
| AT-08 | arrêter worker avant dispatch puis après appel fournisseur | reprise sûre du premier ; outcome_unknown possible pour le second, pas de double appel automatique |
| AT-09 | même commande rejouée et deux commandes concurrentes | un reçu pour replay ; un seul gagnant pour une version donnée ; lot atomique |
| AT-10 | approuver puis éditer et restaurer une ancienne révision | ancienne version immuable ; nouvelle révision de restauration ; histoire conservée |
| AT-11 | erreur 401/timeout/offline pendant autosave | pas de faux Sauvegardé ; saisie conservée ; reprise contrôlée |
| AT-12 | revenir avec brouillon local ancien et serveur récent | proposition de récupération ; aucun écrasement silencieux |
| AT-13 | approuver/exporter puis modifier la page avant fin de build | artefact associé à la revisionId initiale ; pas de mélange |
| AT-14 | clavier seul, viewport étroit et zoom ; ouvrir les popups | contrôles/menus atteignables ; focus visible ; alternative au drag |
| AT-15 | contenu long, image absente, police tardive, mouvement réduit | page lisible, géométrie stable, fallback utile et pas de mouvement non essentiel |
| AT-16 | compte A utilise IDs de projet/job/asset/artefact B | accès refusé et aucune information privée exposée |
| AT-17 | chercher secrets dans frontend, logs, prompts et ZIP | aucune clé/token ; configuration sensible hors plugin/chat |
| AT-18 | quota, refus, erreur fournisseur, budget puis usage inconnu | catégories exactes, reprises bornées, travail conservé et coût inconnu non affiché à zéro |
| AT-19 | image valide puis faux MIME, dimensions excessives et asset étranger | validé/normalisé ou refus explicite, jamais import arbitraire avec droits serveur |
| AT-20 | reconstruire l'export depuis manifeste dans environnement propre | compilation et parcours annoncés fonctionnels ; dépendances de l'éditeur absentes |
| AT-21 | comparer aperçu/export aux mêmes dimensions et états | typographie, espacements, responsive et états comparés ; différences examinées |
| AT-22 | chemin ZIP hostile, dépendance/script non admis, accès réseau build | refus/isolement ; aucun accès aux secrets ou à production |
| AT-23 | restaurer sauvegarde DB + assets + manifests puis rouvrir un projet | document et ressources récupérés, révisions/exports cohérents ; RPO/RTO mesurés |
| AT-24 | verrouiller un bloc, demander une opération hors périmètre ou arbre invalide | rejet de la mutation sans changement du document |
| AT-25 | intention précise vs exploratoire sur même page | changement ciblé vs alternatives ; explication courte ; aucune promesse de goût automatique |

## Parcours de recette manuel M1

Procédure à exécuter après implémentation sur l'environnement d'intégration, avec les versions verrouillées et un compte de test. Ce parcours n'a pas été exécuté pendant le cadrage. L'équipe renseigne les commandes propres au dépôt pour démarrer et reconstruire l'export ; le dossier ne simule pas des commandes d'une application absente.

1. Ouvrir l'éditeur dans le vrai ChatGPT avec le compte autorisé. Créer le projet fictif portfolio et retrouver une page vierge persistée après réouverture. Joindre la version du plugin, de l'hôte observé et du catalogue.
2. Choisir le modèle OpenAI admis et un plafond d'essai. Activer les suggestions ; saisir « Portfolio de photographe, fond clair, galerie et navigation discrète ». Vérifier un seul démarrage après la pause, sans message envoyé au chat et sans clé dans les sorties.
3. Pendant la génération, remplacer l'intention par une direction sombre. Vérifier que la première réponse ne modifie pas l'état courant. Attendre une proposition complète, voir les blocs et leur explication, puis la refuser : le brouillon conservé doit rester identique.
4. Obtenir une nouvelle proposition et régler la couleur d'un bloc directement. Vérifier la conservation atomique du candidat et du réglage, annuler puis rétablir ce groupe. Recharger et comparer les IDs et le contenu sauvegardé.
5. Ouvrir le même projet dans deux vues. Modifier dans la première, puis tenter de conserver une proposition ancienne dans la seconde : afficher un conflit exploitable sans perte ni écriture partielle. Résoudre en relisant l'état serveur.
6. Ajouter une seconde page, un lien interne, une FAQ et une image contrôlée. Vérifier mobile, navigation, clavier, contenu long et mouvement réduit. Couper puis rétablir le réseau pendant une sauvegarde ; vérifier les états et l'absence d'écrasement.
7. Approuver une révision, lancer son export, puis modifier le brouillon avant la fin du build. Télécharger l'archive et vérifier son revisionId et son manifeste ; elle doit représenter la révision approuvée initiale.
8. Reconstruire l'archive dans un environnement propre à partir de sa notice et de son lockfile. Parcourir les routes et interactions annoncées ; comparer aux mêmes dimensions, polices et états que l'aperçu. Aucun formulaire non connecté ne simule un envoi réussi.
9. Restaurer une révision antérieure : constater une nouvelle révision, l'ancien head conservé et aucun changement des snapshots historiques. Joindre les preuves, les erreurs constatées et les éventuels écarts acceptés par le produit.

Réussir ce fil heureux ne dispense pas des cas d'erreur AT-01 à AT-25. Le budget réel, les statuts de jobs et les preuves de reconstruction font partie du procès-verbal de livraison.

## Couverture des exigences

| Exigences | Tests principaux |
|---|---|
| RQ-01 | M0, AT-14/16 |
| RQ-02/03 | AT-01..08, AT-25 |
| RQ-04/05 | AT-05/14/15/20/21/24 |
| RQ-06 | AT-04..12 |
| RQ-07 | AT-03/17/18 ; M2 suite par modèle |
| RQ-08 | AT-21/24/25 et revue de design sur plusieurs briefs |
| RQ-09 | AT-10/15/20/21 |
| RQ-10 | AT-06/09/10/12/13 ; branches en M2 |
| RQ-11 | AT-13/20/21/22 |
| RQ-12 | AT-24 |
| RQ-13 | AT-08/09/16/17/18/19/22/23 |
| RQ-14 | AT-15/19/20/21 et contrôle des notices |
| RQ-15/16 | recette M2/M3 dédiée, pas déclarée couverte par M1 |

## Fixtures et stratégie

Trois briefs publics/fictifs : restaurant, portfolio, produit. Pour chacun : composition simple, version dense et variante mobile. Ajouter une page comportant états interactifs (menu, FAQ, formulaire non connecté). Utiliser textes, images et polices figés, horloge stable, viewport et paramètres d'animation connus.

Tests domaine : opérations, invariants, verrous, migrations et invariance des autres blocs. Tests contrats : même comportement HTTP/MCP et fixtures communes aux adaptateurs. Tests IA déterministes via réponses enregistrées fictives ; les appels réels restent plafonnés, séparés et explicitement déclenchés par l'équipe.

Le test de flux doit couper les données à toutes les frontières utiles, y compris au milieu d'un caractère et d'une ligne, pas seulement envoyer un JSON complet par paquet. Les échecs de schéma, refus et coupures ne doivent pas être masqués par un retry infini.

## Qualité visuelle et liberté

Évaluer avec le propriétaire produit : pertinence du contenu, hiérarchie, caractère distinctif, cohérence des tokens et possibilité de dépasser une simple variation de template. Comparer les mêmes dix demandes en mode manuel, suggestions et prévisualisation automatique. Mesurer délai utile, surprise, corrections et annulations. Consigner les choix retenus, pas une note esthétique universelle.

La comparaison de captures repère des différences ; elle ne démontre pas à elle seule une interaction, une accessibilité ou une identité de pixels sur tous les appareils. Les animations sont arrêtées sur des états reproductibles et leurs parcours sont testés séparément.

## Performance

Mesurer séparément shell éditeur, latence du modèle et site exporté. Relever poids JS/CSS/assets réellement construits, nombre de requêtes, fluidité et chargement sur environnement documenté. Les mesures labo sont nommées comme telles ; des Core Web Vitals terrain nécessitent des observations d'utilisateurs et ne sont pas prédites comme une somme de composants.

Les budgets définitifs sont fixés après baseline sur fixtures et appareils/réseaux choisis. Pas de promesse universelle de 60 fps, de LCP exact ou de poids total arbitraire. Le contenu reste lisible si une animation native n'est pas supportée.

## Dossier de preuve de livraison

Pour chaque jalon : version/commit, environnement et hôte, commandes exécutées et résultats, comptes de test sans secrets, scénarios réussis/échoués, captures utiles, archive et hash, manifests, limites connues et décision d'acceptation. Une revue automatisée ou multi-agent est une relecture supplémentaire et non une certification.
