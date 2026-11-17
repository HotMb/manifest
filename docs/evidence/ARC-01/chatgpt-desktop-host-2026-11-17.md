# ARC-01 — observation dans ChatGPT Desktop — 17 novembre 2026

## Périmètre

Observation effectuée dans l'application ChatGPT Desktop connectée au compte de l'utilisateur. Manifest a été ouvert par son outil MCP `open_designer`, puis manipulé dans la vue embarquée. Aucun identifiant, jeton ou secret n'a été saisi, lu ou conservé.

Demande de départ : créer une carte bleue avec une entrée en fondu et un déplacement léger vers le haut. Demande de modification utilisée pour éprouver le délai :

> Crée un Hero vert avec une entrée en fondu et un glissement vers le haut. Titre : Test live. Texte : La modification fonctionne.

## Résultats observés

| Capacité | Résultat | Observation |
|---|---|---|
| Ouverture depuis ChatGPT Desktop | Réussi | La carte Manifest s'ouvre dans la conversation et charge la vue embarquée. |
| Connexion au bridge hôte | Réussi | Le pied de page affiche `Connecté à l'hôte`. La source attachée au chat est `manifest-m0`. |
| Transmission de la demande | Réussi | Le champ Manifest reçoit la demande fournie à `open_designer`, puis accepte une modification dans la vue. |
| Debounce de 1 500 ms | Réussi pour les règles locales | Après la pause, l'état passe à `Pistes locales prêtes`, deux indications sont reconnues et une proposition apparaît. |
| Modification réelle de l'aperçu | Réussi, périmètre M0 | La proposition locale est prévisualisée sous forme de `Section d'accueil`, puis conservée dans le canevas. |
| Écriture et confirmation serveur | Réussi | Après conservation, le pied de page affiche `Enregistrement confirmé par le serveur` et `Brouillon v1`. |
| Fidélité à la demande libre | Échec | Le Hero conservé reste générique (`Votre titre`, contenu d'architecture) au lieu de reprendre `Test live`, le texte demandé et l'ensemble des mouvements. |
| Appel réel à un modèle | Non exécuté | L'interface indique explicitement que la piste vient des règles locales, sans appel de modèle. |
| Identité OAuth de production | Non disponible dans cette release | Aucun contrôle de connexion OAuth n'est présent. Le connecteur chargé est `manifest-m0`, pas le paquet AUTH-01 avec OAuth/Responses. |
| `/validate` et transmission du rapport | Non exécuté | Le parcours observé ne propose que `Préparer le rapport`; l'envoi complet et son accusé restent à qualifier. |
| Fichier, stockage durable, iframe, rafraîchissement/poll et mouvement réduit | Non exécuté | Ces capacités n'ont pas été exposées ou éprouvées dans cette observation. |

## Verdict

La preuve lève le doute sur l'ouverture réelle, le bridge, le debounce local, la modification de l'aperçu et une écriture confirmée dans ChatGPT Desktop. Elle ne satisfait pas le critère complet d'ARC-01 : la génération par l'API choisie, l'identité OAuth, la fidélité de la composition libre, `/validate` et la matrice complète de capacités restent absents du connecteur réellement chargé.

ARC-01 doit rester `blocked`. La prochaine qualification doit installer ou sélectionner le build AUTH-01/GEN-03/04 dans ChatGPT Desktop, obtenir le consentement OAuth de l'utilisateur, puis répéter la demande et vérifier une proposition structurée provenant de l'API avant de tester `/validate`.
