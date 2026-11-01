# Développement par tickets

Git garde le code, les décisions et les preuves. Une branche `work/<id>-<sujet>` par ticket ; une pull request explique comportement, vérifications et limites. Dans un checkout partagé, l'intégrateur est seul à changer branche, index et commits. Aucun reset/force-push ni suppression du travail d'autrui.

## Prendre un ticket

Consulter `npm run team:next`, puis employer la révision affichée :

```sh
npm run team:claim -- ARC-01 --agent frontend --expected-revision 0
```

La commande refuse les dépendances inachevées, le mauvais rôle, une quatrième tâche active, les chemins en conflit et une révision périmée. Le champ `branch` propose un nom ; la commande ne crée ni ne change une branche Git. Le rôle est déclaré par la session : il ne constitue pas une identité de sécurité.

## Soumettre puis clôturer

Créer une preuve réelle sous `docs/evidence/ARC-01/implementation.md`, comprenant commit, environnement, étapes, résultats et limites. Les valeurs suivantes sont des exemples à adapter à la révision actuelle :

```sh
npm run team:submit -- ARC-01 --agent frontend --evidence docs/evidence/ARC-01/implementation.md --expected-revision 1
npm run team:done -- ARC-01 --reviewer qa --evidence docs/evidence/ARC-01/review.md --expected-revision 2
npm run team:board
```

La clôture exige une preuve de revue distincte et un reviewer différent du propriétaire. Le script valide les états, les chemins et l'existence des fichiers, pas la sincérité ni la suffisance de leur contenu. L'orchestrateur et le reviewer lisent les critères avant de clôturer. Une simple assertion ou un fichier vide ne vaut pas preuve. Les qualifications hôte/identité restent obligatoires.

## Blocage et reprise

```sh
npm run team:block -- ARC-01 --agent orchestrator --reason "Accès hôte de test indisponible" --expected-revision 1
npm run team:reopen -- ARC-01 --agent orchestrator --reason "Accès de test obtenu et vérifié" --expected-revision 2
```

Les numéros ci-dessus décrivent un autre exemple de parcours et doivent être remplacés. Le blocage requiert un motif. Réouvrir un ticket terminé peut exiger de rouvrir ses consommateurs actifs ou terminés d'abord. Un conflit laisse le fichier initial inchangé.

Le fichier lock local sérialise les mutations dans un même checkout ; Git ne verrouille pas deux clones. Il contient le PID et la date du processus. Après un crash, si `tickets.json.lock` subsiste, vérifier qu'aucun processus ne l'utilise avant de le retirer manuellement (un PID peut avoir été réutilisé). Ne pas l'effacer automatiquement pour forcer une écriture. Une deuxième session travaille sur sa branche et réconcilie explicitement les divergences. Les chemins de propriété sont comparés sans distinction de casse pour rester conservateurs sur Windows ; les alias `.`/`..` sont refusés et les preuves sont résolues sur leur chemin réel.

## Vérifications et intégration

Exécuter les commandes de [START.md](docs/START.md), puis les tests propres au ticket. Régénérer BOARD.md et mettre à jour docs/STATUS.md dans le même commit que le changement d'état. Le dépôt définit la CI Quality ; son passage doit être constaté dans GitHub avant d'être revendiqué. Les protections de branche ne sont pas supposées actives sans vérification du compte.

GitHub Issues est un miroir : conserver les URLs et numéros dans le ticket, mettre à jour sa discussion/son état explicitement quand autorisé. Ne pas clôturer un ticket local parce que l'issue a été fermée sans preuve.
