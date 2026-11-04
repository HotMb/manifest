# ARC-01 — brief de réalisation de l'éditeur minimal

Date : 1er novembre 2026. Responsable conception : agent `arc01_design_review`, rôle designer. Destinataires : frontend, backend et QA. Statut : consignes de réalisation, sans résultat de recette revendiqué.

Ce brief applique [DESIGN.md](../../DESIGN.md), [UX-CONTRACT.md](../../UX-CONTRACT.md) et [CONCEPTION.md](CONCEPTION.md). Les [contrats métier](../spec/CONTRACTS.md) et les critères d'ARC-01 restent prioritaires. Il ne crée ni nouveau format de document, ni nouveau thème normatif.

## Ce que doit prouver cette tâche

Une personne ouvre une page avec **un Hero**, sélectionne ce bloc, modifie son titre et une couleur, voit le résultat puis retrouve un état de sauvegarde exact. Le même cœur React/Puck sert au diagnostic navigateur et à la vue MCP. Seule la preuve dans le vrai hôte qualifie ce dernier.

L'objectif visuel est un atelier précis et calme : la page occupe la plus grande place, l'inspecteur explique ce qui est réglable, l'accent souligne la sélection et l'action utile. Aucun effet décoratif ne doit concurrencer le Hero. Le shell de travail conserve ses tokens même si le site passe du clair au sombre.

## Composition de départ

```text
Projet / Accueil       Aperçu ordinateur | mobile       État / Enregistrer
-----------------------------------------------------------------------
Bloc disponible       Page et Hero sélectionné          Réglages du Hero
Hero                  titre + texte de la fixture      Titre
                      zone de sélection identifiable   Texte
                      sans décoration permanente       Couleurs admises
                                                       Mouvement admis
-----------------------------------------------------------------------
Mode de connexion et retour d'erreur utiles, sans détails de protocole
```

La colonne gauche peut être réduite à l'identification du bloc en M0. N'ajouter des onglets ou un catalogue vide que s'ils remplissent une fonction réelle. Le champ d'intention, s'il est présent, conserve la saisie mais dit clairement que les suggestions IA ne sont pas connectées dans ce prototype. Aucun fournisseur, quota, progression IA ou export ne paraît opérationnel sans implémentation.

À largeur étroite, afficher l'aperçu et **un seul panneau de réglages à la fois**, avec un moyen nommé de passer de l'un à l'autre. La barre d'action peut se répartir sur deux lignes plutôt que rétrécir les contrôles essentiels. Le viewport simulé du site ne réduit pas tout le shell. Chaque région possède un défilement utile ; ne pas empiler des conteneurs qui imposent deux scrolls horizontaux.

## Contrôles et source des valeurs

| Contrôle | Comportement requis | Source / limite |
|---|---|---|
| Sélection du Hero | rend son inspecteur identifiable et accessible au clavier | état d'éditeur, absent du Snapshot exportable |
| Titre et texte | une modification met à jour le Hero immédiatement sans voler le focus | propriétés admises du bloc ; aucun HTML ou code évalué |
| Couleur de fond, texte et accent | ne modifie que les tokens explicitement admis | `Snapshot.theme`, sans changer les tokens du shell |
| Mouvement | n'expose que les valeurs réellement gérées | `none`/animation admise par le contrat ; mouvement réduit respecté |
| Ordinateur / mobile | change l'espace d'aperçu, conserve le document | état de l'éditeur, pas réécriture des règles du site |
| Enregistrer | annonce une confirmation seulement après réussite réelle | contrôleur partagé et transport actif |
| Annuler / rétablir, si livrés | groupe de document cohérent, pas touches du champ d'intention | un propriétaire canonique ; ne pas simuler un historique serveur |

Réutiliser les types et la fixture partagés convenus avec le backend. Le rendu Puck, le diagnostic navigateur et le MCP ne conservent pas trois copies concurrentes du document. Le frontend adapte seulement le transport et les états de vue.

## Libellés de connexion et de sauvegarde

| Situation réelle | Affichage proposé | Action / règle |
|---|---|---|
| Diagnostic navigateur sans backend | « Mode navigateur » et « Brouillon local » | expliquer la portée locale, aucune promesse de récupération serveur |
| Sauvegarde locale confirmée | « Enregistré dans ce navigateur » | uniquement après écriture réussie ; traiter stockage indisponible |
| Connexion MCP en cours | « Connexion à l'hôte » | ne pas désactiver arbitrairement le document déjà visible |
| Handshake MCP confirmé | « Connecté à l'hôte » | nommer ChatGPT seulement si réellement identifié |
| Écriture serveur en cours | « Enregistrement » | conserver les réglages ; éviter que deux réponses se chevauchent |
| Accusé serveur valide | « Sauvegardé » | ne remplace pas une modification locale plus récente |
| Conflit de version | « Le projet a changé dans une autre vue » | erreur persistante et reprise explicite, sans écrasement silencieux |
| Bridge indisponible / lecture refusée | cause compréhensible et capacité indisponible | réessayer si sûr ; un fallback navigateur ne devient pas une réussite MCP |

Un paramètre d'URL, une iframe ou un clic sur Enregistrer ne constitue pas une preuve de connexion ni de sauvegarde. Une erreur critique reste près de l'action concernée ; une notification éphémère seule ne suffit pas.

## Propriétaires et accessibilité à contrôler

Le contrôleur de document possède la modification et sa sauvegarde ; le transport browser/MCP ne recrée pas la logique métier. L'inspecteur et la sélection réutilisent Puck et les variantes nécessaires. Les libellés, statuts et erreurs utilisent un retour partagé. Les couleurs et espaces du shell sont dérivés de DESIGN.md par le mapping runtime, sans seconde liste de tokens.

Vérifications visuelles et interactives à joindre à la revue :

- clavier seul : choisir le bloc, régler texte/couleur, changer le viewport et enregistrer ; focus visible et conservé ;
- noms accessibles des champs et actions ; contrôle de couleur avec une valeur textuelle lisible ;
- largeur réelle étroite et zoom : aucune action cachée, texte long sans débordement essentiel ;
- contraste du Hero après réglage, contour de sélection lisible sur fond clair et sombre ;
- menus ouverts et fermés, pas seulement une capture du shell ;
- mouvement réduit : contenu immédiatement lisible et animation non essentielle supprimée ;
- attente/erreur/conflit : aucun faux succès, boutons de taille stable, saisie conservée.

La [grille M0](M0-REVIEW.md) reste à remplir avec les résultats réels. Les capacités absentes sont nommées, sans ajouter des contrôles trompeurs pour ressembler à M1.

## Sortie de conception vers la réunion

Frontend fournit le build, les parcours testés et les limites ; backend explique les garanties réellement appliquées ; QA reproduit les cas pertinents sur une version identifiée ; designer relève l'écart entre le brief et le rendu observé. L'orchestrateur tranche « terminé », « à reprendre » ou « bloqué » selon les critères du ticket et consigne les actions dans [la réunion](../meetings/README.md).

Cette remise de brief ne signifie pas que le designer a observé une interface exécutée. Les résultats de rendu, de clavier et de vrai hôte seront ajoutés dans leurs preuves, pas inventés dans ce document.
