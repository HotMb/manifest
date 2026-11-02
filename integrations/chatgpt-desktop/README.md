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
- Le ZIP ou son enregistrement privé ne suffit pas à qualifier ARC-01 : il faut constater manuellement dans Desktop le démarrage local, l'appel d'outil et le rendu de la vue.
