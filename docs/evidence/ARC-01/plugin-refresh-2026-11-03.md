# Rafraîchissement du paquet privé ChatGPT Desktop — 3 novembre 2026

## Portée

Le manifeste de l'intégration passe de `0.1.0` à `0.1.1` dans le commit `b25fe96` (`chore(ARC-01): version private desktop package`). Le ZIP a été reconstruit depuis le build local, contrôlé puis utilisé pour actualiser le plugin privé existant. Aucun fichier source de l'éditeur n'a changé dans ce rafraîchissement.

## Vérifications observées

- `npm run package:desktop-plugin` : réussi ; build autonome et paquet local produits.
- `npm run smoke:desktop-plugin` : réussi ; serveur MCP stdio démarré, outils `open_designer`, `read_project`, `commit_commands` et `get_provider_registry` déclarés ; ouverture d'un nouveau brouillon M0 vide et ressource HTML autonome de 2 222 184 octets.
- ZIP local : SHA-256 `09D2407ED85CE67FB1D54A51555132C8A85174D7F1B260AD47614383163FE72A`.
- Plugin Creator : mise à jour confirmée en version `0.1.1`, portée utilisateur et visibilité `PRIVATE`. Le manifeste, `mcp.json` et `BUILD.txt` de la release correspondent au paquet local ; les tailles des fichiers volumineux sont cohérentes.
- Revue distincte de `/root/arc01_code_review` : version source et package concordants. Les octets/empreintes des deux fichiers volumineux à distance ne sont pas exposés par l'API de métadonnées, donc leur identité binaire exacte n'a pas pu être comparée.

## Limites et suite

Ce résultat qualifie le paquet et son serveur local. Il ne prouve pas le rendu dans ChatGPT Desktop, l'identité OAuth, les capacités de l'hôte, ni le retour au chat. L'interface embarquée reste le build existant : le deuxième champ de recherche catalogue, les cartes de composants avec provenance, le glisser-déposer et la transmission `/validate` ne sont pas livrés.

Le registre local demeure à la révision 9 et ARC-01 demeure `blocked`. Aucun ticket M1 dépendant ne devient éligible par cette mise à jour. La prochaine preuve attendue est une ouverture manuelle de la version privée 0.1.1 dans ChatGPT Desktop, avec capture du résultat ou de l'erreur et sans jeton ni secret.
