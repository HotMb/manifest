# ADR-0002 — Espace Manifest et transmission d'une version

- Statut : accepté par le commanditaire le 2 novembre 2026
- Décideur produit : commanditaire
- Enregistré par : orchestrateur
- Sources : captures de référence fournies dans le chat et revue de direction du 2 novembre 2026

## Contexte

Le parcours cible commence dans un chat ChatGPT, ouvre Manifest, laisse l'utilisateur décrire une page et ses interactions dans un champ propre, puis montre les changements dans un aperçu vivant. Les captures de référence séparent clairement le champ, la page compilée et les suggestions. Le commanditaire souhaite ensuite versionner l'état présenté et transmettre au chat les informations nécessaires pour poursuivre la génération de l'application.

Les extensions ChatGPT documentent la sélection/mention d'applications, les panneaux interactifs et des capacités de transmission. La documentation consultée ne garantit pas une commande slash native personnalisée dans le compositeur. L'application doit donc présenter un chemin d'ouverture explicite et ne pas confondre la saisie dans Manifest avec le texte non envoyé du chat.

## Décision

1. Le shell Manifest reste sombre. L'espace desktop comporte trois zones : intention à gauche, aperçu de page dominant au centre, suggestions à droite. L'aperçu vide commence sur un canevas clair, sans imposer ce thème à la page créée. Le rail de suggestions peut se replier ; les formats Desktop/Tablette/Mobile changent le viewport simulé.
2. Les captures guident la palette : cyan pour actions/sélection et violet comme accent de certaines suggestions. Les valeurs de tokens actuelles sont des approximations à vérifier en contraste au ticket UX-01.
3. Le parcours ChatGPT affiche une carte « Ouvrir Manifest ». La sélection/mention `@Manifest` est le chemin fiable documenté. `/manifest` et `/validate` restent des alias d'intention possibles si l'hôte les route, sans promesse de commandes slash natives.
4. L'analyse réactive attend 1 500 ms sans frappe, hors composition IME, après activation explicite de l'automatique ou via l'action manuelle. L'API du fournisseur choisi est appelée côté backend ; les crédits ou secrets internes de l'assistant hôte ne sont pas supposés accessibles.
5. Le catalogue filtre les candidats par capacités, cible, compatibilité, version et licence avant classement/explication par modèle. Une suggestion est d'abord prévisualisée, puis ajoutée explicitement ; aucune dépendance inconnue n'est exécutée.
6. « Valider la version » crée une révision immuable. « Préparer le rapport » affiche un manifeste lié au hash, à la release et à la preuve d'éligibilité capturée ; son hash utilise la sérialisation canonique JCS/RFC 8785. L'utilisateur le relit, puis clique « Transmettre au chat ». Le rapport préserve la provenance exacte du job/proposal, exclut les secrets, et n'est jamais attribué au modèle sélectionné après coup. L'éditeur reste ouvert.

## Conséquences

- Les descriptions visuelles et comportements canoniques sont répartis dans DESIGN.md, UX-CONTRACT.md, docs/design/CONCEPTION.md, docs/spec/PRODUCT.md, CATALOGUE.md, ARCHITECTURE.md et CONTRACTS.md.
- Les exigences de rapport et de catalogue sont associées à REV-01, UI-02/03/04, AI-01/02 et TEST-01 dans le cadrage. Les critères du registre machine seront modifiés par le processus prévu avant la prise d'un ticket concerné.
- Le prototype M0 reste partiel. La direction ne prouve ni l'ouverture dans le vrai ChatGPT Desktop, ni le slash natif, ni l'envoi réel du rapport.
- La revue a trouvé un défaut M0 : le rapport déduit la provenance du sélecteur courant et pas du candidat capturé. Il doit être corrigé avant la première transmission réelle ; le statut d'ARC-01 ne change pas.
- ARC-01 demeure bloqué par l'essai Desktop et l'identité réels. Aucun ticket ni statut du backlog machine n'est modifié par cette décision.

## Alternatives examinées

- Remplacer les trois zones par un chat à côté d'une vignette : écart avec les captures et trop peu d'espace pour l'aperçu réel.
- Exécuter du code arbitraire à chaque pause : refusé ; le moteur utilise les composants et dépendances approuvés du catalogue.
- Transmettre immédiatement à la commande sans revue : refusé ; la révision et son rapport restent vérifiables avant l'envoi.
- Promettre `/manifest` comme commande d'hôte : refusé tant que la disponibilité n'est pas prouvée dans ChatGPT Desktop.
