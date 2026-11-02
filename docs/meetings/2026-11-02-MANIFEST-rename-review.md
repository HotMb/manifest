# Revue — renommage et reprise des agents

Date : 2 novembre 2026. Périmètre : nom produit Manifest, dépôt GitHub, cadrage des Issues et consignes de reprise. Le registre reste en révision 3 ; aucun statut de ticket n'a été modifié.

## Résultat

- Le dépôt public a été renommé en [`HotMb/manifest`](https://github.com/HotMb/manifest). Son URL a été vérifiée après le changement.
- Le README, les règles des agents, le brief de lancement, le guide de livraison, le tableau et les liens de suivi utilisent Manifest comme nom produit. Les anciens espaces de noms de packages et clés de stockage `design-workbench` restent des identifiants techniques compatibles.
- Les 26 Issues ont reçu un bandeau « Projet : Manifest », leurs liens vers le dépôt ont été corrigés et l'Issue ARC-01 indique son état bloqué réel.
- Les noms transmis par l'adaptateur d'hôte, le serveur MCP, le realm HTTP et les logs ont été alignés sur Manifest/`manifest-m0`.
- La branche `work/arc-01-qualification` est poussée jusqu'à `3bf14b9`. Le workflow `Quality` 24 du commit `ee9ec5d` a échoué à `Browser qualification tests`, après les étapes précédentes réussies ; la cause reste à diagnostiquer. Le workflow 26 du HEAD `3bf14b9` était en cours au dernier contrôle ; aucun PASS n'est annoncé.

## Contributions et vérification

| Rôle | Contribution réelle | Résultat |
|---|---|---|
| Backend — `audit_mcp_flow` | A renommé les métadonnées MCP, les logs et le realm HTTP ; a ajouté des assertions ciblées, puis a vérifié le changement frontend en revue croisée. | `npm run test:m0` 52/52, typecheck et `git diff --check` rapportés réussis ; confirme la cohérence Manifest/`manifest-m0`. |
| Frontend — `audit_ui_flow` | A renommé le nom envoyé à l'hôte MCP, puis a relu en revue croisée les noms backend et leurs assertions. | 16 tests d'adaptateur, typecheck et `git diff --check` rapportés réussis ; confirme que les assertions vérifient l'identité MCP et le challenge HTTP. |
| Orchestrateur | A renommé le dépôt, synchronisé le cadrage et le suivi, et revérifié le registre. | `npm run check` réussi : 26 tickets valides, révision 3 ; `npm run team:next` : 0 ticket éligible ; vérification des liens et `git diff --check` exécutés. |

Les relectures croisées n'ont trouvé aucune incohérence de nom. La couverture de test ne vérifie pas directement le texte des logs de démarrage ni le garde-fou de store partagé ; ces observations ne bloquent pas ce renommage. Aucun changement d'interface visuelle ni d'architecture n'a été réalisé dans cette tâche.

## Vérification indépendante

Deux tentatives loop-verify ont été faites, chacune conclue FAIL. La première manquait de pièces permettant au vérificateur de confirmer l'état GitHub et les assertions de test ; la seconde a validé les quatre premiers critères, mais demandait un audit explicite de l'URL dans chaque Issue. L'audit suivant, effectué directement via GitHub, a vérifié les 26 Issues : chacune contient `https://github.com/HotMb/manifest` et le bandeau Manifest, aucune ne contient l'ancien slug, toutes restent ouvertes et sans assigné. Les appels de mise à jour ne portaient que sur les corps. La limite de deux tentatives étant atteinte, aucun PASS loop-verify global n'est revendiqué.

## Statut, limites et dettes

**Verdict : renommage terminé ; développement produit bloqué sur sa porte actuelle.** ARC-01 attend un essai réel dans ChatGPT et une preuve d'identité. Aucun agent n'a revendiqué ces critères. ARC-02 et les tickets M1 restent inéligibles ; la marque et les tests locaux ne les débloquent pas.

Aucune nouvelle dette technique n'est ouverte. Les dettes préexistantes restent au [registre](../TECH-DEBT.md). Le dépôt public ne signifie pas que l'application est déployée ; le prototype local n'a pas de fournisseur réel ni d'OAuth de production configuré.

## Décision et prochaine action

Conserver le nom Manifest et les anciens identifiants techniques jusqu'à un ticket de migration compatible. Préparer l'accès au vrai hôte ChatGPT et au compte de test autorisé, puis remplir la recette et les preuves ARC-01. Tant que cet accès manque, aucun ticket dépendant ne doit être pris.
