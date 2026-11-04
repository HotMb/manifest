# Revue HOTFIX-01 — ouverture et hauteur de Manifest — 4 novembre 2026

## Identification

| Champ | Valeur |
|---|---|
| Ticket | HOTFIX-01 — Corriger le lancement contextuel et la hauteur de Manifest |
| État | `done`, registre révision 55 |
| Branche | `work/hotfix-01`, dérivée du dernier commit partagé avec la PR #27 |
| Mode | Revue d’équipe asynchrone dans le chat, avec preuves versionnées |
| Environnement | Chromium/Playwright local, API de test et transport hôte simulés |
| Preuves | [Implémentation](../evidence/HOTFIX-01/implementation.md), [revue indépendante](../evidence/HOTFIX-01/review.md), captures dans le même dossier |

## Participants et contributions

| Agent / rôle | Contribution réellement reçue |
|---|---|
| `/root/arc01_frontend` — frontend, propriétaire du ticket | A livré le premier lot de correctifs de lancement, de Snapshot neutre, de layout intégré et de tests. L’orchestrateur a intégré les derniers tests de persistance et synchronisé le registre. |
| `/root/arc01_design_review` — design/accessibilité | A relu la capture compacte, la hiérarchie et les tailles du mode intégré; aucun finding P0–P2. N’a pas observé ChatGPT Desktop. |
| `/root/arc01_code_review` — revue de code distincte | Aucun défaut P0–P2 sur les contextes MCP valides. A signalé que le cas vide/`undefined` injecté directement dans le faux transport n’était pas représentatif du schéma; ce test a été retiré. |
| `/root/arc01_qa` — QA distincte | A exécuté le nouveau test de réouverture du transport : 1/1 réussi. La fixture de stockage est simulée et ne vaut pas preuve d’un redémarrage dans ChatGPT Desktop. |
| `/root/gen01_qa` — revue QA du diff | A confirmé les critères de viewport 736×704, scroll interne, navigation clavier/mobile, Snapshot vide et priorité de la demande, sans finding P0–P2. |
| `/root` — orchestration | A exécuté les 27 tests E2E ciblés, 75 tests M0, typecheck, build, contrôle du backlog et `git diff --check`; a soumis puis clôturé HOTFIX-01 avec une preuve QA distincte. |

Le commanditaire n’a pas participé à cette revue asynchrone; le résultat lui est résumé dans le chat.

## Résultat démontré

- Une demande non vide explicitement transmise par le chat préremplit l’input et a priorité sur une autre proposition déjà formulée par l’assistant. Sans demande ni proposition, l’interface garde le champ vide et le canevas blanc.
- Après 1,5 seconde de pause, le brief de tableau de bord de vente modifie l’aperçu local : nuages animés et graphiques apparaissent. Le test vérifie 1 499 ms sans résultat puis 1 500 ms avec résultat.
- À 736×704, les trois zones restent dans le viewport; la page ne défile pas et les panneaux/canevas défilent à l’intérieur. Sous 560 px, une zone est affichée à la fois, avec changement de panneau au clavier et au pointeur.
- Un brouillon enregistré par l’application est rechargé après actualisation; le test compare la valeur persistée avant et après le rechargement.
- Les captures [736×704](../evidence/HOTFIX-01/viewport-736x704.png) et [390×844](../evidence/HOTFIX-01/mobile-preview-390x844.png) montrent le canevas blanc sans design de départ.

## Vérifications

| Contrôle | Résultat |
|---|---|
| E2E lancement, canevas, viewport et persistance | 27/27 réussis |
| M0 backend/MCP/adaptateurs/contrats | 75/75 réussis |
| Typecheck et build | réussis; le build garde les avertissements `use client` de dépendances tierces |
| `npm run check` | valide, 32 tickets, révision 55 après clôture HOTFIX-01 |
| `git diff --check` | réussi; avis CRLF uniquement |
| `loop-verify` | Aucun PASS global revendiqué; limite de trois appels atteinte après un critère surcontraint concernant un `userRequest: undefined` impossible dans un contexte MCP valide. Le finding a été revu par le code reviewer et le test artificiel retiré. Détails dans [la revue](../evidence/HOTFIX-01/review.md). |

## Dettes et limites

- La console Playwright conserve l’avertissement Puck `setData` coûteux; aucun échec fonctionnel ne lui est associé. Le coût n’a pas été mesuré.
- Les avertissements Vite/Rolldown sur les directives `use client` des dépendances tierces restent présents.
- Les tests de génération et de transport n’appellent aucun fournisseur de modèle réel.
- L’hôte réel ChatGPT Desktop, son identité, l’ouverture effective depuis le chat et sa transmission MCP restent à vérifier séparément. ARC-01 ne peut pas être déclaré terminé sur la base de ces captures locales.
- M0 ne gère actuellement qu’un seul `projectId` par espace.

## Décision et suite

HOTFIX-01 est clos en révision 55 sur ses critères locaux. L’interface dans le navigateur local correspond désormais au comportement demandé : hauteur de viewport, champ principal sans texte imposé, canevas blanc au démarrage, priorité au brief du chat et aperçu réactif après pause.

Le dépôt a une PR #27 en brouillon; ce hotfix ne la fusionne pas et ne lève pas le gate de ChatGPT Desktop. Prochaine preuve utile pour ARC-01 : ouvrir la PR/build dans l’application ChatGPT Desktop, vérifier l’argument explicitement transmis puis recueillir une capture de l’état et, si possible, une modification réellement reflétée. Ne pas confondre ce test hôte avec la simulation navigateur.
