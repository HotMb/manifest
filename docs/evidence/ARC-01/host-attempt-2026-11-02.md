# Tentative d'accès au vrai hôte — ARC-01 — 2 novembre 2026

## Cible et portée

- Branche : `work/arc-01-qualification`.
- Révision examinée : `3694f2ea63f1af1868e5cf05704a518931599210`.
- Cible : connexion du serveur de qualification à ChatGPT depuis ce poste.
- Ce document distingue une vérification du processus MCP local d'une exécution dans ChatGPT.

## Vérification exécutée

Un client du SDK MCP a lancé le vrai processus configuré par le dépôt, `node --import tsx services/api/src/main.ts --stdio`, puis a effectué l'initialisation MCP, `tools/list`, `tools/call` sur `open_designer` et `resources/read` sur `ui://design/editor.html`.

Résultat observé :

- Le processus a répondu au SDK et a écrit son message de démarrage sur stderr.
- Quatre outils de base ont été découverts : `open_designer`, `read_project`, `commit_commands` et `get_provider_registry`.
- `open_designer` a réussi sur le projet `project-m0`, brouillon version 0, stockage `memory-m0`.
- La ressource est revenue en `text/html;profile=mcp-app`, taille 2 198 119 octets.
- Aucun fournisseur n'était configuré dans ce processus. Aucun outil d'inférence n'a été appelé et aucun appel payant n'a eu lieu.

Cette vérification prouve le transport stdio et la ressource empaquetée dans ce processus local. Elle ne prouve ni le chargement de l'interface dans ChatGPT, ni l'initialisation Vue-vers-Hôte par ChatGPT, ni une lecture liée à l'identité réelle.

## Accès à ChatGPT et tunnel

- `tunnel-client` n'est pas installé ou disponible dans le `PATH` de ce poste.
- La variable `CONTROL_PLANE_API_KEY` n'est pas définie. Seule sa présence a été vérifiée ; aucune valeur de secret n'a été lue.
- Aucun `tunnel_id`, accès aux paramètres de tunnel, permission d'usage, permission MCP du workspace ni plan ChatGPT n'a été vérifié.
- Aucun réglage ChatGPT/Platform n'a été modifié et aucun secret ou identifiant n'a été demandé ni envoyé.
- L'interface de l'application ChatGPT n'a pas été automatisée : le skill `computer-use` interdit explicitement l'automatisation de l'UI de l'application ChatGPT. Il ne fournit pas d'alternative navigateur utilisable dans cette session.

La documentation OpenAI consultée indique que ChatGPT ne se connecte pas directement à un serveur MCP local. Le chemin local prévu est Secure MCP Tunnel : il faut un `tunnel_id`, une clé runtime pour `tunnel-client`, le client qui tourne sur le poste et un tunnel associé au bon workspace/organisation avec les permissions requises. La doc confirme que le tunnel peut lancer un serveur MCP local en stdio : le protocole de `main.ts` n'a pas besoin d'être converti en HTTP pour ce chemin. L'ajout d'un serveur MCP personnalisé reste aussi soumis aux droits du workspace. Le support complet d'actions d'écriture est limité aux offres Business et Enterprise/Edu selon la documentation actuelle.

La page officielle de connexion d'un MCP personnalisé indique d'utiliser ChatGPT sur le Web. Les « site tools » de l'application desktop sont une fonction distincte basée sur WebMCP, disponible dans son navigateur intégré sur un site qui expose ces outils ; ce n'est pas le flux générique de connexion du serveur MCP personnalisé/tunnel. L'essai visé par le ticket doit donc avoir lieu dans ChatGPT Web sur ce PC, sauf si le commanditaire change le périmètre du host.

- [OpenAI Help — Connexion de serveurs MCP personnalisés à ChatGPT](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)
- [OpenAI API — Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)
- [OpenAI API — Ajouter un serveur MCP personnalisé](https://developers.openai.com/api/docs/guides/custom-mcp-server)
- [OpenAI Help — Outils de site dans l'application ChatGPT desktop](https://help.openai.com/en/articles/20001423)

Ces exigences documentaires sont des prérequis de chemin. Elles ne prouvent pas les droits ou l'offre du compte de l'utilisateur.

## Critères ARC-01 encore non exécutés dans le vrai hôte

- Ouverture, rafraîchissement et modification du Hero dans ChatGPT.
- Initialisation réelle du bridge, lecture avec identité autorisée et rejet d'une identité invalide.
- Clavier, largeur réelle, poll court, stockage, fichier, iframe et matrice des capacités de l'hôte.
- Sauvegarde vérifiée depuis l'hôte.

Les parcours Chrome locaux rapportés antérieurement restent une preuve distincte et ne remplacent aucune de ces observations.

## Résultat

**ARC-01 reste bloqué.** Le handshake local réussit ; la connexion à ChatGPT et la preuve d'identité restent non exécutées. Le code stdio est compatible avec le mécanisme de tunnel documenté ; la suite dépend de l'accès autorisé au bon workspace ChatGPT Web et à un Secure MCP Tunnel opérationnel. Le commanditaire doit confirmer ce host, son workspace/offre et ses droits de tunnel. Ne pas modifier l'état du ticket tant que les critères hôte et identité ne sont pas prouvés.
