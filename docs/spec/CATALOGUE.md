# Catalogue, liberté de composition et profil de design

## Contrat d'une release

Une release contient pour chaque type : id/version, catégorie, cible(s) prises en charge, schéma de propriétés, slots et enfants admis, valeurs par défaut, contrôles d'édition, fonction de rendu React, règles responsive, actions, assets, dépendances exactes, sourceHash, licence et notices, tests, profil de coût mesuré sur fixture. Un nom de bibliothèque ou un lien de démo ne suffit pas.

Le registre shadcn peut distribuer les fichiers ; la couche produit ajoute les métadonnées d'édition et de validation. Les composants copiés deviennent des sources versionnées de notre release. Les mises à jour tierces ne changent jamais silencieusement une ancienne révision.

Les schémas de composant font autorité pour leurs propriétés. La config Puck, les contrôles, la projection de schéma vers le modèle et l'export sont dérivés d'une définition commune ou vérifiés contre elle. Toute propriété affichée doit réellement agir sur le rendu et être exportable.

## Catalogue M1

Primitives composables : Section, Stack, Grid, Heading, Text, Button et Image. Leurs propriétés couvrent alignement, largeur, espacement, colonnes, tokens, ordre et variantes responsive autorisées. Le placement absolu libre n'est pas une promesse M1. Les slots sont imbriquables jusqu'à huit niveaux et limités par le catalogue.

| Bloc | Contenu essentiel | Interactions exportées |
|---|---|---|
| Navigation | marque, liens internes, action principale | menu mobile accessible |
| Hero | titre, body, média optionnel, actions, disposition | liens et animations admises |
| TextSection | titre et contenu textuel | liens sûrs |
| Gallery | images, légendes, grille | grille M1 ; lightbox ultérieure |
| Features | liste et disposition variable | liens optionnels |
| Pricing | offres et actions | liens, pas de paiement intégré implicite |
| Testimonials | citations et personnes autorisées | affichage statique M1 |
| FAQ | questions/réponses | disclosure accessible |
| ContactForm | champs et règles locales | validation ; envoi désactivé tant qu'aucune intégration n'est configurée |
| Footer | navigation secondaire et mentions | liens |

Hero d'exemple : props.id, title, body, backgroundToken et animation sont admis. Les autres champs sont définis dans la release avant livraison, pas acceptés automatiquement par un dictionnaire libre. Des variantes de structure et des primitives évitent que les pages se ressemblent toutes.

## Animations

CSS natif d'abord pour les effets adaptés : transitions d'état, opacity et transform de faible amplitude. Révélation au scroll seulement si le navigateur cible est pris en charge ; fallback sans dissimulation du contenu. Un comportement interactif accessible ne doit pas être sacrifié pour revendiquer zéro JavaScript.

Les préréglages exposent durée, délai, amplitude et déclencheur dans des plages contrôlées. Pas de transition-all ni de will-change généralisé. Le mode réduit retire le mouvement non essentiel tout en maintenant les changements d'état. Une animation complexe peut justifier Motion ou GSAP ; le choix dépend du cas mesuré.

L'éditeur et le site exporté ont des budgets séparés. L'export ne contient pas Puck, les SDK fournisseurs ou le bridge MCP. Le poids de chaque bloc se mesure dans un build de référence ; LCP/INP ne s'additionnent pas à partir d'une fiche de bloc.

## Intégrations des quatre photos

Toutes les entrées sont candidates, non des compatibilités déjà certifiées. M1 utilise une sélection minimale ; admission par release et audit de licence requis pour chacune.

