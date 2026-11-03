# Manifest — plugin local ChatGPT Desktop

Ce package expérimental sert à qualifier ARC-01 dans l'application ChatGPT Desktop. Il démarre le serveur MCP stdio M0 et inclut la vue HTML autonome de l'éditeur.

## Construction

Depuis la racine du dépôt, avec Node.js 24 et les dépendances du dépôt installées :

```powershell
npm run build
node integrations/chatgpt-desktop/build.mjs
Compress-Archive -Path integrations/chatgpt-desktop/dist/package/* -DestinationPath integrations/chatgpt-desktop/dist/manifest-desktop.zip -Force
```

Le ZIP est un artefact local ignoré par Git. Il ne contient ni `node_modules`, ni clé API, ni jeton. Le serveur démarre avec `node`; les dépendances serveur et le contrat M0 sont intégrés au bundle.

## Portée de l'essai

- Dans une conversation Desktop, taper `@`, choisir `Manifest`, puis envoyer « Ouvre l’éditeur Manifest ». La mention seule sélectionne le plugin; le modèle doit appeler `open_designer` pour ouvrir sa vue.
- Le serveur renvoie le prototype M0 à l'outil interactif MCP Apps `ui://design/editor.html`.
- Le prototype garde son état en mémoire et n'inclut aucune clé fournisseur. Aucun appel d'inférence n'est requis pour ouvrir l'éditeur.
- Cette voie ne crée pas une commande native `/manifest`. L'éditeur possède son propre champ de description et son aperçu réactif.
- À partir du paquet 0.1.2, `open_designer` accepte `userRequest` et `assistantProposal` (1 à 6 000 caractères chacun), plus `backgroundColor` (`#RRGGBB`, par exemple `#000000`). Le modèle hôte doit envoyer explicitement ces arguments : la mention du plugin ne donne aucun accès automatique à la conversation. Une ouverture sans arguments reste compatible et ne préremplit rien.
- Le résultat réserve `_meta.launchContext` à la vue, avec un identifiant de lancement et `baseDraftVersion`. Le transport le conserve dès la notification initiale et le rejoue à l'abonnement UI ; un résultat tardif est aussi transmis. Le fond demandé est un candidat à conserver ou ignorer, jamais une modification silencieuse du Snapshot. Aucune génération ni appel fournisseur n'est lancé par le handoff.
- Le ZIP ou son enregistrement privé ne suffit pas à qualifier ARC-01 : il faut constater manuellement dans Desktop le démarrage local, l'appel d'outil et le rendu de la vue.

Le serveur installé est un bundle stdio figé ; reconstruire les sources du dépôt ne met pas à jour la version déjà chargée. Après préparation du paquet, il faut actualiser le plugin privé existant, puis rouvrir sa vue avec la nouvelle release. Une session qui expose encore `open_designer` avec un schéma vide utilise l'ancien outil : ne pas prétendre lui avoir transmis les nouveaux arguments. Ne pas tuer tous les processus Node ni éditer directement le cache des plugins pour le rafraîchir.
