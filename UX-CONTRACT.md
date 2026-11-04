# Contrat UX et comportements

Références : [produit](docs/spec/PRODUCT.md), [contrats de données](docs/spec/CONTRACTS.md), [identité](DESIGN.md). Les libellés ci-dessous sont les noms canoniques du produit, à utiliser sur toutes les surfaces.

Le cadrage cible du 3 novembre 2026 décrit une surface unique et un lancement contextualisé par ChatGPT. Il ne constitue pas une preuve de livraison : la navigation par étapes et le candidat en lecture seule du prototype M0 restent à faire évoluer ; le catalogue à droite, le contexte de lancement complet, l'édition des candidats et la transmission `/validate` ne sont pas qualifiés par les seules captures locales. La carte M0 ci-dessous conserve la trace des propriétaires déjà introduits.

## Espace de travail

Une seule route de travail accueille le brief, l'édition et le catalogue. Il n'y a ni onglets « Décrire / Composer / Transmettre », ni navigation séquentielle imposée, ni page ou onglet séparé de réglage de bloc. La validation et le rapport sont des actions de cette surface ; une relecture ou une confirmation peut s'y ouvrir sans changer de route.

Les pages/routes du site créé restent des objets du document ; leur sélection dans le projet ne crée pas de nouveau parcours de travail dans Manifest.

Barre haute : opération active (nouveau projet, nouvelle page, ou modification de page), projet/page cible, fournisseur et modèle, format d'aperçu, Annuler/Rétablir, Historique et action de validation/rapport. Gauche : champ principal pour modifier le brief et la proposition reçus de ChatGPT, logique de page et animations, état de pause/analyse et explications des candidats. Centre : candidat modifiable par sélection et commandes contextuelles, avec aperçu Desktop/Tablette/Mobile. Droite : second champ de recherche de composants/animations dans le catalogue et résultats avec provenance ; cette recherche n'appelle pas de modèle. Les propriétés du bloc sélectionné s'éditent sur le canevas ou à gauche, sans ouvrir une autre page ni remplacer le catalogue. Le rail droit se replie pour agrandir l'aperçu.

`create_project` commence sur une base vide ; un candidat transmis est prévisualisé comme première page modifiable. Sans candidat utilisable, le canevas est réellement vide, jamais un Hero masqué ; conserver le candidat écrit dans le brouillon et l'ignorer laisse la base vierge. `create_page` relit le Snapshot du projet existant, puis prévisualise une nouvelle page comme candidat non conservé ; conserver l'ajoute au projet, ignorer garde le Snapshot intact. `modify_page` relit le Snapshot et la page ciblée ; le candidat est comparé à `baseDraftVersion` puis présenté comme changement temporaire. Dans les deux opérations sur projet existant, garder les pages et blocs non concernés et refuser les candidats périmés ; aucune retouche temporaire ne remplace silencieusement la base.

Sur écran étroit, Brief et Catalogue s'ouvrent dans des tiroirs non concurrents de la même surface ; aucun nouvel écran de réglage ni parcours par étapes n'est introduit. Les deux champs, les propriétés contextuelles et les actions restent accessibles au clavier virtuel. Fermer un tiroir restaure le focus sur son déclencheur et préserve le contenu, la sélection et le scroll utiles.

Le thème de l'éditeur ne se confond pas avec celui du site créé. Les dimensions desktop/tablette/mobile de l'aperçu changent le viewport simulé, pas les données. Les règles responsive appartiennent au document.

## Lancement et retour depuis ChatGPT

Le parcours de référence part d'un chat de projet : l'utilisateur sélectionne Manifest ou l'invoque avec `@Manifest` et envoie sa demande ; le chat propose une carte « Ouvrir Manifest ». La mention sélectionne le plugin, elle ne prouve pas à elle seule l'ouverture de l'éditeur. `/manifest` reste une commande native à qualifier ; la carte reste le chemin visible pour ouvrir la vue.