| Entrée | Rôle | Étape / position |
|---|---|---|
| shadcn/ui | contrôles de base et distribution de sources | M1 sélection |
| React Bits | blocs/effets | M2 sélection |
| Aceternity UI | blocs/effets | M2 sélection |
| Magic UI | blocs/effets | M2 sélection |
| Motion Primitives | interactions préparées | M2 sélection |
| React Parallax Tilt | tilt React | M3 optionnel |
| Vanilla Tilt | tilt DOM | M3 alternative |
| tsParticles | particules | M3 optionnel |
| Vanta.js | fond animé | M3 optionnel |
| Curtains.js | effets WebGL sur médias | M3 optionnel |
| Atropos | relief/parallaxe | M3 alternative |
| GSAP | moteur d'animation | M2/M3 selon bloc |
| GSAP ScrollTrigger | orchestration au défilement | M2/M3 selon bloc |
| Motion / Framer Motion | animation React/DOM | M2 selon bloc |
| React Spring | ressorts React | M3 alternative |
| @react-spring/three | animation 3D | M3 |
| Lenis | défilement lissé | M3 optionnel, accessibilité à vérifier |
| Theatre.js | séquences et édition d'animation | M3 |
| Anime.js | animation JavaScript | M3 alternative |
| Motion One | ancienne famille fusionnée dans Motion | normaliser l'entrée, pas deuxième moteur obligatoire |
| Three.js | rendu 3D | M3 socle sélectionné |
| React Three Fiber | rendu Three via React | M3, versions React compatibles |
| React Three Drei | aides R3F | M3 sélection |
| React Three Postprocessing | effets 3D | M3, budget GPU |
| React Three Rapier | physique | M3 cas explicite |
| React Three XR | XR | M3 hors livraison initiale |
| Babylon.js | autre moteur 3D | M3 cible distincte |
| react-babylonjs | intégration React/Babylon | M3 cible distincte |
| Spline | création et runtime de scènes | M3 connecteur |
| @splinetool/react-spline | composant runtime | M3, capacités et assets figés |
| OGL | approche WebGL légère | M3 alternative |
| GLTFJSX | conversion de modèles en composants | pipeline assets M3 |
| gltf-transform | optimisation glTF | pipeline assets M3 |
| gltfpack | optimisation glTF | alternative pipeline M3 |
| Draco | compression géométrique | choix par asset M3 |
| Meshopt | optimisation/compression | choix par asset M3 |
| Blender | création/préparation de modèles | outil amont, pas dépendance du navigateur |
| Spline Editor | édition de scènes | outil amont |
| Sketchfab | acquisition/intégration de ressources | droits et accès par asset |

Une scène 3D expose caméra, éclairage, ressources, matériaux autorisés, qualité et alternative statique. Limiter taille de téléchargement, textures, résolution, nombre d'instances et fréquence de rendu. Détruire contextes et écouteurs au démontage. Une URL externe modifiable n'est pas une version reproductible : archiver les ressources autorisées ou signaler que la reproduction exacte n'est pas garantie.

## Unslop comme profil

Source : Unslop par **Damir Sokolovsky (@heydamir)**, version locale déclarée **CC BY 4.0** ; attribution conservée dans la release et ses notices. Ne pas prétendre que cette licence couvre les autres composants.

La release de profil contient les règles par neuf passes, le niveau de sévérité, les mécanismes d'exception et sa version. La direction propre au projet (produit, caractère, univers, moments, signature et contraintes de marque) appartient à Snapshot.designBrief et se modifie par update_brief. Les règles mesurables alimentent les contrôles ; les préférences esthétiques alimentent des propositions explicables. Une exception de marque explicite ne doit pas être supprimée automatiquement.

Les résultats doivent être évalués sur plusieurs sujets réels. Le catalogue est accepté pour sa qualité de composition, son accessibilité et son export, pas pour le nombre d'effets ou la ressemblance avec un exemple de référence.

## Admission d'un composant nouveau

M1 n'exécute pas de source arbitraire produite pendant la frappe. Parcours ultérieur : demande -> source en environnement isolé -> dépendances autorisées -> validation et tests -> aperçu séparé sans bridge privilégié -> approbation de release -> catalogue. Les composants générés n'héritent jamais des droits du serveur ou de l'éditeur.

## Exports futurs

Chaque entrée déclare sa matrice de capacités : react, html-static, astro, vue, svelte, avec statut supported/unsupported/experimental et preuve. Une cible non admise échoue explicitement. Le format de contenu peut être réutilisé ; chaque cible exige son implémentation, ses comportements, ses assets, son build et sa recette.
