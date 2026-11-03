# Cadrage produit

## Objet et bénéficiaire

Permettre à un créateur de composer une interface web avec une IA, de voir et corriger ses choix avant de générer le projet. Premier utilisateur : le commanditaire sur ses projets réels. Évolutions possibles : développeurs, designers techniques et petites équipes. La demande commerciale n'est pas considérée comme validée.

L'outil est un atelier de composition utilisable dans ChatGPT, puis Claude, avec un cœur autonome. Il ne lit pas le champ non envoyé de l'assistant : il accepte uniquement le contexte de lancement transmis explicitement par l'hôte. L'intention de page et la recherche de composants sont deux entrées distinctes. Les suggestions de conception utilisent l'API du fournisseur sélectionné ; la recherche de catalogue reste locale et l'abonnement de l'assistant n'est pas supposé financer les appels API.

## Parcours de référence

1. Dans le chat de projet, sélectionner `@Manifest` ou l'application, puis ouvrir la carte « Ouvrir Manifest ». L'hôte peut transmettre l'identifiant du projet/page et le dernier message utilisateur envoyé comme contexte explicite. `/manifest` reste une commande native à qualifier selon l'hôte.
2. Choisir « Nouveau projet/page » ou ouvrir un projet/page existant. Si le contexte du chat contient une demande de page, Manifest la présente comme une suggestion éditable dans le champ principal ; il ne la traite pas comme un choix déjà approuvé.
3. L'espace s'ouvre sur une composition réellement vide pour un nouveau projet. Le champ principal, à gauche, décrit la page, sa logique et ses animations ; l'aperçu dominant au centre reflète les propositions. Le second champ, à droite, recherche des composants/animations du catalogue sans appeler de modèle.
4. Choisir explicitement un fournisseur et un modèle. Une fois l'analyse automatique activée pour la session, le champ principal déclenche une proposition après 1,5 seconde d'inactivité hors IME ; le modèle, le coût/usage applicable et l'état restent visibles. La recherche du catalogue ne redémarre pas cette génération.
5. Chercher par exemple « menu », puis comparer des composants qui affichent leur rendu, animation, emplacement admissible, source, version, licence et compatibilité. Prévisualiser, puis insérer à l'endroit voulu par glisser-déposer ou par une action clavier/tactile équivalente.
6. L'insertion affiche sous le champ principal une référence lisible et son identifiant stable (ID de catalogue, bibliothèque, release et configuration). Cette pièce jointe enrichit le contexte des propositions et suit le projet jusque dans le rapport, sans réécrire le texte de l'utilisateur.
7. Modifier la description ou les propriétés, observer l'aperçu réagir, puis conserver/annuler les changements. Une proposition nouvelle ne remplace pas silencieusement le dernier état conservé.
8. Taper `/validate` dans le champ principal pour figer la composition visible et produire le rapport. Si l'hôte confirme l'envoi, Manifest transmet le rapport à la conversation et rend la main au modèle ; si l'hôte ne permet pas cet envoi, il garde le rapport ouvert avec copie/téléchargement. `/validate` reste une commande Manifest, pas une commande native promise à l'hôte.
9. Le modèle hôte utilise le rapport pour générer l'application complète ; l'export Manifest reste une étape séparée et vérifiable.

La prévisualisation automatique n'est pas une approbation. Une nouvelle proposition ne détruit pas le dernier brouillon conservé. La sélection d'une proposition et ses modifications restent réversibles.

## Exigences traçables

| ID | Exigence | M1 / suite |
|---|---|---|
| RQ-01 | Ouvrir l'éditeur dans ChatGPT avec un utilisateur autorisé | M0/M1 |
| RQ-02 | Saisie propre, pause configurable, arrêt, action manuelle équivalente | M1 |
| RQ-03 | Aperçu automatique des propositions valides sans envoyer un message au chat à chaque frappe | M1 |
| RQ-04 | Modifier composition, thème, texte, images et animations locales | M1 |
| RQ-05 | Liberté de composition par primitives et blocs ; propriétés contrôlées | M1 |
| RQ-06 | Annulation, conservation et récupération après erreur | M1 |
| RQ-07 | API du modèle choisi ; absence de changement silencieux de fournisseur | M1 + M2 |
| RQ-08 | Design guidé par un profil inspiré d'Unslop, adaptable et versionné | M1 |
| RQ-09 | Pages, routes, thème commun et mises en page mobile | M1 |
| RQ-10 | Révisions immuables approuvées et restauration ; branches | M1 ; branches M2 |
| RQ-11 | Export React exécutable depuis une révision figée | M1 |
| RQ-12 | Propriétés et sections verrouillables ; respect des verrouillages par IA | M1 |
| RQ-13 | Protection des projets, ressources et clés ; contrôle des consommations | M1 |
| RQ-14 | Catalogue et ressources avec licences, versions et alternatives | M1 |
| RQ-15 | Connexion Claude ; lancement depuis Claude Code vers navigateur | M2 |
| RQ-16 | Extensions 3D, effets spécialisés et exports supplémentaires | M3 |
| RQ-17 | Préparer un rapport reproductible lié à une révision et le transmettre explicitement au chat actif | M1 |
| RQ-18 | Afficher pour chaque suggestion la raison, l'état, la bibliothèque, la version et la compatibilité utile | M1 |
| RQ-19 | Séparer l'intention de page de la recherche non IA de composants/animations ; garder leurs références dans le brief et le rapport | M1 |
| RQ-20 | Distinguer la création d'un projet/page vide de la modification d'un projet/page choisi et intégrer uniquement le contexte d'hôte transmis explicitement | M1 |
| RQ-21 | Afficher les références de catalogue ajoutées comme pièces jointes structurées sous l'intention, les inclure dans le contexte des propositions et dans le rapport sans modifier le texte libre | M1 |

