# ARC-01 — premier incrément de développement

Date : 1er novembre 2026. Branche : `work/arc-01-qualification`. Cette preuve décrit le lot local ; elle ne clôture pas les critères exigeant le vrai hôte.

## Livré

- Un éditeur React/Puck, une page et un Hero ; contenu, trois couleurs, mouvement léger, viewport mobile, annuler/rétablir.
- Un seul Snapshot partagé et les commandes manuelles canoniques du sous-ensemble M0 ; aucune IA ou fonction d'export simulée.
- Deux adaptateurs : diagnostic navigateur et bridge MCP Apps officiel. Un échec d'hôte ne passe jamais silencieusement en mode local.
- Sauvegarde explicite, contrôle de version, reçu d'idempotence, conflit entre vues, récupération JSON et reprise explicite d'un document expiré.
- Serveur MCP avec trois outils, ressource UI autonome et stockage mémoire ; transport HTTP local protégé par bearer, Host/Origin et limite de corps ; transport stdio direct.
- Règles de réunion après chaque tâche, registre de dettes et critères de reprise conservés dans Git.

Les références de catalogue/politique de la fixture restent fictives. Le serveur n'offre pas de persistance multi-utilisateur, d'OAuth de production ou de modèle connecté.

## Vérifications

| Vérification | Preuve et portée |
|---|---|
| TypeScript et build | `npm run typecheck` et `npm run build` réussis sur les workspaces ; Vite conserve des avertissements de directives use-client provenant de dépendances, sans les masquer |
| Domaine et MCP | `tests/m0-backend.test.ts` : SDK réel, découverte, métadonnées, CAS, rejouabilité, validation, lots atomiques, verrous et refus HTTP |
| Adaptateurs | `packages/host-adapters/test/adapter.test.ts` : file mémoire, verrou local, reçus, récupération, intégrité et erreurs |
| Vrai bundle | `tests/m0-bundle.test.ts` lit le véritable HTML construit à travers MCP et vérifie le packaging autonome |
| Interface | [ui-qa.md](ui-qa.md) : huit parcours Chrome locaux, dont conflit, clavier, expiration et sauvegarde incertaine |
| Contrats et outillage | contrôles de schéma/OpenAPI, exemples, cas invalides et suivi de tickets ; ils ne prouvent pas un rendu dans ChatGPT |
| Relecture supplémentaire | [review.md](review.md), avec corrections et limites de couverture |

Les commandes de reproduction sont dans [START.md](../../START.md). Le build précède les tests M0. Le transport HTTP et le navigateur ont nécessité l'autorisation habituelle du serveur local dans cet environnement Windows ; aucun appel de modèle payant n'a été effectué.

## Démonstration conservée

[Éditeur desktop](screenshots/desktop.png) · [Réglages sur mobile](screenshots/mobile-settings.png) · [Reprise d'un brouillon expiré](screenshots/recovery-expired.png)

Les PNG sont copiés sans modification depuis les captures Playwright réelles. Ils illustrent les observations ; ils ne remplacent pas les tests d'interaction ni une preuve de vrai hôte.

## Verdict et suite

Le lot local possède un résultat exécutable et des tests. **ARC-01 reste incomplet** : ouverture et édition dans le vrai ChatGPT, identité réelle, capacités de fichier/stockage/iframe et poll de l'hôte restent non éprouvés. La [réunion de revue](../../meetings/2026-11-01-ARC-01-review.md) enregistre cette distinction et les dettes attribuées.