Le lancement reçoit explicitement une opération — nouveau projet, nouvelle page dans un projet existant, ou modification d'une page existante —, sa cible et sa version de base lorsqu'elles existent, ainsi que la proposition déjà formulée par ChatGPT et son candidat structuré facultatif. Pour un nouveau projet, la base est vide ; pour créer une page ou en modifier une, le Snapshot autorisé du projet est relu avant toute proposition et la version/cible attendue est vérifiée. Le contexte fourni par l'hôte est visible et corrigible, jamais déduit d'un document ouvert par hasard. Un dernier message utilisateur déjà envoyé peut compléter le brief, mais ne remplace pas une proposition manquante. Un handoff textuel préremplit le brief ; l'analyse locale commence après 1 500 ms et l'API distante uniquement si un fournisseur et un modèle ont été choisis.

Si l'opération ou la cible manque, les demander dans la même surface avant de charger ou modifier un document ; si le candidat manque ou ne peut pas être interprété, expliquer la limite et proposer de le reprendre. Aucun modèle, composant ou projet de démonstration ne tient lieu de contexte reçu. Ces informations de lancement doivent être validées par le contrat de l'hôte avant d'être rendues comme un candidat utilisable.

La vue conserve ses propres champs. Elle ne lit jamais le texte non envoyé du compositeur ChatGPT et ne promet pas d'accès à l'ensemble de la conversation : seuls les éléments explicitement transmis par l'hôte ou saisis dans Manifest alimentent le travail. `/validate` dans le champ principal fige l'état visible et éligible après vérification, produit le rapport et demande sa transmission à la conversation via une capacité qualifiée de l'hôte. Après accusé d'envoi, Manifest rend la main à ChatGPT pour générer l'application. Si l'envoi manque ou échoue, la vue reste ouverte avec le rapport prêt à copier/télécharger. Le rapport comprend l'opération et la cible, un résumé structuré, les métadonnées de la révision, les références exactes des composants choisis et la spécification de connexion aux données décrite ci-dessous. Un artefact de code déjà disponible peut être lié ; la validation du design ne prétend pas avoir généré ou connecté l'application.

## Propriété canonique des comportements

| Capacité | Propriétaire futur | Source | Variantes admises |
|---|---|---|---|
| Écriture du document | domain/DocumentController | CONTRACTS.md | manuel, IA conservée, restauration |
| Sélection et survol | editor/SelectionController | UX-CONTRACT.md | souris, clavier, toucher |
| Select/Combobox | editor/primitives/Select | DESIGN.md + présent contrat | liste courte, recherche catalogue |
| Champ d'intention | editor/IntentComposer | présent contrat | automatique, manuel, suspendu |
| Contexte de lancement | host-adapters + editor/LaunchContext | présent contrat ; schéma à livrer avec l'API d'hôte | create_project sans cible, create_page avec projectId/baseDraftVersion, modify_page avec projectId/pageId/baseDraftVersion, contexte incomplet signalé |
| Intention d'intégration des données | domain/Snapshot + commandes | présent contrat ; schéma/fixtures à livrer par DOM-01 | versionnée via apply_ops, puis figée dans la révision et le rapport |
| Édition contextuelle du candidat | domain/DocumentController + editor/SelectionController | présent contrat ; mêmes schémas et règles que le document | retouches temporaires sans écrasement de la base, conservation atomique, abandon |
| Notifications | editor/FeedbackProvider | présent contrat | statut discret, erreur persistante |
| Dialogues | editor/primitives/Dialog | présent contrat | confirmation d'abandon, restauration |
| Défilement | editor/theme + layout | DESIGN.md | panneaux et viewport central |
| Autosave/conflit | editor/DraftSync | CONTRACTS.md | local, synchronisation, confirmé, conflit |

Ne pas créer de versions locales concurrentes de ces comportements dans chaque panneau. Le choix Puck ne dispense pas de vérifier ses contrôles et raccourcis dans ces parcours.

### Canonical UI Map — implémentation de qualification M0

