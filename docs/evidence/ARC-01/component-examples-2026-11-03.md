# Recherche d’exemples à droite — 3 novembre 2026

Demande : ajouter un champ en tête des suggestions pour chercher des composants/animations et voir des exemples. [Revue d’équipe](../../meetings/2026-11-03-ARC-01-component-examples-review.md).

Livraison locale : `ComponentExamples`, indépendant du brief et du transport. Sept exemples : menu, section d’accueil, cartes, FAQ, fondu, glissement et survol. Recherche normalisée casse/accents, état sans résultat, effacement avec focus, démos accessibles et animations finies respectant le mouvement réduit. Aucun ajout au document ou appel IA depuis ce composant. Ce sont des exemples locaux, pas une qualification du catalogue M1 ou de l’insertion de composants.

La capture `.team/screenshots/component-examples/01-search-fade-desktop.png` montre le titre Suggestions suivi du champ, du résultat fondu et de sa démo, avec la page noire préservée.

Loop-verify : deux tentatives, sans résultat exploitable (`raw` vide, « no parseable verdict »). Aucun PASS revendiqué et aucune troisième tentative. Les tests ordinaires et la relecture distincte de `/root/design_review` sont les preuves retenues.

Plugin privé existant actualisé en 0.1.3, release `pluginrel_6aea039666b0819192b9d09d9f0749da`, portée USER/PRIVATE inchangée. Manifestes et BUILD.txt relus en 0.1.3. Archive SHA-256 : `832f6fef284142dd2431cfd493ef5e2fb0702916075e01a3b39ce821e1b9c482`. Les octets complets du HTML distant ne sont pas comparés par cette API. Rechargement réel de la nouvelle release dans le panneau hôte à observer ; ARC-01 reste bloqué, aucun autre ticket terminé. Code local non commité, aucun push ou déploiement public.

## Revalidation de l’essai local — 3 novembre 2026

L’application est ouverte localement à `http://127.0.0.1:5173/`. Le designer a recherché `menu` et ouvert la démo ; le canevas central est resté blanc. Les sept cartes sont des exemples codés en dur. Elles ne s’ajoutent pas au document et ne se glissent pas sur le canevas. Le bouton de démonstration ouvre la carte au clic/clavier ; aucun aperçu déclenché au survol n’est implémenté. Les démos ne font pas d’appel IA et ne modifient ni le brief ni le Snapshot.

L’appel `open_designer` de cette session a accepté explicitement un brief de tableau de bord et retourné `project-m0`, `draftVersion: 0`, `storage: memory-m0`, sans révision ni reçu. Ce retour n’établit pas que le texte s’est affiché dans la vue ChatGPT Desktop. Le lancement par l’hôte, le bridge et l’identité OAuth restent à observer manuellement.

| Contrôle relancé | Résultat |
|---|---|
| `npm run typecheck` | Réussi |
| `npm test` | 20 réussis, 1 ignoré (création de liens symboliques refusée par Windows) |
| `npm run build` | Réussi, 2 233,29 Ko, gzip 779,76 Ko ; avertissements Vite `use client` |
| `npm run test:e2e` | 28/28 réussis ; avertissements Puck `setData` coûteux |
| `npm run test:m0` | 66/66 réussis avec loopback local autorisé |
| `npm run test:providers` | 28/28 réussis, aucun appel fournisseur réel |
| `npm run smoke:desktop-plugin` | Réussi en stdio local ; stockage éphémère, aucun hôte ChatGPT testé |
| `npm run check`, `git diff --check` | Réussis ; registre 26 tickets, révision 14 |
| Scripts contrats/tests Python | Non exécutés : `jsonschema` absent de l’interpréteur Python 3.14 |
| `audit_project.py --mode strict` | Échec : `ownership.native-select-undecided`, `model-provider-panel.tsx:21` |

Revue design fraîche de `/root/delivery_design_review` : l’écran unique, la recherche et la démo locale sont présents ; ajout/glisser-déposer au canevas absents. Pas de nouvelle comparaison visuelle Figma, car l’onglet était réservé par une autre session. Revue code fraîche de `/root/launchcontext_code_review` : aucun bloqueur de sécurité ; en mouvement réduit, « Rejouer l’animation » demeure actif bien que le CSS neutralise l’animation, donc ce bouton n’a pas d’effet. Ce défaut mineur et le contraste gris déjà relevé ne sont pas corrigés dans cette tranche.

GitHub : la PR #27 est la seule PR ouverte. Elle est toujours en brouillon et `mergeable: true`, sans revue soumise ni thread ; cela signifie seulement qu’aucun conflit Git n’est détecté. GitHub Actions Quality run 60 est vert sur le HEAD commité `97e9b97`. Les changements applicatifs et leurs nouveaux tests restent dans l’arbre local non commité et ne sont pas couverts par ce run. Aucun avis de fusion n’est donné.

Décision et suite : l’URL locale permet d’éprouver la disposition, la recherche et les démonstrations ; ARC-01 reste bloqué et aucun ticket dépendant n’est démarré. L’intégrateur attend une preuve visuelle de l’ouverture et de la transmission du contexte dans ChatGPT Desktop. La limite de deux tentatives loop-verify pour cette tranche est atteinte ; aucune nouvelle tentative n’est lancée.
