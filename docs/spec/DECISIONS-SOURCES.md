# Décisions, qualifications et sources

État mis à jour le 4 novembre 2026. Ce dossier est une proposition de contrats à implémenter et éprouver. Il ne reprend pas comme autorité les affirmations d'une autre IA ; les décisions techniques s'appuient sur la demande utilisateur et les sources primaires ci-dessous.

## Décisions retenues

| ADR | Décision | Motif / contrepartie |
|---|---|---|
| ADR-01 | propre champ dans vue embarquée | satisfait le design dans l'assistant sans accès au brouillon natif |
| ADR-02 | cœur autonome, ChatGPT qualifié dès M0 | portabilité sans repousser le parcours demandé |
| ADR-03 | monolithe modulaire + worker isolé | réduit coordination et complexité initiales ; frontières de build nécessaires |
| ADR-04 | composition Puck inline dans un Snapshot | réutilise l'éditeur et le rendu ; catalogue strict et migrations requis |
| ADR-05 | snapshots séparés de l'historique | évite les copies récursives de révisions |
| ADR-06 | propositions sans mutation automatique serveur | protège le brouillon ; conservation et édition manuelle sur candidat explicitement définies |
| ADR-07 | commandes atomiques versionnées et idempotentes | empêche écritures partielles, courses et doubles effets |
| ADR-08 | jobs courts à démarrer, poll via bridge M1 | transport portable ; latence/charge à éprouver avant SSE direct |
| ADR-09 | un contrat d'inférence commun avec adaptateurs API par fournisseur | le modèle explicitement choisi traite le brief ; chaque API est configurée et facturée indépendamment, sans inférence cachée via l'hôte |
| ADR-10 | export React contrôlé, autres cibles qualifiées séparément | fidélité mesurable avant élargissement |
| ADR-11 | catalogue approuvé, pas de code arbitraire en frappe M1 | garde la vue et ses droits hors de portée du code généré |
| ADR-12 | méthode de revue inspirée d'Unslop, sans profil fixe ; choix de marque préservés | suggestions adaptées au produit et critique de l'aperçu réel, sans uniformiser les pages |
| [ADR-13](../adr/0002-manifest-workspace-and-handoff.md) | atelier en trois zones, attente de 1,5 s et rapport lié à une révision ; invocation fiable via mention/carte, `/manifest` et `/validate` restent à qualifier comme alias | reprend les captures de référence validées ; distingue le champ propre de Manifest du compositeur hôte et sépare prévisualisation, approbation, rapport et transmission |

## Points de qualification, responsables et sortie

| Point encore à éprouver | Responsable | Preuve / ticket |
|---|---|---|
| versions exactes React/Puck/SDK, packaging et slots | tech lead | lockfile + installation/build propres, ARC-02 |
| Puck dans la taille réelle de la vue, focus et iframe interne | frontend/MCP | parcours M0, ARC-01 |
| autorisation OAuth et origine des ressources | backend/plateforme | tokens valides/invalides et matrice réseau, ARC-01/02 |
| transfert de fichiers de l'hôte et stockage local disponible | frontend/MCP | capacité observée ou fallback navigateur documenté |
| modèle initial, schéma supporté et usage renvoyé | backend IA | suite de conformité + essai plafonné, AI-01 |
| budgets, timeout et limites des builds | plateforme/QA | baseline et tests de dépassement, EXP-02 |
| qualité du catalogue et contrôle perçu des suggestions | produit/design | briefs réels et protocole QA, CAT-02/AT-25 |
| ouverture réelle de la vue, alias slash, fallback navigateur et transmission du rapport | frontend/MCP + QA | qualification ChatGPT Desktop, état d'hôte et résultat d'envoi ; ARC-01 et recette UX |
| provenance immuable de l'analyse dans le rapport | frontend | proposer l'origine capturée par le job/proposal et partager le prédicat d'éligibilité de l'aperçu ; correction M0 à faire avant transmission réelle |
| licences de sources et redistribution | catalogue/responsable produit | manifeste et vérification avant admission, CAT-03 |
| RPO/RTO, rétention avant ouverture publique | plateforme/produit | exercice de restauration et décision OPS-01 |

