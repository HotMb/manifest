# Grille de qualification conception M0

**Modèle à remplir. Aucun test ni résultat n'est déclaré exécuté dans cette grille.** La recette porte sur un seul bloc dans le vrai hôte ChatGPT. Références : [brief de conception](CONCEPTION.md), [DESIGN.md](../../DESIGN.md), [UX-CONTRACT.md](../../UX-CONTRACT.md) et [ARC-01/02](../spec/DELIVERY.md).

## Identification de la session

| Champ | À renseigner |
|---|---|
| Date, personne et agent responsables | — |
| Ticket et commit | — |
| Hôte et version observée | — |
| Navigateur / système / dimensions réelles de la vue | — |
| Versions React / Puck / SDK bridge / runtime | — |
| Catalogue de test et Hero utilisé | — |
| Source de proposition : simulation ou API réelle | — |
| Compte de test / mode d'identité, sans token ni clé | — |
| Lien vers captures, enregistrement et logs expurgés | — |

Employer uniquement les verdicts « réussi », « échoué », « non exécuté » et « non applicable, raison ». Le verdict initial de toutes les lignes est « non exécuté ». Une capture n'est pas suffisante pour valider un comportement interactif.

## Observations et preuves

| ID | Vérification | Attendu | Verdict initial | Preuve / anomalie |
|---|---|---|---|---|
| M0-D01 | Ouvrir la vue depuis ChatGPT | éditeur visible, projet lisible, entrée propre ; pas d'accès au champ natif | non exécuté | — |
| M0-D02 | Charger et sélectionner un Hero | un seul bloc, sélection identifiable, réglages associés | non exécuté | — |
| M0-D03 | Modifier titre et couleur admise | résultat immédiat dans l'aperçu ; état de sauvegarde exact | non exécuté | — |
| M0-D04 | Appel de lecture autorisé via bridge | retour réel du serveur ; initialisation Vue vers Hôte observée | non exécuté | — |
| M0-D05 | Tester une identité invalide | refus explicite, contenu non divulgué, solution de reconnexion | non exécuté | — |
| M0-D06 | Saisir rapidement puis marquer une pause | un départ au délai prévu, input disponible ; aucune requête par frappe | non exécuté | — |
| M0-D07 | Tester composition IME et Enter | pas de départ en pleine composition ; Enter ajoute une ligne | non exécuté | — |
| M0-D08 | Retarder A puis saisir B | A devient inéligible ; son retour ne remplace pas B | non exécuté | — |
| M0-D09 | Arrêter puis reprendre | état visible exact ; aucune reprise fournisseur implicite | non exécuté | — |
| M0-D10 | Prévisualiser et refuser une proposition de test | candidat identifié ; dernier brouillon inchangé | non exécuté | — |
| M0-D11 | Régler un candidat éligible | promotion + réglage dans un lot, ou capacité marquée non implémentée | non exécuté | — |
| M0-D12 | Provoquer attente et erreur de lecture/poll | dimensions et focus stables ; erreur exploitable, aucun pourcentage fictif | non exécuté | — |
| M0-D13 | Réouvrir ou rafraîchir | document confirmé retrouvé, aucune compatibilité supposée de stockage local | non exécuté | — |
| M0-D14 | Réduire la largeur réelle de l'hôte | un panneau latéral à la fois ; champ, aperçu et action atteignables | non exécuté | — |
| M0-D15 | Naviguer sans souris, ouvrir les menus | labels et focus visibles, ordre cohérent, fermeture et retour du focus | non exécuté | — |
| M0-D16 | Zoom et clavier virtuel si appareil disponible | cible active non masquée ; limites de l'hôte consignées | non exécuté | — |
| M0-D17 | Texte très long, police tardive et mouvement réduit | contrôles stables, contenu lisible, mouvement non essentiel supprimé | non exécuté | — |
| M0-D18 | Comparer éditeur et thème du Hero | tokens séparés ; sélection réservée à l'éditeur | non exécuté | — |
| M0-D19 | Tester un verrou si présent dans le spike | intention IA ne le lève pas ; absence de capacité consignée | non exécuté | — |
| M0-D20 | Observer fichiers, origine et iframe | capacité disponible ou limite documentée ; pas de contournement implicite | non exécuté | — |

Les lignes de comportement avancé préparent M1 et peuvent rester non implémentées en M0. La sortie obligatoire d'ARC-01 reste : ouverture réelle, un bloc modifiable, lecture autorisée et refus d'identité, focus/clavier, dimensions, poll court et matrice des capacités. ARC-02 clôt séparément le verrouillage des versions et la stratégie d'identité. Ne pas clôturer ces tickets sur la seule préparation de cette grille.

## Matrice des capacités de l'hôte

| Capacité | Observée / absente / non testée | Preuve et impact |
|---|---|---|
| Taille intégrée et modes d'affichage | non testée | — |
| Focus et raccourcis Puck dans la vue | non testée | — |
| Aperçu interne sans iframe | non testée | — |
| Iframe interne si nécessaire | non testée | — |
| Poll d'un job via outils de la vue | non testée | — |
| Stockage local disponible et isolé | non testée | — |
| Transfert de fichiers depuis l'hôte | non testée | — |
| Téléchargement ou ouverture autorisée d'archive | non testée | — |
| Thème imposé par l'hôte / contrastes | non testée | — |

## Diagnostic navigateur autonome

À utiliser pour isoler un problème de composant, de focus ou de réseau, avec le même cœur partagé. Consigner séparément son URL de test, sa version et ses résultats. Une réussite autonome ne transforme aucune ligne ChatGPT « non exécuté » ou « échoué » en réussite. Si une capacité manque, l'équipe décrit le repli explicite et son effet sur le parcours avant d'élargir le développement.

## Décision de fin de revue

| Élément | À renseigner |
|---|---|
| Preuves obligatoires d'ARC-01 réunies | — |
| Preuves complémentaires d'ARC-02 réunies | — |
| Anomalies bloquantes et tickets associés | — |
| Limites acceptées, motif et responsable | — |
| Prochaine capacité prête et propriétaire | — |
| Décision de l'orchestrateur / tech lead / produit | non prise |

La revue de conception ne remplace pas les tests de domaine, d'autorisation, de coût ou de fidélité d'export. Ces preuves ont leur propre ticket et restent nécessaires pour M1.
