# Catalogue, liberté de composition et profil de design

## Contrat d'une release

Une release contient pour chaque type : id/version, catégorie, cible(s) prises en charge, schéma de propriétés, slots et enfants admis, valeurs par défaut, contrôles d'édition, fonction de rendu React, règles responsive, actions, assets, dépendances exactes, sourceHash, licence et notices, tests, profil de coût mesuré sur fixture. Un nom de bibliothèque ou un lien de démo ne suffit pas.

Le registre shadcn peut distribuer les fichiers ; la couche produit ajoute les métadonnées d'édition et de validation. Les composants copiés deviennent des sources versionnées de notre release. Les mises à jour tierces ne changent jamais silencieusement une ancienne révision.

Les schémas de composant font autorité pour leurs propriétés. La config Puck, les contrôles, la projection de schéma vers le modèle et l'export sont dérivés d'une définition commune ou vérifiés contre elle. Toute propriété affichée doit réellement agir sur le rendu et être exportable.

## Moteur de suggestions

Le moteur reçoit le texte et le contexte autorisé de la page, puis construit une spécification d'intention structurée (type de bloc, rôle, style, interaction, mouvement, viewport et contraintes). La recherche initiale filtre le catalogue par capability tags, cible, composants déjà présents, versions compatibles, statut de licence et budget de performance disponible. Seuls les candidats ayant passé ces filtres peuvent être suggérés ou classés par le modèle ; les entrées incompatibles, non versionnées ou sans statut de licence vérifié sont exclues ou présentées comme indisponibles, jamais comme recommandations intégrables. S'il ne reste aucun candidat, l'interface l'indique et invite à préciser la demande au lieu d'inventer une dépendance. Le modèle ne peut pas ajouter une entrée hors catalogue ni affirmer une compatibilité absente du registre.

Chaque carte de suggestion indique : nom et type, raison courte liée à la demande, bibliothèque et version de release, dépendances utiles, état (« Suggestion », « Prévisualisée », « Ajoutée »), accessibilité/mouvement réduit et éventuelles limites. Les vignettes utilisent un rendu réel du candidat lorsque possible ; une illustration schématique est signalée comme telle. Une carte est d'abord prévisualisée, puis ajoutée par action explicite. Le modèle et le catalogue n'approuvent jamais une proposition à la place de l'utilisateur.

La source de vérité pour le rendu est le composant versionné, pas l'image miniature. La révision conserve l'ID de catalogue, la version et l'empreinte de la release afin qu'une mise à jour future ne change pas rétroactivement l'aperçu exporté.

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

### Baseline de développement locale `manifest-core@0.3.0`

`@design-workbench/catalog` est un paquet de workspace marqué `private: true`. Au 4 novembre 2026, GitHub ne déclare aucune release de ce dépôt. `manifest-core@0.3.0` est donc une baseline interne au prototype, non publiée et non immuable ; les références à cette version dans les brouillons locaux n'autorisent pas un export reproductible. L'entrée de mouvement `composed@2.0.0` versionne sa capacité indépendamment de la baseline catalogue. Avant tout export ou distribution, publier une nouvelle release catalogue immuable, calculer son empreinte complète, définir la licence et prouver la compatibilité des brouillons existants. Jusqu'à cette qualification, les rapports doivent identifier la release comme provisoire.

Un premier runtime local est implémenté sous `packages/catalog/`. Il décrit des nœuds de page typés (`component.id` + version exacte, props strictes, slots déclarés et mouvement versionné) et valide la baseline, les propriétés, les liens internes, les données, l'unicité des IDs, huit niveaux de profondeur, 100 nœuds et 128 Ko. Le rendu utilise seulement les composants locaux admis. Le modèle ne retourne jamais du JSX ou du CSS exécutable.

La tranche de prévisualisation contient Section, Hero, Stack, Grid, Heading, Text, Button, Navigation, CloudBackground et SalesChart. SalesChart rend seulement des données synthétiques et l'annonce dans le rendu. CloudBackground v1.1 et les mouvements CSS/SVG locaux `fade-in`, `slide-up`, `slide-down`, `fade-slide-down`, `fade-slide-up` et `composed@2.0.0` sont présents dans la baseline. `composed` combine des pistes bornées d'opacité, translation X/Y, échelle, rotation et flou, avec durée (0–3000 ms), délai (0–2000 ms), easing enum, répétition (1–4) et jusqu'à six propriétés sans doublons. La recette ventes continue d'utiliser les presets historiques ; le mapping d'un texte libre vers `composed` reste à construire dans GEN-03. La vitesse commune est un multiplicateur de 0,25 à 4 qui ajuste la durée des mouvements des graphiques et le cycle de dérive des nuages, avec des minima pour éviter une animation trop rapide. `prefers-reduced-motion` neutralise les animations décoratives sauf opt-in explicite limité au canevas d'aperçu. Le seul peer runtime est React 19.3.1, déclaré dans le package et le lockfile racine. C'est une capacité locale vérifiable, pas une promesse que toute animation imaginable est déjà installée ou rendable. Une demande sans équivalent admis doit obtenir une limite ou une alternative explicite.

### Extension pour la composition en langage naturel

