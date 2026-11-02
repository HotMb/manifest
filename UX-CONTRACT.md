# Contrat UX et comportements

Références : [produit](docs/spec/PRODUCT.md), [contrats de données](docs/spec/CONTRACTS.md), [identité](DESIGN.md). Les libellés ci-dessous sont les noms canoniques du produit, à utiliser sur toutes les surfaces.

## Espace de travail

Barre haute : projet/page, fournisseur et modèle, étapes « Décrire / Composer / Transmettre », format d'aperçu, Annuler/Rétablir et Historique. Gauche : champ d'intention, état de pause/analyse et exemples de départ. Centre : aperçu dominant de la page avec commandes Desktop/Tablette/Mobile. Droite : suggestions de composants et d'animations, provenance et état ; le rail se replie pour agrandir l'aperçu. « Préparer le rapport » ouvre une revue ; « Transmettre au chat » est l'action explicite d'envoi. Sur écran étroit, les panneaux deviennent des tiroirs non concurrents ; le champ actif et les actions restent accessibles au clavier virtuel.

Le thème de l'éditeur ne se confond pas avec celui du site créé. Les dimensions desktop/tablette/mobile de l'aperçu changent le viewport simulé, pas les données. Les règles responsive appartiennent au document.

## Lancement et retour depuis ChatGPT

Le parcours de référence part d'un chat de projet : l'utilisateur sélectionne Manifest ou l'invoque avec `@Manifest`, puis le chat présente une carte « Ouvrir Manifest ». La mention est le chemin d'invocation documenté dans ChatGPT Desktop. `/manifest` et `/validate` peuvent être comprises comme des instructions lorsque Manifest est sélectionné ; l'interface ne promet pas qu'elles apparaissent comme commandes natives dans le menu slash de l'hôte. La carte reste le chemin visible pour ouvrir la vue.

La vue conserve son propre champ d'intention et ne lit pas le texte non envoyé du compositeur ChatGPT. À la fin, l'utilisateur prépare un rapport attaché à une révision immuable, le relit, puis choisit « Transmettre au chat ». L'éditeur reste ouvert. Le message comprend un résumé structuré et les métadonnées de la révision ; le code complet est transmis comme artefact lié lorsque disponible, pas comme un bloc de code illimité dans le message.

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

### Canonical UI Map — implémentation de qualification M0

Cette carte décrit les propriétaires réellement introduits par ARC-01 pour son écran unique. Elle ne remplace pas les garanties de sauvegarde et de versions décrites ci-dessous. L'extraction vers les packages de l'architecture cible se fait au ticket concerné, sans conserver deux implémentations concurrentes. Les vérifications citées doivent être exécutées et leurs résultats consignés séparément.

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | Puck.Fields et heroConfig, apps/editor-web/src/hero.tsx | propriétés admises du contrat M0 et Snapshot | un Hero, texte, radio et couleurs natives | tests/e2e/arc01.spec.ts : édition, focus, mobile |
| Select/Listbox | ModelProviderPanel, apps/editor-web/src/model-provider-panel.tsx ; selects natifs du navigateur | registre configuré par `get_provider_registry`, type partagé ModelProviderRegistry ; sélection temporaire sans secret côté vue | modèles réellement déclarés par l'hôte uniquement ; sélection explicite ; retour au mode local | apps/editor-web/test/model-selection.test.ts, MCP contract tests et revue navigateur |
| Scrollbar | apps/editor-web/src/style.css | DESIGN.md et défilement défini ici | shell et panneaux ; aperçu responsive distinct | tests/e2e/arc01.spec.ts : largeur étroite et absence de débordement |
| Toast | footer.statusbar et error-banner, apps/editor-web/src/main.tsx | états de retour définis ici | statut discret, erreur persistante, aucun toast éphémère de remplacement | tests/e2e/arc01.spec.ts : sauvegarde et conflit |
| CRUD | Editor dans apps/editor-web/src/main.tsx et packages/host-adapters/src/index.ts | commandes canoniques et transport actif | lecture et modification M0 ; navigateur diagnostic ou MCP, sans création/suppression générale | tests/m0-backend.test.ts et tests/e2e/arc01.spec.ts |

## Intention et suggestions

