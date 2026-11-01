# ARC-01 — recette de l'interface locale

Date : 1er novembre 2026. Agent QA : `arc01_qa`. Sous-revue visuelle : `arc01_qa/a11y_review`. Périmètre : prototype navigateur local React/Puck de la branche `work/arc-01-qualification`, dans l'arbre de travail avant son commit d'intégration. Cette preuve ne clôture pas ARC-01 et ne qualifie pas ChatGPT.

**Réouverture ciblée finalisée :** deux scénarios de récupération ont été ajoutés après la relecture globale. Les huit scénarios ont été rejoués ensemble sur la version corrigée ; le résultat 6/6 de la première passe est historique et remplacé par le résultat ci-dessous.

## Exécution

Commande : `npm run test:e2e`, avec Playwright 1.64.1, Chrome installé sur Windows et serveur Vite local sur `http://127.0.0.1:4173`. Les tests se trouvent dans `tests/e2e/arc01.spec.ts` et la configuration dans `playwright.config.ts`. Chaque scénario utilise un contexte de navigateur isolé ; le scénario concurrent ouvre volontairement deux pages du même contexte.

**Dernière exécution : 8 tests réussis, aucun ignoré, 34,0 secondes.** Le premier essai dans l'environnement restreint ne pouvait pas joindre le socket local. L'exécution du navigateur et du serveur a ensuite été autorisée hors de cette restriction ; aucun appel fournisseur de modèle ni test payant n'a été réalisé.

| Scénario exécuté | Observation finale |
|---|---|
| Modifier titre, texte et trois couleurs, enregistrer puis recharger | valeurs et aperçu modifiés, confirmation locale explicite, version 1 retrouvée ; couleur du shell inchangée |
| Annuler et rétablir | titre du document et champ d'inspecteur restaurés ensemble |
| Deux vues enregistrent sur la même version | seconde écriture refusée, réglages ouverts conservés, message de conflit persistant ; dialogue de reprise et rechargement de la version confirmée fonctionnels |
| Largeur 375 px et clavier | bascule entre aperçu et inspecteur, un seul panneau visible, saisie au clavier sans perte de focus, pas de débordement horizontal du document, enregistrement possible |
| Préférence de mouvement réduit | Hero visible, animation désactivée et opacité 1 |
| `?host=mcp` sans hôte | erreur de connexion française et possibilité de réessayer ; aucun passage silencieux au mode local, aucun brouillon écrit dans localStorage |
| Brouillon local expiré | contenu existant laissé intact au démarrage, aucune fixture substituée ; reprise explicite retrouvant titre et version 1, puis renouvellement de la durée de conservation |
| Échec d'écriture avant sauvegarde, nouvelle édition et vérification de l'état ancien | capture initiale reprise sans écraser les réglages plus récents ouverts ; capture enregistrée en version 1, puis nouveaux réglages en version 2 et retrouvés après rechargement |

Les champs sont sélectionnés par rôle et nom accessibles. Le statut de sauvegarde est ciblé dans le pied de page : Puck possède aussi sa propre région d'annonce, qui ne constitue pas un second statut de sauvegarde.

## Défauts trouvés et corrections vérifiées

La première exécution avait six échecs : cinq scénarios bloqués par l'inspecteur vide et un message MCP technique affiché tel quel. Le Hero était visible, mais les champs Titre/Texte absents. Le frontend a corrigé l'identifiant de zone Puck (`root:default-zone`) et normalisé l'erreur MCP en français. Les six scénarios ont ensuite été rejoués avec succès.

Une seconde exécution a passé cinq scénarios et révélé une sélection de test trop étroite pour le textarea Puck : son nom accessible existait dans l'arbre, mais le sélecteur de label ne trouvait pas l'élément. Le test utilise désormais le rôle `textbox` et son nom accessible, sans diminuer les assertions fonctionnelles. La passe suivante avait réussi les six scénarios initiaux.

La relecture globale a ensuite entraîné une réouverture sur l'expiration du stockage et la conservation d'une commande de sauvegarde en attente. Deux E2E ont été ajoutés : le premier crée un brouillon par l'interface puis fait expirer uniquement sa date, le second simule une écriture localStorage refusée une fois et conserve une nouvelle édition durant la reprise. L'exécution finale de huit tests ci-dessus vérifie ces corrections avec les six parcours initiaux. Les contrôles d'empreinte du document relèvent des tests d'adaptateur séparés ; cette recette n'a pas simulé une coupure réseau MCP après commit serveur.

## Captures réellement produites

Les captures locales sont des artefacts de test ignorés par Git, sous `.team/screenshots/` :

- `arc01-desktop.png` : état initial avec inspecteur corrigé ;
- `arc01-desktop-edited.png` : titre, texte et thème modifiés après rechargement ;
- `arc01-mobile-preview.png` : aperçu au viewport 375 × 812 ;
- `arc01-mobile-settings.png` : inspecteur mobile et champ actif ;
- `arc01-recovery-expired.png` : reprise explicite proposée sans écrasement du brouillon expiré ;
- `arc01-desktop-before-fix.png` : état initial de l'inspecteur vide, conservé pour la revue.

La sous-revue a inspecté les captures et les snapshots d'accessibilité réels. Elle confirme visuellement les champs corrigés, le panneau mobile unique, un contour de focus visible et les états nommés. Elle n'a constaté aucun blocage visuel supplémentaire. Les métadonnées compactes restent un point de confort à éprouver au zoom et avec du contenu long, sans violation WCAG démontrée par ces seules images.

## Verdict et limites pour la réunion

**Prototype navigateur local : parcours de recette ci-dessus réussis. ARC-01 complet : preuve hôte toujours manquante.** La sauvegarde observée est locale au navigateur, pas une persistance de production. Le mode d'échec MCP prouve l'absence de fallback trompeur, pas l'ouverture de la vue dans le vrai ChatGPT.

Non exécutés par cette recette : vrai ChatGPT/Claude, handshake de vue dans ces hôtes, OAuth réel, lecteur d'écran, appareil mobile physique, test de zoom complet, autosave M1, suggestions IA et export de code. Les tests serveur et SDK relèvent des preuves backend séparées. Aucun résultat de modèle ne remplace ces observations.

Contribution à la réunion : conserver ce socle local, ne pas annoncer ARC-01 terminé, puis obtenir la preuve hôte/authentification exigée avant de rendre ARC-02/03 éligibles. Les corrections constatées sont des défauts levés ; les capacités futures absentes restent du backlog, pas des dettes artificielles.
