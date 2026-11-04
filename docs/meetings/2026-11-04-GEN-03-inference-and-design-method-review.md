# Revue de cadrage — génération live, méthode de design et séquence ARC-01

## Décision

Manifest doit appeler le fournisseur et le modèle explicitement choisis après le debounce, côté serveur, pour transformer le brief en proposition structurée et actualiser l'aperçu. Dans ChatGPT, le bridge MCP documenté ne fournit pas d'inférence privée déclenchée par frappe : `ui/update-model-context` met à jour le contexte sans lancer un tour ; `ui/message` envoie un follow-up à la conversation. Manifest n'enverra donc pas de message à chaque frappe. Le mode live passe par l'API configurée du modèle choisi ; `/validate` est la transmission explicite au modèle hôte.

La documentation officielle OpenAI confirme que ChatGPT et la plateforme API ont des facturations séparées : [gestion de la facturation ChatGPT et API](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform). Si l'utilisateur choisit OpenAI pour l'aperçu live, une configuration d'API distincte est donc nécessaire ; elle n'est pas fournie par l'abonnement ChatGPT.

Unslop est retenu comme méthode d'analyse/critique d'un rendu, pas comme un profil visuel versionné. Le compte rendu d'étude [UNSLOP-METHOD-ANALYSIS.md](../design/UNSLOP-METHOD-ANALYSIS.md) documente l'adaptation limitée et l'attribution.

L'ordre demandé est inscrit : GEN-02, GEN-03 (inférence API), GEN-04 (modification visible du rendu), puis qualification ARC-01 dans ChatGPT Desktop sur le parcours complet.

## État des tickets

| Révision | Ticket(s) | Changement |
|---|---|---|
| 40 | GEN-03 | Appel réel par API après pause, annulation des jobs périmés, limites host/API, critique Unslop sans profil fixe |
| 41 | GEN-04 | Aperçu direct des propositions et critères de critique contextualisée |
| 42 | CAT-03 | Release catalogue et revue de qualité, sans profil visuel stocké |
| 43 | AI-02 | Contexte du modèle fondé sur cible, marque et brief, sans profil fixe |
| 44 | ARC-01 | Dépend de GEN-03/04 ; preuve desktop exige le flux live, l'aperçu modifié et `/validate` |

Les révisions ont été produites par `team:revise`, avec patchs versionnés sous `docs/delivery/changes/`; `BOARD.md` est généré depuis le registre. Aucune transition de ticket vers `done` n'a été faite. GEN-02 reste en cours et `team:next` n'a pas de ticket supplémentaire éligible.

## Parcours cible

```text
Éditeur Manifest : brief modifié
  -> pause 1,5 s
  -> job API du fournisseur/modèle choisi
  -> opérations structurées limitées au catalogue admis
  -> validation de version, cible, propriétés, secrets et coûts
  -> projection dans le canevas central
  -> nouvel input annule/supersède le job précédent
  -> conservation explicite ou retouche
  -> /validate transmet le rapport au modèle de l'hôte
```

Une demande dépassant les capacités présentes doit produire une limite et une alternative, pas une fausse promesse « toute animation ». Les tests automatisés utiliseront des mocks ; aucune API payante ne sera sollicitée par la CI.

## Vérifications et limites

- Sources primaires consultées : [guide OpenAI de l'UI MCP dans ChatGPT](https://developers.openai.com/plugins/build/chatgpt-ui), [mise à jour de contexte MCP Apps](https://apps.extensions.modelcontextprotocol.io/api/interfaces/app.McpUiUpdateModelContextRequest.html), [message MCP Apps](https://apps.extensions.modelcontextprotocol.io/api/interfaces/app.McpUiMessageRequest.html) et [facturation distincte](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform).
- Cette revue est un alignement de cadrage et de gouvernance ; elle ne prouve pas que l'API réelle est déjà connectée. Aucun fournisseur réel n'a été appelé.
- Aucun agent distinct n'a été sollicité pour cette modification documentaire ; la revue de code et la preuve d'hôte restent requises pendant l'implémentation.
- Les tests applicatifs précédents ne sont pas relancés, car aucun code runtime n'a changé. `npm run check` et les vérifications de cohérence documentaire seront exécutés après les révisions.
- Les tentatives précédentes de loop-verify n'avaient pas rendu de verdict exploitable ; aucune nouvelle tentative n'est revendiquée pour cette mise à jour.

## Prochain jalon

Terminer la provenance/licence, les empreintes et le coût GEN-02 ; implémenter ensuite GEN-03 et GEN-04 selon ces critères. Une fois l'aperçu réellement piloté par une réponse modèle après debounce, reprendre le parcours ChatGPT Desktop d'ARC-01. L'automatisation de l'interface hôte reste interdite par le skill `computer-use` ; sa preuve devra venir d'une session observée manuellement.