Cette carte décrit les propriétaires réellement introduits par ARC-01 pour son écran unique. Elle ne remplace pas les garanties de sauvegarde et de versions décrites ci-dessous. L'extraction vers les packages de l'architecture cible se fait au ticket concerné, sans conserver deux implémentations concurrentes. Les vérifications citées doivent être exécutées et leurs résultats consignés séparément.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | Puck.Fields et heroConfig, apps/editor-web/src/hero.tsx | propriétés admises du contrat M0 et Snapshot | un Hero, texte, radio et couleurs natives | tests/e2e/arc01.spec.ts : édition, focus, mobile |
| Select/Listbox | ModelProviderPanel, apps/editor-web/src/model-provider-panel.tsx ; selects natifs du navigateur | registre configuré par `get_provider_registry`, type partagé ModelProviderRegistry ; sélection temporaire sans secret côté vue | modèles réellement déclarés par l'hôte uniquement ; sélection explicite ; retour au mode local | apps/editor-web/test/model-selection.test.ts, MCP contract tests et revue navigateur |
| Scrollbar | apps/editor-web/src/style.css | DESIGN.md et défilement défini ici | shell et panneaux ; aperçu responsive distinct | tests/e2e/arc01.spec.ts : largeur étroite et absence de débordement |
| Toast | footer.statusbar et error-banner, apps/editor-web/src/main.tsx | états de retour définis ici | statut discret, erreur persistante, aucun toast éphémère de remplacement | tests/e2e/arc01.spec.ts : sauvegarde et conflit |
| CRUD | Editor dans apps/editor-web/src/main.tsx et packages/host-adapters/src/index.ts | commandes canoniques et transport actif | lecture et modification M0 ; navigateur diagnostic ou MCP, sans création/suppression générale | tests/m0-backend.test.ts et tests/e2e/arc01.spec.ts |

### Recherche d’exemples dans la qualification locale 0.1.3

Le propriétaire de ce second champ est `ComponentExamples` (`apps/editor-web/src/component-examples.tsx`). Il est placé dans le panneau droit sous le titre Suggestions. Sa liste de sept exemples est locale et séparée du brief, du Snapshot et du transport ; la recherche, l’ouverture et la lecture d’une démonstration ne lancent ni modèle ni sauvegarde. La recherche ignore casse/accents et possède un effacement nommé qui restaure le focus. Les cartes s’ouvrent au clavier/toucher ; les animations sont finies, rejouables et statiques en mouvement réduit. Les exemples ne constituent pas un catalogue M1 qualifié et ne proposent aucune insertion générique. Recette : `tests/e2e/component-examples.spec.ts`.

## Intention et suggestions

Quand un modèle configuré est sélectionné, l'interface dit « configuré » (la disponibilité réelle n'est pas vérifiée) et indique que l'intention principale, le projet/page ciblé et le brouillon enregistré lui seront transmis. Le fournisseur et le modèle sont sélectionnés explicitement et restent temporaires dans la vue ; aucun secret n'est saisi ou stocké par le navigateur. Sans modèle sélectionné, seules les règles locales divulguées restent disponibles et leur portée est expliquée. L'analyse est toujours active : après une pause de 1,5 seconde, les règles locales s'exécutent ou le modèle explicitement choisi génère une proposition sans envoi manuel. Le modèle sélectionné et l'usage/coût applicable restent visibles ; « Proposer maintenant » lance sans attendre et « Annuler la génération » invalide le job en cours. Aucun plafond de dépenses n'est implémenté dans le prototype M0 : le fournisseur ou l'hôte doit limiter le budget avant un essai réel. Enter insère une nouvelle ligne ; un raccourci explicite, documenté et compatible IME déclenche l'action manuelle. Une génération ne désactive jamais la saisie.

La recherche de composants à droite interroge le catalogue immuable/versionné sans démarrer un job IA. Une recherche comme « menu » retourne uniquement des éléments admis, avec leur aperçu jouable, l'emplacement d'insertion, la bibliothèque/source, la version, la licence et la compatibilité. Le champ possède une action Effacer accessible lorsqu'il n'est pas vide. Les explications du modèle restent à gauche ; un résultat de catalogue ne doit pas être présenté comme une nouvelle réponse de modèle.

