# Étude de méthode : Unslop dans Manifest

## Décision

Unslop est étudié comme méthode de conception et de critique d'un rendu réel. Manifest n'a pas de « profil Unslop » fixe, de palette universelle ou de style qu'il applique à toutes les pages. Le résultat doit découler du produit, du brief, des préférences et des contraintes de marque de la personne.

La source consultée est le skill Unslop de Damir Sokolovsky, déclaré sous licence CC BY 4.0. Ce document en synthétise les idées nécessaires au cadrage de Manifest ; il ne copie ni le skill complet, ni ses références ou ressources visuelles. Toute adaptation conserve le crédit et la licence. [Source et auteur](https://heydamir.design/unslop).

## Méthode retenue

1. Comprendre le produit, le public et le résultat demandé ; formuler une direction visuelle qui leur est propre.
2. Regarder le rendu courant dans l'aperçu et relever des problèmes concrets, plutôt que d'appliquer une liste de goûts abstraits.
3. Corriger par domaines cohérents : rythme et hiérarchie, couleurs et contraste, icônes, contenu, typographie, disposition, détails, visuels puis mouvement.
4. Garder les surfaces de contrôle calmes et investir les détails visuels dans le contenu qui porte l'identité de la page, par exemple un graphique métier ou une scène de fond décrite par l'utilisateur.
5. Rendre le résultat, le comparer au brief et aux contraintes du projet, expliquer les différences et laisser la personne ajuster ou annuler.

Ces étapes guident la génération et la revue. Elles ne font pas partie du Snapshot et ne sont pas un thème versionné à injecter obligatoirement dans chaque page.

## Application à l'architecture Manifest

```text
Brief + Snapshot courant + marque/verrous + viewport
                         │
                         ▼
      modèle explicitement sélectionné via son API
                         │
                         ▼
     opérations structurées + direction + justification
                         │
                         ▼
   validation domaine et capacités du catalogue local
                         │
                         ▼
       projection temporaire dans l'aperçu live
                         │
                         ▼
       retouche, annulation ou conservation explicite
```

Le modèle choisit les éléments pertinents depuis les références du catalogue admises. Il ne reçoit pas toutes les dépendances ni un énorme prompt de style. Le domaine refuse les références, propriétés, versions ou mouvements inconnus. Le même Snapshot validé sert à l'aperçu, à la révision et au rapport.

Le debounce produit un appel au modèle sélectionné côté serveur. Une réponse issue d'une demande antérieure ne peut pas remplacer un aperçu plus récent. L'aperçu peut montrer un candidat sans l'enregistrer comme brouillon conservé. Les appels réels utilisent l'API configurée de leur fournisseur ; tests et CI utilisent des mocks sans frais.

## Limite de l'implémentation actuelle

Le code de l'adaptateur envoie au modèle le brief, le Snapshot structuré et les capacités texte du catalogue. Il ne lui envoie ni capture du canevas rendu, ni DOM/CSS calculé, ni viewport choisi. Le modèle peut donc proposer des opérations sur les éléments déclarés, mais Manifest ne peut pas encore prétendre qu'il a inspecté visuellement le rendu, comparé des pixels ou appliqué une critique Unslop à l'image réelle. Ce retour visuel est une étape de GEN-04 à concevoir et vérifier ; toute capture devrait rester limitée au canevas utile et éviter les données sensibles du projet.

La génération reste bornée aux opérations et aux composants/mouvements de la release locale. L'appel API transforme une description en candidat de cette release ; il ne rend pas exécutables une bibliothèque non installée ni une animation arbitraire. GEN-05 étend séparément les mouvements usuels compris depuis le langage libre.

## Limite de l'hôte ChatGPT

Le bridge MCP Apps standard permet d'actualiser le contexte modèle, mais cette mise à jour ne lance pas de réponse. `ui/message` envoie un message de suivi à la conversation. Manifest ne doit donc pas en envoyer à chaque pause de frappe. L'aperçu réactif utilise l'API du fournisseur configuré ; dans ChatGPT, utiliser l'API OpenAI nécessite une clé et une facturation API distinctes de l'abonnement ChatGPT. `/validate` reste une action explicite de transfert au modèle hôte lorsqu'il est pris en charge.

Références : [guide officiel OpenAI pour l'UI MCP dans ChatGPT](https://developers.openai.com/plugins/build/chatgpt-ui), [requête MCP Apps de mise à jour de contexte](https://apps.extensions.modelcontextprotocol.io/api/interfaces/app.McpUiUpdateModelContextRequest.html), [requête MCP Apps d'envoi de message](https://apps.extensions.modelcontextprotocol.io/api/interfaces/app.McpUiMessageRequest.html).

## Non-objectifs

- Uniformiser la couleur, la typographie, les cartes ou l'animation de toutes les pages.
- Promettre toute animation imaginable indépendamment des capacités installées et auditées.
- Exécuter du code libre produit pendant la frappe.
- Confondre sélection d'un modèle, mise à jour de contexte et appel réel d'inférence.
