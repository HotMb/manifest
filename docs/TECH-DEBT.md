# Registre des dettes techniques

Date d'ouverture : 1er novembre 2026. Responsable du registre : orchestrateur ; chaque dette possède son propre propriétaire. Les entrées ci-dessous proviennent des contributions réelles de la première revue ARC-01. Les défauts de sauvegarde trouvés pendant cette revue sont corrigés et testés avant intégration ; ils ne sont pas reportés comme dette acceptée.

## Ce qui constitue une dette

Une dette est un compromis d'implémentation effectivement retenu qui rend une évolution, un test ou l'exploitation plus difficile, avec une raison et une condition de sortie. Elle se distingue d'un défaut qui enfreint déjà les critères, d'un risque encore hypothétique et d'une fonctionnalité prévue pour un jalon ultérieur.

Le stockage mémoire d'un essai M0 peut être un choix de prototype adapté ; il devient une dette à lever si une fonctionnalité persistante dépend de ce compromis. Une qualification ChatGPT ou OAuth non exécutée est d'abord une preuve manquante du ticket concerné. L'absence d'une fonction M1 dans M0 ne crée pas à elle seule une dette.

## Entrées retenues

| ID | Statut | Constat et décision d'origine | Ticket / revue | Propriétaire | Impact | Critère de levée | Échéance par jalon | Preuve de clôture |
|---|---|---|---|---|---|---|---|---|
| DEBT-001 | ouverte | Types, validation du sous-ensemble M0 et hash de fixture sont maintenus à la main dans m0-contract, en complément du JSON Schema canonique ; décision de limiter l'essai à un Hero | ARC-03 / DOM-01 ; revue ARC-01 | backend | Deux représentations à maintenir lors d'une évolution du catalogue ; les tests détectent certains écarts mais ne génèrent pas les types | Produire les types et règles de catalogue depuis une source versionnée, avec fixtures de compatibilité et hash dérivé sans constante manuelle | Avant admission du catalogue M1 | — |
| DEBT-002 | ouverte | HTML autonome de qualification d'environ 2,13 Mo incluant l'éditeur et 22 fontes embarquées ; le packaging simple a été privilégié pour tester la vue | ARC-02 / UX-01 ; revue ARC-01 | frontend | Coût de transfert et d'initialisation à mesurer dans le vrai hôte ; aucune latence cible n'est encore prouvée | Mesurer le chargement réel, limiter les fontes nécessaires et qualifier le découpage/cache compatible avec l'hôte ; fixer un budget à partir de cette mesure | Avant validation de performance M1 | — |
| DEBT-003 | ouverte | Le mapping DESIGN.md vers CSS emploie un lecteur limité aux scalaires YAML entre guillemets, qui refuse les autres syntaxes | UX-01 ; revue ARC-01 | frontend | Une évolution légitime du frontmatter peut casser le build et nécessiter une adaptation du lecteur | Employer un parseur de frontmatter maintenu et valider les tokens typés sans dupliquer leurs valeurs ; ajouter fixtures du format admis | Avant extension du système de tokens M1 | — |
| DEBT-004 | ouverte | `createHeroBlock()` réutilise l'identifiant `block-hero`. Le compromis est tolérable avec zéro ou un Hero en M0, mais deux cycles suppression/réinsertion ne distinguent pas l'identité d'un objet recréé | DOM-01 / CAT-01 ; revue ARC-01 du 3 novembre 2026 | backend | Les références, l'historique et les diffs deviendraient ambigus dès qu'un projet contient plusieurs blocs ou des références durables | Générer un ID unique validé côté domaine à chaque insertion ; prouver que retries gardent le reçu initial, que les nouvelles insertions ont un ID distinct, et que undo/redo restaure l'identité d'origine | Avant ouverture du catalogue multi-blocs M1 | — |
| DEBT-005 | ouverte | Le contrat `m0-contract` importe le point d'entrée du catalogue React pour valider les pages. Types métier et rendu navigateur restent ainsi couplés au domaine M0 | DOM-01 / GEN-02 ; revue indépendante du 4 novembre 2026 | backend | Les validateurs serveur chargent React et le point d'entrée UI ; évolution du contrat ou tests d'API dépend des peer dependencies front | Séparer le manifeste, les types et le validateur purs du renderer React ; prouver que les tests du contrat s'exécutent sans importer React et que le renderer consomme uniquement les types/export purs | Avant clôture de DOM-01 | — |

Format d'identifiant : `DEBT-001`, puis incrémenter sans réutiliser un ID clôturé. Statuts : ouverte, en cours, levée ou acceptée avec justification et prochaine réévaluation. Ces dettes sont admises pour l'essai M0 uniquement. Le stockage mémoire, OAuth et les fonctions IA/export non livrées restent des limites et des travaux explicites du backlog ; ils ne sont pas présentés comme terminés.

## Règles de suivi

- Rédiger un constat précis : module, déclencheur et conséquence, avec preuve ou référence de code.
- Nommer un propriétaire et un ticket de levée ou une action traçable ; ne pas reporter une dette sous « l'équipe ».
- Décrire la condition de levée observable et le jalon limite. Une échéance calendaire n'est promise que si elle est réellement estimée et décidée.
- Réévaluer les dettes à chaque [revue de fin de tâche](meetings/README.md), surtout avant de livrer une fonctionnalité qui en dépend.
- Clôturer sur preuve, conserver la décision historique et son lien ; ne pas supprimer une dette pour améliorer artificiellement le bilan.
- Ne pas faire d'un « nettoyage technique » une refonte hors ticket. Découper la correction, ses dépendances et ses critères dans le backlog.

Les défauts bloquants sont corrigés avant clôture du ticket, ou motivent un verdict « à reprendre » / « bloqué ». Un risque ou une capacité hors périmètre est suivi dans son ticket ou la réunion, sans être travesti en dette technique.