Le survol d'une carte montre une démonstration de son composant et de son animation. Le focus clavier donne accès à la même démonstration ; un bouton « Voir la démo » offre le même parcours au toucher et sans survol. Une démonstration s'arrête à la sortie/fermeture ou par une action explicite ; respecter le mouvement réduit avec un état représentatif statique et une lecture volontaire. Aucun ajout ni écriture du Snapshot ne résulte du survol, du focus ou de la lecture. « Prévisualiser » puis « Ajouter ici », ou le glisser-déposer avec une alternative clavier/tactile, insèrent au slot choisi et à une position explicite. Si un candidat est en cours d'édition, l'ajout vise ce candidat temporaire ; sinon il vise le brouillon, sans mélanger les deux états.

Après l'ajout, le panneau principal affiche une référence lisible et son identifiant stable (par exemple `@catalog/navigation/mobile-menu@1.2.0`) sous le texte d'intention. Ce jeton est une pièce jointe structurée : il est transmis aux propositions suivantes et au rapport, mais ne réécrit pas les mots de l'utilisateur. Le retirer de la liste des références ne supprime pas à lui seul un bloc déjà ajouté ; l'interface distingue ces deux actions.

Après 1,5 seconde sans frappe, hors composition IME : l'analyse locale ou le job fournisseur commence automatiquement, après synchronisation des réglages manuels. L'indicateur reprend le même délai : « Interprétation après 1,5 s de pause ». Aucun job distant si le texte est vide, si aucun modèle n'est sélectionné, si l'application est hors ligne ou si le brouillon est en conflit ; les règles locales restent disponibles si elles peuvent représenter l'intention. Le M0 ne vérifie pas le budget du fournisseur. Un seul job actif par session d'éditeur ; une nouvelle intention l'annule sans interrompre les autres sessions et rend toute réponse tardive inéligible dans la vue. Le M0 prend en charge un seul candidat direct ; les alternatives et les adaptateurs Anthropic/Google natifs restent à développer.

| État | Affichage et comportement |
|---|---|
| Repos | champ disponible, aperçu courant, aucune animation d'attente |
| Frappe | texte local ; pas de déplacement du curseur ni d'appel immédiat |
| Attente de pause | statut discret ; nouvelle frappe relance le délai |
| Synchronisation nécessaire | conserver le dernier aperçu ; ne pas générer sur une base inconnue |
| Recherche de propositions | progression par étapes connues, arrêt disponible ; pas de pourcentage inventé |
| Proposition prête | aperçu automatique du candidat, retouches contextuelles possibles ; états « Proposée », « Modifiée » et « Conservée » distincts ; base et provenance conservées |
| Suggestions | chaque carte indique le composant/effet, la raison, la bibliothèque et sa version ; « Prévisualiser » puis « Ajouter à la composition » |
| Alternatives | jusqu'à trois choix complets du même fournisseur ; sélection prévisualise sans approuver |
| Obsolète | résultat non appliqué ; dernier aperçu conservé identifié, nouvelle proposition possible |
| Échec/refus/quota | explication locale et action adaptée ; contenu et réglages conservés |

Une demande précise peut produire un candidat directement prévisualisé. Une demande exploratoire propose des alternatives. La classification est une aide du modèle ; les choix d'affichage et les droits restent côté produit. Les alternatives ne remplacent jamais silencieusement le brouillon.

## Projection, conservation et causalité

L'aperçu est une projection de `brouillon confirmé + modifications manuelles en attente + proposition éligible`. Les deux dernières couches sont temporaires, identifiées et réversibles. Aucun arbre indépendant n'est persisté comme une deuxième autorité.

Pour peindre une proposition : generationId actif, même session/intentEpoch et même baseDraftVersion, aucune modification manuelle non synchronisée de la base. Une nouvelle frappe du brief invalide son éligibilité immédiatement ; la dernière image peut rester visible avec « Proposition précédente » pendant l'attente, sans l'exporter implicitement.

