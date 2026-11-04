# GEN-01 — preuve d’implémentation du flux réactif

Date : 2026-11-04  
État : `done` après approbation QA indépendante, clôture par `team:done` et contrôle du registre en révision 34. La décision est dans [la preuve de revue](review.md).

## Résultat observé

- Le brief non vide déclenche automatiquement l’analyse après 1 500 ms sans frappe ; une nouvelle saisie redémarre le délai, la composition IME suspend le minuteur et invalide les résultats précédents.
- Sans modèle configuré, les règles locales peuvent prévisualiser la recette du tableau de bord ventes synthétiques avec nuages et graphiques. La direction et la vitesse reconnues sont traduites vers des presets exacts du catalogue ; l’aperçu reste temporaire jusqu’à « Conserver ».
- Le parseur distingue `slide-up`, `slide-down`, `fade-slide-up`, `fade-slide-down` et `fade-in`. Si le texte demande simultanément haut et bas, il ne choisit pas silencieusement une direction.
- Lorsque `prefers-reduced-motion` est actif, les animations restent désactivées par défaut. « Lire » et « Réduire » ne modifient que l’aperçu catalogue, restent réversibles et ne sont pas sauvegardés. Le contrôle est visible dans la barre du canevas et reste dans le viewport 375 px.
- Un mouvement slide seul conserve une opacité de 1 ; les presets fade combinés font varier l’opacité.

## Vérifications exécutées

| Vérification | Résultat |
|---|---|
| `node_modules/.bin/tsx --test apps/editor-web/test/manifest-analysis.test.ts` | 13/13 réussis ; y compris montée seule, fondu + montée, vitesse et directions contradictoires. |
| `npm test` | 22 réussis, 1 ignoré par la restriction Windows sur les liens symboliques ; catalogue 12/12. |
| `npm run test:providers` | 29/29 réussis avec adaptateurs simulés, sans appel payant. |
| `npm run typecheck` et `npm run build` | Réussis ; Rolldown signale des directives `use client` de dépendances. |
| Playwright Chromium, suite complète | 36/36 réussis en 2 min 30 ; comprend saisie, édition, lancement, recherche, mouvements réduits et compatibilité des viewports. Les logs incluent l’avertissement Puck `setData` coûteux, sans échec associé. |
| Playwright ciblé post-correctif | 4/4 réussis en 16,1 s : Hero en mouvement réduit, exemples clavier, aperçu catalogue reduced-motion avec activation/réduction, slide seul sans fondu. Les deux derniers scénarios utilisent maintenant une horloge contrôlée et vérifient le seuil exact de 1 499/1 500 ms. |
| `npm run check` | Backlog valide, 31 tickets, révision 34 après clôture. |

Revue externe loop-verify : aucun PASS revendiqué. Le premier transfert du diff complet a été rejeté pour volume ; le contrôle suivant n’a pas pu accéder aux fichiers dans son espace isolé et n’a pas pu vérifier les extraits. La revue de code et la QA indépendantes, ainsi que les vérifications exécutées localement, restent les preuves de ce ticket.

Vérification manuelle dans Chrome local : après 1,8 s de pause, deux graphiques et les nuages sont visibles ; le preset `fade-slide-up` utilise une durée de 373 ms pour x1,5. Aucune erreur console ; deux avertissements Puck `setData` connus, sans échec associé. L’état de test a été effacé après vérification.

Captures versionnées : [dashboard ventes, capture viewport 1440 × 1000](sales-dashboard-viewport.png) et [contrôle reduced-motion à 375 px](reduced-motion-toggle-375.png). La capture viewport montre seulement l’interface visible, sans la bande vide de la précédente capture pleine page.

## Limites et critères qui restent ouverts

- La règle locale n’interprète qu’un vocabulaire et un catalogue limités ; elle ne crée pas toute animation décrite. La composition de mouvements déclaratifs et la traduction du langage naturel par modèle sont prévues dans GEN-02/GEN-03.
- Les adaptateurs/API de modèles sont validés par des mocks. Aucun fournisseur réel ni clé de modèle n’a été configuré ou appelé dans cette vérification.
- Une demande soumise à un modèle transmet le brief et le Snapshot confirmé tels quels au modèle sélectionné ; GEN-03 doit détecter ou arrêter les valeurs secrètes saisies dans le texte avant tout transfert réel.
- Les scénarios d’affichage utilisent Chromium/Playwright et l’émulation de 375 px ; ils ne démontrent ni appareil mobile physique ni exécution dans ChatGPT Desktop. ARC-01 reste bloqué par la preuve de l’hôte et de l’identité.
- Le ticket est clos dans le périmètre local GEN-01. La revue ne valide ni fournisseur réel, ni exécution dans ChatGPT Desktop ; ARC-01 reste bloqué par sa preuve d’hôte et d’identité.
