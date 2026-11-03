# Vérification du brief réactif et de l’aperçu — 3 novembre 2026

## Périmètre et révision

- Dépôt : `HotMb/manifest`, branche `work/arc-01`, HEAD `36fb703`.
- Vérification : code de lancement, debounce local et modèle, règles locales, contrat M0, rendu, panneau des suggestions et tests E2E existants.
- Environnement : atelier local `http://127.0.0.1:5173/` et lecture du fil Codex [Créer un tableau de bord de ventes](codex://threads/01a1a35e-f1e6-7c60-82ef-2dccb26f076e).
- Aucune clé, donnée sensible, API de modèle payante ou session visuelle réelle de ChatGPT Desktop utilisée.

## Résultat du parcours

| Étape | Résultat | Preuve dans le code ou l’observation |
|---|---|---|
| Le chat transmet le brief à Manifest | **Fonctionne pour le payload examiné.** Le second appel du fil transmet de nouveau le brief entier avec « Mabrouk Otmane » ; l’éditeur prend `assistantProposal` en priorité, sinon `userRequest`. | `services/api/src/mcp.ts:111-124`, `packages/host-adapters/src/index.ts:181-192,247-252`, `apps/editor-web/src/main.tsx:144-170` ; payload du fil cité ci-dessus. |
| Une modification du champ déclenche le délai de 1,5 s | **Inactif par défaut.** `automaticAnalysis` est initialisé à `false`, puis remis à `false` à chaque lancement reçu. Le hook affiche l’état suspendu et ne démarre pas de minuteur tant que la case n’est pas cochée. | `apps/editor-web/src/main.tsx:88,145-150,529-533`; `apps/editor-web/src/use-local-analysis.ts:25-40`; durée déclarée dans `apps/editor-web/src/manifest-analysis.ts:3`. |
| Les règles locales interprètent le texte libre | **Très limité.** Elles reconnaissent quelques couleurs, le fondu/l’absence d’animation, `Titre :` et `Texte :`, et un Hero demandé explicitement. | `apps/editor-web/src/manifest-analysis.ts:26-89`. |
| Le canevas change automatiquement après une piste locale | **Non.** Les cartes de piste exigent « Appliquer » ou « Prévisualiser la section » ; le contenu et le mouvement ne sont donc pas projetés au centre à chaque pause. | `apps/editor-web/src/main.tsx:377-416,556`. |
| Une proposition du modèle change l’aperçu | **Possible sous conditions.** Il faut un modèle sélectionné, un transport MCP compatible, l’automatique activé, un brouillon synchronisé et une proposition M0 valide. Une proposition prête est projetée en lecture seule avant conservation. | `apps/editor-web/src/use-model-suggestions.ts:74-133`; `apps/editor-web/src/main.tsx:173-194`. |
| Le dashboard de ventes demandé est représentable | **Non dans M0.** Le contrat n’autorise qu’une page, zéro ou un Hero, trois couleurs et l’animation `none` ou `fade`. Il n’y a ni graphique, ni nuage, ni source de données, ni propriété de police ou d’alignement centrée. | `packages/m0-contract/src/index.ts:8-32,75-109`; `packages/m0-contract/src/provider-http-adapter.ts:26-36`; `apps/editor-web/src/hero.tsx:7-55`. |
| Recherche à droite et ajout du composant | La recherche existe, mais le panneau présente sept démonstrations locales. Elles ne sont pas reliées à l’insertion dans le canevas. | `apps/editor-web/src/component-examples.tsx:39-47`; `apps/editor-web/src/main.tsx:554-558`. |

## Reproduction locale observée

1. À l’ouverture locale, « Analyse automatique locale » est décochée, aucun modèle n’est sélectionné et le canevas est vide.
2. Avec le texte libre « Crée un tableau de bord de ventes avec des nuages animés en arrière-plan. Affiche Mabrouk Otmane au centre en Manrope ExtraBold (800). », l’analyse locale activée manuellement et une pause de 2,2 s, l’état devient « 0 indication(s) reconnue(s) » et le canevas reste vide.
3. Avec les instructions reconnues `Fond sombre`, `Titre :`, `Texte :` et `Fondu à l’entrée`, l’analyse locale trouve des pistes après la pause. Le canevas reste inchangé jusqu’au clic sur la piste. L’aperçu Hero ainsi obtenu reste le modèle M0 générique.

Cette reproduction confirme que le délai local peut s’exécuter lorsque l’option est activée. Elle ne prouve ni un appel de modèle ni le rendu dans ChatGPT Desktop. Aucun fournisseur n’a été appelé.

## Couverture des tests

- `tests/e2e/launch-context.spec.ts` couvre le préremplissage et plusieurs cas de protection du contexte de lancement ; son scénario pendant `launchBusy` vérifie qu’aucun job ne part à ce moment-là.
- `tests/e2e/empty-start.spec.ts` couvre des pistes locales et un aperçu de modèle déterministe déclenché par action manuelle.
- Aucun scénario E2E positif ne vérifie actuellement l’enchaînement complet « modifier l’input → pause de 1,5 s → démarrage automatique du job → aperçu du candidat ».
- Les tentatives ciblées de lancement Playwright sont restées sans sortie exploitable avant la fin et ont été interrompues. **Aucun résultat PASS/FAIL n’est revendiqué pour ces tentatives.**
- Le parcours réel dans ChatGPT Desktop, l’identité OAuth réelle et un fournisseur réel ne sont pas vérifiés par cette revue.

## Conclusion

Le transport du brief reçu est cohérent pour le fil partagé. La raison immédiate de l’absence de réaction après la saisie est que le mode automatique est désactivé par défaut et explicitement désactivé à l’ouverture depuis le chat. Après activation, le moteur local ne sait pas construire le dashboard demandé et ses pistes ne mettent pas automatiquement à jour le canevas. Le contrat M0 ne peut pas rendre ces composants.

Il s’agit d’un écart entre l’expérience réactive souhaitée et le comportement opt-in livré, combiné à un périmètre de composition M0 volontairement réduit. Le travail correspondant est cadré dans UI-03, JOB-01, AI-01, CAT-01/CAT-02 et les tickets de domaine/éditeur dépendants. `npm run team:next` affiche zéro ticket éligible tant qu’ARC-01 reste bloqué ; cette revue ne contourne pas ces dépendances et ne modifie aucun statut.