Le candidat cible est modifiable dans le canevas ou par ses propriétés contextuelles. Ces retouches sont validées par les mêmes schémas et le même contrôleur que le document ; elles restent une projection temporaire sur la version de base, pas un deuxième document persistant. Conserver la provenance de la proposition reçue et distinguer les retouches de l'utilisateur. Une modification du brouillon de base pendant cette édition rend le candidat à revalider ; elle ne provoque pas une fusion implicite.

« Conserver » applique le candidat et ses retouches par une commande atomique sur la version source, avec contrôle de version et clé d'idempotence ; le contrat `keep_proposal` doit couvrir ces retouches avant de les rendre conservables. Ignorer abandonne le candidat et ses retouches sans toucher au brouillon. Une proposition devenue obsolète est marquée ancienne, jamais rejetée à la place de l'utilisateur, et ne s'applique jamais. Les changements manuels du brouillon sont enregistrés après une courte pause avant de lancer une génération. Le prototype M0 conserve actuellement un candidat en lecture seule : son adaptation doit prouver ce parcours complet avant d'annoncer l'édition des candidats livrée.

Annuler/Rétablir porte sur des groupes de modifications du document, pas sur les frappes du prompt ni sur des tokens du modèle. Un groupe IA conservé s'annule en une opération métier. Une réponse de sauvegarde ou de poll ne vole ni focus ni scroll et ne remplace pas un état local plus récent.

## Sauvegarde et récupération

Autosave manuel : une seconde d'inactivité, un lot en vol au maximum, lots suivants en attente dans l'ordre. Une réponse de conflit bloque la file ; pas de rebase aveugle. La révision du serveur et les modifications locales sont comparables avant choix Recharger / Copier mes changements / Reprendre sur une copie.

« Sauvegardé » signifie accusé serveur ; distinguer « Brouillon local » et « Enregistrement ». Une proposition seulement prévisualisée porte cet état et n'est pas annoncée comme sauvegardée. En cas de fermeture, proposer de conserver une proposition non enregistrée ; ne pas multiplier les confirmations pour les réglages réversibles déjà sauvegardés.

La récupération locale est scindée par utilisateur et projet, expire après sept jours et ne contient ni clé ni token d'authentification. Au retour, elle est proposée à la restauration, sans remplacer le serveur. Si le stockage local est indisponible dans l'hôte, informer de cette limite ; la sauvegarde serveur reste le chemin normal.

## Versions, rapport et export

« Valider la version » fige l'état visible et éligible dans une révision immuable identifiée par `revisionId` et empreinte. Un candidat retouché doit d'abord être conservé de façon atomique et confirmé, ou abandonné au profit du brouillon ; le rapport ne prétend pas figer la base alors qu'il montre un autre contenu. La préparation du rapport produit un résumé lisible associé à cette révision. Le rapport comprend le mode de lancement et la cible, la proposition initiale de ChatGPT et le brief modifié, les pages/routes, composants et versions de catalogue, tokens visuels, interactions, paramètres d'animation, comportements responsive, provenance des assets, exigences d'accessibilité/réduction du mouvement, provenance du job modèle, preuve d'éligibilité capturée à la validation, spécification de connexion aux données et hypothèses ou limites restantes. Il ne contient ni clé, token d'authentification ni secret fournisseur. Son hash est calculé sur une sérialisation canonique des champs du rapport, hors hash lui-même et état ultérieur de transmission.

### Spécification de connexion aux données du rapport

`/validate` transmet à ChatGPT une spécification suffisante pour relier l'interface aux données lors de la génération de code. Préparer cette spécification n'établit aucune connexion. Chaque liaison décrit :

| Information | Contenu attendu sans secret |
|---|---|
| Source | type de source et référence non secrète du jeu de données, de l'API ou du connecteur prévu ; périmètre fonctionnel, sans URL contenant de jeton ni identifiants d'accès |
| Schéma | collections/entités, champs, types, identifiants, relations et contraintes utiles ; les exemples sont fictifs ou explicitement autorisés |
| Mapping | identifiant stable du bloc, propriété ou interaction concernée, champ source et transformation admise ; distinguer lecture et écriture demandées |
| Rafraîchissement | déclencheur manuel, au chargement, périodique ou événementiel ; intervalle prévu s'il existe, comportement attendu pendant chargement, vide, erreur ou données anciennes |
| Statut simulé/réel | indiquer si l'aperçu utilise des données simulées ou une source réelle ; séparer le mode souhaité du dernier état de connexion réellement vérifié et de sa preuve disponible |