## Périmètre M1

- Un propriétaire par projet ; aucune collaboration simultanée promise. Contrôle de concurrence obligatoire entre onglets.
- OpenAI comme premier adaptateur. Anthropic et Gemini restent des livraisons M2, avec contrats communs préparés en M1.
- Dix blocs et primitives de composition : voir CATALOGUE.md. Plusieurs pages simples, routes uniques, thème commun.
- Images possédées ou utilisables, texte, navigation, FAQ, liens et formulaire avec validation locale. Les envois serveur non configurés restent explicitement désactivés dans l'export.
- Animation légère et amélioration progressive ; contenu lisible avec mouvement réduit et sans moteur d'animation.
- Historique linéaire approuvé, duplication et restauration ; comparaison côte à côte. Les branches avancées ne bloquent pas M1.
- Export React/TypeScript, archive téléchargeable et manifeste. Aucun hébergement public automatique.

## Hors M1

Édition libre du code source dans le canvas, import universel de dépôts, synchronisation bidirectionnelle de modifications arbitraires, création automatique de shaders exécutables, XR/physique, marketplace, facturation publique, white-label, CMS et backend applicatif généraliste. Ces éléments ne doivent pas réapparaître comme dépendances cachées des tickets M1.

## Liberté et limites du design

L'utilisateur peut imbriquer des primitives Stack/Grid/Section, choisir des dispositions et des variantes responsive, éditer les tokens et déplacer les blocs. Le catalogue ne doit pas réduire toute page au même assemblage de sections. Une propriété non représentable est signalée comme non prise en charge ; le modèle ne simule pas une liberté inexistante.

M1 produit du React. Les interfaces de document et de catalogue déclarent leurs capacités par cible pour permettre de futurs exports ; un composant React n'est pas automatiquement réutilisable en Vue, Svelte ou HTML interactif.

## Décisions par défaut

| Sujet | Défaut proposé | Réglage |
|---|---|---|
| Pause avant analyse IA | 1 500 ms, hors composition IME | Valeur M1 ; ajuster seulement après mesure et décision produit |
| Sauvegarde du brouillon | 1 s après modification, une écriture en vol | Désactivation autorisée, état explicite |
| Analyse automatique | Déclenchée après sélection du fournisseur et activation explicite dans la session ; ensuite, propositions après pause de 1 500 ms | Arrêt immédiat, indicateur d'usage et mode manuel |
| Proposition ambiguë | Jusqu'à trois alternatives, jamais trois fournisseurs implicites | Choix utilisateur |
| Révision approuvée | Action explicite, pas une conséquence de l'autosave | Invariant |
| Langue interface | Français ; architecture localisable | Anglais ensuite |

## Rapport de transmission

Le rapport est un instantané versionné, lié à `revisionId`, empreinte du Snapshot et release du catalogue. Il accompagne la description originale d'une spécification structurée : pages et routes, composants/propriétés, thème, interactions, animations, règles responsive, références et attribution des assets, exigences d'accessibilité et de mouvement réduit, modèle/job à l'origine des suggestions, preuve d'éligibilité capturée, hypothèses et éléments non pris en charge. Il exclut les clés, jetons d'authentification et secrets. Son empreinte est calculée sur une sérialisation JSON canonique reproductible, hors état de transmission.

Le modèle affiché au moment de la transmission ne remplace pas la provenance du job qui a produit le candidat. Le rapport réutilise les mêmes règles d'éligibilité que l'aperçu afin qu'un candidat obsolète ne soit jamais présenté comme actuel. L'envoi passe par la capacité de transmission de l'hôte ; si elle est absente, le produit le dit et propose un export/copie sans prétendre que le chat a reçu le rapport.

## Validation de la valeur

Utiliser des projets réels : restaurant, portfolio et page de produit, puis un écran de suivi en M2. Comparer avec le processus actuel : délai jusqu'au design accepté, corrections manuelles, modifications inattendues, qualité perçue et utilisabilité du code exporté. Établir la mesure de référence avant de fixer des objectifs chiffrés. La présence de l'IA ou d'Unslop ne prouve ni le goût ni le gain de temps.

## Arbitrages et droits de décision

Le propriétaire produit décide des priorités et du design attendu ; le tech lead décide de l'implémentation dans les contrats approuvés ; le responsable sécurité peut bloquer une exécution non isolée ou une fuite de données ; la QA bloque une livraison ne respectant pas la recette. Un élargissement de cible ou d'export nécessite une décision enregistrée, pas une initiative isolée d'un développeur ou d'un agent.