Quand un modèle configuré est sélectionné, l'interface dit « configuré » (la disponibilité réelle n'est pas vérifiée) et indique que l'intention et le brouillon enregistré lui seront transmis. Le fournisseur et le modèle sont sélectionnés explicitement et restent temporaires dans la vue ; aucun secret n'est saisi ou stocké par le navigateur. Sans modèle sélectionné, les pistes locales restent disponibles. L'automatique est désactivé par défaut ; son activation explicite peut appeler un modèle facturable après chaque pause de 1,5 seconde. Aucun plafond de dépenses n'est implémenté dans le prototype M0 : le fournisseur ou l'hôte doit limiter le budget avant un essai réel. « Proposer maintenant » existe aussi et ne vide pas le champ. Pendant un job, cette action devient « Annuler la génération ». Enter insère une nouvelle ligne ; un raccourci explicite, documenté et compatible IME déclenche l'action manuelle. Une génération ne désactive jamais la saisie.

Après 1,5 seconde sans frappe, hors composition IME et uniquement si l'automatique a été activé : sauvegarder les réglages manuels, puis démarrer un job. L'indicateur reprend le même délai : « Interprétation après 1,5 s de pause ». Aucun appel si texte vide, modèle non sélectionné, automatique suspendu, hors ligne ou conflit de brouillon. Le M0 ne vérifie pas le budget du fournisseur. Un seul job actif par session d'éditeur ; une nouvelle intention l'annule sans interrompre les autres sessions et rend toute réponse tardive inéligible dans la vue. Le M0 prend en charge un seul candidat direct ; les alternatives et les adaptateurs Anthropic/Google natifs restent à développer.

| État | Affichage et comportement |
|---|---|
| Repos | champ disponible, aperçu courant, aucune animation d'attente |
| Frappe | texte local ; pas de déplacement du curseur ni d'appel immédiat |
| Attente de pause | statut discret ; nouvelle frappe relance le délai |
| Synchronisation nécessaire | conserver le dernier aperçu ; ne pas générer sur une base inconnue |
| Recherche de propositions | progression par étapes connues, arrêt disponible ; pas de pourcentage inventé |
| Proposition prête | aperçu automatique du candidat en lecture seule ; états « Prévisualisée » et « Ajoutée » ; base et provenance conservées |
| Suggestions | chaque carte indique le composant/effet, la raison, la bibliothèque et sa version ; « Prévisualiser » puis « Ajouter à la composition » |
| Alternatives | jusqu'à trois choix complets du même fournisseur ; sélection prévisualise sans approuver |
| Obsolète | résultat non appliqué ; dernier aperçu conservé identifié, nouvelle proposition possible |
| Échec/refus/quota | explication locale et action adaptée ; contenu et réglages conservés |

Une demande précise peut produire un candidat directement prévisualisé. Une demande exploratoire propose des alternatives. La classification est une aide du modèle ; les choix d'affichage et les droits restent côté produit. Les alternatives ne remplacent jamais silencieusement le brouillon.

## Projection, conservation et causalité

L'aperçu est une projection de `brouillon confirmé + modifications manuelles en attente + proposition éligible`. Les deux dernières couches sont temporaires, identifiées et réversibles. Aucun arbre indépendant n'est persisté comme une deuxième autorité.

Pour peindre une proposition : generationId actif, même session/intentEpoch et même baseDraftVersion, aucune modification manuelle non synchronisée. Une nouvelle frappe invalide son éligibilité immédiatement ; la dernière image peut rester visible avec « Proposition précédente » pendant l'attente, sans l'exporter implicitement.

« Conserver » applique les opérations par une commande atomique `keep_proposal` sur la version source, avec contrôle de version et clé d'idempotence. La proposition est prévisualisée en lecture seule ; l'utilisateur peut l'ignorer sans toucher au brouillon. Une proposition devenue obsolète est marquée ancienne, jamais rejetée à la place de l’utilisateur, et ne s'applique jamais. Les changements manuels sont enregistrés après une courte pause avant de lancer une génération.

Annuler/Rétablir porte sur des groupes de modifications du document, pas sur les frappes du prompt ni sur des tokens du modèle. Un groupe IA conservé s'annule en une opération métier. Une réponse de sauvegarde ou de poll ne vole ni focus ni scroll et ne remplace pas un état local plus récent.

## Sauvegarde et récupération