GEN-02 ajoute maintenant le contrat et le renderer déclaratif `composed@2.0.0`. GEN-03 doit laisser le modèle choisi traduire une description ordinaire en configuration validée sans obliger l'utilisateur à connaître un preset ou un nom de bibliothèque. Les sorties restent des opérations structurées validées par le catalogue. Cette approche élargit les designs web 2D possibles sans prétendre couvrir les shaders, simulations 3D ou effets qui exigent une bibliothèque non installée. Pour ces cas, Manifest indique précisément la capacité manquante et propose une alternative ou l'audit d'une nouvelle dépendance. Le profil Unslop formule des contraintes de qualité visuelle et une auto-revue ; il n'est ni un exécuteur de code ni une source de composants.

Le registre des bibliothèques des captures est inventorié dans le code et ce document. La découverte vient des captures utilisateur ; les noms de paquet éventuels ne sont pas confirmés, les versions installées sont nulles, les licences et sources officielles restent à vérifier, et aucune entrée tierce n'est admise. Le runtime initial n'ajoute pas de dépendance tierce. La prochaine admission exige source officielle et identifiant de paquet vérifiés, version exacte, licence et notices, compatibilité React/éditeur/export, coût et profil d'accessibilité/mouvement réduit, plus tests. Un outil d'auteur comme Blender ou Sketchfab n'est pas une dépendance navigateur ; GLTFJSX, gltf-transform, gltfpack, Draco et Meshopt sont des outils/pipelines d'assets distincts. Un moteur non retenu peut rester une référence de recherche, jamais une suggestion présentée comme installée.

Le paquet indique `NOASSERTION` parce que le dépôt n'a pas de licence de racine déclarée ; cette release locale est interne au prototype et n'est pas annoncée comme exportable/distribuable tant que la licence du code du dépôt n'est pas fixée. La release Unslop conserve l'attribution `Damir Sokolovsky (@heydamir), CC BY 4.0`; ce statut ne couvre aucune autre entrée.

## Animations

CSS natif d'abord pour les effets adaptés : transitions d'état, opacity et transform de faible amplitude. Les presets composés `fade-slide-down` et `fade-slide-up` placent l'opacité et la translation dans une même entrée, ce qui permet aux cartes graphiques de suivre le réglage d'animation de la recette. Révélation au scroll seulement si le navigateur cible est pris en charge ; fallback sans dissimulation du contenu. Un comportement interactif accessible ne doit pas être sacrifié pour revendiquer zéro JavaScript.

Les préréglages exposent durée, délai, amplitude et déclencheur dans des plages contrôlées. Pas de transition-all ni de will-change généralisé. Le mode réduit retire le mouvement non essentiel tout en maintenant les changements d'état. Une animation complexe peut justifier Motion ou GSAP ; le choix dépend du cas mesuré.

L'éditeur et le site exporté ont des budgets séparés. L'export ne contient pas Puck, les SDK fournisseurs ou le bridge MCP. Le poids de chaque bloc se mesure dans un build de référence ; LCP/INP ne s'additionnent pas à partir d'une fiche de bloc.

## Intégrations des quatre photos

Toutes les entrées sont candidates, non des compatibilités déjà certifiées. L'inventaire de code marque les bibliothèques listées dans les photos `admitted: false`, sans version installée et avec licence/source non vérifiées. M1 utilise une sélection minimale ; aucune de ces références tierces n'est nécessaire aux presets CSS actuels. Une admission ultérieure exige une release dédiée et un audit de licence pour chacune.

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

La release `unslop-informed@1.1.0` transmet au modèle neuf passes, chacune avec une consigne et un niveau (préférence, revue ou blocage), ainsi que des exceptions explicites. C'est une adaptation Manifest attribuée à Unslop, pas une exécution automatique de son outil ni une copie de son comportement complet. Les règles décrivent l'intention de conception ; le validateur n'enforce que les contraintes structurelles et celles codées dans le catalogue. La direction propre au projet (produit, caractère, univers, moments, signature et contraintes de marque) appartient à Snapshot.designBrief et se modifie par update_brief. Les choix explicites restent prioritaires s'ils ne rendent pas la page inaccessible ou dangereuse ; la préférence de mouvement réduit désactive les animations non essentielles.

Les résultats doivent être évalués sur plusieurs sujets réels. Le catalogue est accepté pour sa qualité de composition, son accessibilité et son export, pas pour le nombre d'effets ou la ressemblance avec un exemple de référence.

## Admission d'un composant nouveau

M1 n'exécute pas de source arbitraire produite pendant la frappe. Parcours ultérieur : demande -> source en environnement isolé -> dépendances autorisées -> validation et tests -> aperçu séparé sans bridge privilégié -> approbation de release -> catalogue. Les composants générés n'héritent jamais des droits du serveur ou de l'éditeur.

## Exports futurs

Chaque entrée déclare sa matrice de capacités : react, html-static, astro, vue, svelte, avec statut supported/unsupported/experimental et preuve. Une cible non admise échoue explicitement. Le format de contenu peut être réutilisé ; chaque cible exige son implémentation, ses comportements, ses assets, son build et sa recette.
