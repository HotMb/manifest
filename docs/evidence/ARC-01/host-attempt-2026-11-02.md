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
- L'interface de l'application ChatGPT n'a pas été automatisée : le skill `computer-use` interdit explicitement l'automatisation de l'UI de l'application ChatGPT.

La documentation OpenAI consultée indique que ChatGPT ne se connecte pas directement à un serveur MCP local. Le chemin local prévu est Secure MCP Tunnel : il faut un `tunnel_id`, une clé runtime pour `tunnel-client`, le client qui tourne sur le poste et un tunnel associé au bon workspace/organisation avec les permissions requises. La doc confirme que le tunnel peut lancer un serveur MCP local en stdio : le protocole de `main.ts` n'a pas besoin d'être converti en HTTP pour ce chemin. L'ajout d'un serveur MCP personnalisé reste aussi soumis aux droits du workspace. Le support complet d'actions d'écriture est limité aux offres Business et Enterprise/Edu selon la documentation actuelle.

La page officielle de connexion d'un MCP personnalisé indique d'utiliser ChatGPT sur le Web. Après cette première tentative, le commanditaire a confirmé qu'il veut garder l'application desktop comme cible. Cette cible reste possible par deux chemins distincts, qui ne sont pas encore qualifiés :

1. **Site tools / WebMCP dans le navigateur intégré.** ChatGPT desktop peut découvrir les outils WebMCP de la page ouverte et travailler sur son état courant. La disponibilité dépend du compte, du modèle choisi et de la page. Le dépôt ne contient actuellement aucune intégration `navigator.modelContext`/WebMCP. Une évolution vers ce chemin demande un adaptateur WebMCP et une mise à jour des critères MCP Apps d'ARC-01 ; rien n'a été modifié sur cette base.
2. **Plugin desktop avec MCP local stdio.** Le mode stdio existant correspond au type de serveur documenté, mais les soumissions MCP locales sont réservées aux partenaires approuvés et nécessitent une allowlist d'organisation ainsi qu'une vérification développeur/entreprise. Aucune éligibilité n'est connue pour l'organisation du commanditaire.

ChatGPT Sites est aussi disponible dans l'application desktop et peut héberger un plugin MCP, sous réserve des droits de création/publishing de Site et de plugin. Les tunnels privés pour Sites sont en déploiement sur les workspaces Enterprise éligibles. Cette voie n'a pas été testée et n'est pas assimilée au bridge MCP Apps actuel.

- [OpenAI Help — Connexion de serveurs MCP personnalisés à ChatGPT](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)
- [OpenAI API — Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)
- [OpenAI API — Ajouter un serveur MCP personnalisé](https://developers.openai.com/api/docs/guides/custom-mcp-server)
- [OpenAI Help — Outils de site dans l'application ChatGPT desktop](https://help.openai.com/en/articles/20001423)
- [OpenAI Developers — Soumettre un plugin desktop-only avec MCP local](https://developers.openai.com/plugins/deploy/desktop-only)
- [OpenAI Help — Héberger un plugin avec ChatGPT Sites](https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites)
- [OpenAI Help — Tunnels pour les services privés des ChatGPT Sites](https://help.openai.com/en/articles/20001606-connecting-chatgpt-sites-to-private-services-with-tunnels)

Ces exigences documentaires sont des prérequis de chemin. Elles ne prouvent pas les droits ou l'offre du compte de l'utilisateur.

## Critères ARC-01 encore non exécutés dans le vrai hôte

- Ouverture, rafraîchissement et modification du Hero dans ChatGPT.
- Initialisation réelle du bridge, lecture avec identité autorisée et rejet d'une identité invalide.
- Clavier, largeur réelle, poll court, stockage, fichier, iframe et matrice des capacités de l'hôte.
- Sauvegarde vérifiée depuis l'hôte.

Les parcours Chrome locaux rapportés antérieurement restent une preuve distincte et ne remplacent aucune de ces observations.

## Résultat

**ARC-01 reste bloqué.** Le handshake local réussit ; la connexion à ChatGPT et la preuve d'identité restent non exécutées. Le commanditaire maintient la cible desktop. Prochaine étape : vérifier manuellement si Site Tools/WebMCP sont disponibles dans son navigateur ChatGPT desktop, puis choisir entre l'adaptateur WebMCP et l'accès de partenaire requis pour un plugin local stdio. Aucun critère n'est réputé satisfait par cette découverte documentaire.