Autosave manuel : une seconde d'inactivité, un lot en vol au maximum, lots suivants en attente dans l'ordre. Une réponse de conflit bloque la file ; pas de rebase aveugle. La révision du serveur et les modifications locales sont comparables avant choix Recharger / Copier mes changements / Reprendre sur une copie.

« Sauvegardé » signifie accusé serveur ; distinguer « Brouillon local » et « Enregistrement ». Une proposition seulement prévisualisée porte cet état et n'est pas annoncée comme sauvegardée. En cas de fermeture, proposer de conserver une proposition non enregistrée ; ne pas multiplier les confirmations pour les réglages réversibles déjà sauvegardés.

La récupération locale est scindée par utilisateur et projet, expire après sept jours et ne contient ni clé ni token d'authentification. Au retour, elle est proposée à la restauration, sans remplacer le serveur. Si le stockage local est indisponible dans l'hôte, informer de cette limite ; la sauvegarde serveur reste le chemin normal.

## Versions, rapport et export

« Valider la version » fige l'état visible et éligible dans une révision immuable identifiée par `revisionId` et empreinte. La préparation du rapport produit un résumé lisible associé à cette révision. Le rapport comprend la description originale et sa spécification structurée, les pages/routes, composants et versions de catalogue, tokens visuels, interactions, paramètres d'animation, comportements responsive, provenance des assets, exigences d'accessibilité/réduction du mouvement, provenance du job modèle, preuve d'éligibilité capturée à la validation et hypothèses ou limites restantes. Il ne contient ni clé, token d'authentification ni secret fournisseur. Son hash est calculé sur une sérialisation canonique des champs du rapport, hors hash lui-même et état ultérieur de transmission.

La provenance du modèle et l'état à jour sont liés au job/proposal qui a produit le candidat, pas au fournisseur actuellement sélectionné dans la barre d'outils. Le rapport et l'aperçu partagent le même prédicat d'éligibilité : session, description, version de base, fournisseur/modèle capturés et absence de modification manuelle non synchronisée. Un candidat ancien reste clairement étiqueté et ne peut pas être présenté comme la version validée.

Après préparation, une revue montre la version, son résumé et les métadonnées avant envoi. « Transmettre au chat » envoie le rapport explicitement à la conversation via la capacité de l'hôte, sans fermer l'éditeur. L'envoi inclut un résumé structuré ; les détails volumineux peuvent être joints comme artefact lié si l'hôte le permet. Une absence de capacité de transmission garde le rapport disponible pour copie/téléchargement et annonce ce fallback. `/validate` est un raccourci d'intention possible si l'hôte le route vers Manifest ; l'action reste accessible par les boutons même si la commande slash native n'existe pas.

L'historique nomme les révisions, la date locale et l'auteur. Restaurer préserve l'historique, annonce la révision créée et ne relance pas automatiquement un export. Une comparaison est un affichage de deux snapshots, pas une fusion automatique.

L'export est une étape distincte : préparation, compilation, contrôle de rendu, archive prête. En cas d'échec, conserver la révision et fournir Réessayer si sûr. Télécharger livre l'archive et son manifeste, pas un mur de code dans le chat.

## Accessibilité, responsive et contenu

Cible : WCAG 2.2 AA à vérifier, sans prétendre à une certification. Boutons/liens natifs, noms accessibles, focus visible et non masqué, alternatives au drag, actions disponibles sans survol, contrastes et mouvement réduit. Annoncer les changements de statut avec une fréquence raisonnable, pas chaque fragment réseau.

Sélection de bloc au clavier, déplacement via actions Monter/Descendre/Déplacer vers, accès aux propriétés et restauration du focus après fermeture des panneaux. La sélection est une surcouche de l'éditeur, absente de l'export. Les popovers ne changent pas la mise en page ; les erreurs restent près du contrôle concerné.

Les panneaux ont un propriétaire de scroll explicite et des barres utilisables. Pas de scroll forcé vers une suggestion si l'utilisateur explore ailleurs. Images et polices réservent leur géométrie. Des états vide, recherche sans résultat, chargement, erreur et contenu long sont prévus.

## Scénarios d'arbitrage obligatoires

Tester la même page avec dix intentions : modification ciblée, hésitation, demande globale, demande impossible, verrouillage, deux corrections rapides, édition manuelle pendant génération, changement de modèle, quota atteint et fermeture/reconnexion. Comparer contrôle perçu, délai utile et annulations avant de figer les réglages de la boucle.