Une connexion réelle exige un connecteur autorisé pour l'utilisateur, le projet, la source et les opérations nécessaires. Si ce connecteur est absent, non autorisé ou non vérifié, garder le statut non connecté/simulé et expliciter le travail restant ; ne jamais annoncer « données réelles connectées » sur la seule base d'un mapping ou du rapport envoyé. L'authentification et les secrets relèvent du connecteur/backend, jamais du brief, des champs de l'éditeur ou du rapport. Une génération de code ou la validation du design n'autorise pas à elle seule l'accès à une source ni l'écriture de données.

### Éligibilité et transmission

La provenance du modèle et l'état à jour sont liés au job/proposal qui a produit le candidat, pas au fournisseur actuellement sélectionné dans la barre d'outils. Le rapport et l'aperçu partagent le même prédicat d'éligibilité : session, description, version de base, fournisseur/modèle capturés et absence de modification manuelle non synchronisée. Un candidat ancien reste clairement étiqueté et ne peut pas être présenté comme la version validée.

`/validate` fige le Snapshot et le brief structurés, produit le rapport, puis demande à l'hôte de le joindre au chat courant. Un reçu confirme l'envoi avant que l'éditeur cède la main au modèle. Les détails volumineux peuvent être joints comme artefact lié si l'hôte le permet. Une absence de capacité de transmission garde le rapport disponible pour copie/téléchargement et annonce ce fallback. La même action reste accessible par un bouton même si la commande slash native n'existe pas.

### Historique et export

L'historique nomme les révisions, la date locale et l'auteur. Restaurer préserve l'historique, annonce la révision créée et ne relance pas automatiquement un export. Une comparaison est un affichage de deux snapshots, pas une fusion automatique.

L'export est une étape distincte : préparation, compilation, contrôle de rendu, archive prête. En cas d'échec, conserver la révision et fournir Réessayer si sûr. Télécharger livre l'archive et son manifeste, pas un mur de code dans le chat.

## Accessibilité, responsive et contenu

Cible : WCAG 2.2 AA à vérifier, sans prétendre à une certification. Boutons/liens natifs, noms accessibles, focus visible et non masqué, alternatives au drag, actions disponibles sans survol, contrastes et mouvement réduit. Annoncer les changements de statut avec une fréquence raisonnable, pas chaque fragment réseau.

Sélection de bloc au clavier, déplacement via actions Monter/Descendre/Déplacer vers, accès aux propriétés et restauration du focus après fermeture des panneaux. La sélection est une surcouche de l'éditeur, absente de l'export. Les popovers ne changent pas la mise en page ; les erreurs restent près du contrôle concerné.

Les panneaux ont un propriétaire de scroll explicite et des barres utilisables. Pas de scroll forcé vers une suggestion si l'utilisateur explore ailleurs. Images et polices réservent leur géométrie. Des états vide, recherche sans résultat, chargement, erreur et contenu long sont prévus.

## Scénarios d'arbitrage obligatoires

Tester la même page avec dix intentions : modification ciblée, hésitation, demande globale, demande impossible, verrouillage, deux corrections rapides, édition manuelle pendant génération, changement de modèle, quota atteint et fermeture/reconnexion. Comparer contrôle perçu, délai utile et annulations avant de figer les réglages de la boucle.

Qualifier aussi le lancement nouveau avec candidat reçu, le lancement existant sur la bonne base, un contexte manquant et une version incompatible ; les retouches puis conservation/abandon d'un candidat ; la démonstration catalogue au survol, clavier et toucher avec mouvement réduit ; et le rapport de données en modes simulé, réel autorisé et connecteur indisponible. Ces scénarios restent sur la même route et vérifient qu'aucun état proposé ou simulé n'est annoncé comme conservé, connecté ou transmis sans preuve.