Un point non résolu bloque uniquement la capacité correspondante. Il ne justifie ni d'inventer une disponibilité ni de refaire arbitrairement toute l'architecture. Les décisions modifiées passent en ADR avec raison, impact contrats, migration et tests.

## Sources primaires consultées

| Référence | Utilisation dans ce dossier |
|---|---|
| [UI ChatGPT / MCP Apps](https://developers.openai.com/plugins/build/chatgpt-ui) | ressource UI, bridge, appels de suivi explicites et séparation outils de données/rendu |
| [Extensions de plugins ChatGPT](https://developers.openai.com/plugins/build/extensions) | capacités d'ouverture d'app, panneau de conversation, mention du compositeur et transmission au fil selon l'extension supportée |
| [Plugins dans ChatGPT](https://help.openai.com/en/articles/20001256-plugins-in-chatgpt) | sélection explicite par `@` ou le sélecteur ; limites variables selon hôte/espace |
| [Cycle MCP Apps](https://apps.extensions.modelcontextprotocol.io/api/documents/overview.html) | initialisation Vue -> Hôte, capacités et cycle |
| [CSP / CORS](https://apps.extensions.modelcontextprotocol.io/api/documents/csp-and-cors.html) | domaines nécessaires à la vue, origine dépendante de l'hôte |
| [Autorisation](https://apps.extensions.modelcontextprotocol.io/api/documents/authorization.html) | protection OAuth serveur/outil |
| [Contexte modèle](https://apps.extensions.modelcontextprotocol.io/api/interfaces/app.McpUiUpdateModelContextRequest.html) | met à jour le contexte ; ne déclenche pas une réponse/inférence |
| [Message UI MCP Apps](https://apps.extensions.modelcontextprotocol.io/api/interfaces/app.McpUiMessageRequest.html) | message utilisateur visible dans le fil, réservé aux actions explicites comme `/validate` |
| [Config Puck](https://puckeditor.com/docs/integrating-puck/component-configuration) | éditeur et rendu à partir de données/config |
| [Slots Puck](https://puckeditor.com/docs/api-reference/fields/slot) | emboîtement inline de ComponentData |
| [Migration vers slots](https://puckeditor.com/docs/guides/migrations/dropzones-to-slots) | ne pas maintenir un ancien zones global parallèle |
| [OpenAI : sorties structurées](https://developers.openai.com/api/docs/guides/structured-outputs) | schémas compatibles par modèle et streaming |
| [Anthropic : sorties structurées](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) | qualification de l'adaptateur M2 |
| [Gemini : sorties structurées](https://ai.google.dev/gemini-api/docs/structured-output) | qualification de l'adaptateur M2 |
| [RFC 8785 — JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785) | sérialisation canonique utilisée pour reproduire l'empreinte du rapport |
| [Registre shadcn](https://ui.shadcn.com/docs/registry/registry-item-json) | sources et dépendances ; métadonnées d'éditeur en plus |
| [Motion : migration](https://motion.dev/docs/upgrade-guide) | normalisation Motion One / Framer Motion |
| [R3F : introduction](https://r3f.docs.pmnd.rs/getting-started/introduction) | compatibilité des versions React et R3F |
| [Tailwind : détection](https://tailwindcss.com/docs/detecting-classes-in-source-files) | classes complètes ou génération explicite ; pas de concaténation invisible au build |
| [React : rendu statique](https://react.dev/reference/react-dom/server/renderToStaticMarkup) | HTML statique ne conserve pas automatiquement l'interactivité |
| [Animations et performance](https://web.dev/articles/animations-and-performance) | propriétés animées et mesure |
| [Web Vitals](https://web.dev/articles/vitals) | distinction conditions et mesures de qualité |
| [Règles des plugins](https://developers.openai.com/plugins/plugin-guidelines) | limites de commercialisation et données sensibles ; à revérifier avant diffusion |

Méthode de design : skill local Unslop par Damir Sokolovsky (@heydamir), déclaré CC BY 4.0. Le dossier décrit une adaptation et conserve l'attribution ; il ne contient pas l'intégralité du skill ni ses ressources visuelles. Référence auteur : [Unslop](https://heydamir.design/unslop).

Les documentations évoluent. Le ticket ARC-02 doit consigner versions de SDK, date et comportement vérifié ; une URL ou une relecture ne remplace pas un test d'intégration.
