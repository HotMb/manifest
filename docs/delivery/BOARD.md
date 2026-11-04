# Manifest — tableau de livraison

Vue générée depuis tickets.json, révision 39. GitHub Issues est un miroir ; les preuves restent dans Git.

| Ticket | Phase | Responsable | État | Dépendances |
|---|---|---|---|---|
| ARC-01 — Qualifier le parcours embarqué | M0 | frontend | blocked | — |
| ARC-02 — Verrouiller versions et environnement | M0 | orchestrator | todo | ARC-01 |
| ARC-03 — Installer les contrats de l'équipe | M0 | orchestrator | todo | ARC-01, ARC-02 |
| DOM-01 — Snapshot et validation complète | M1 | backend | todo | ARC-03, CAT-01 |
| DOM-02 — Commandes atomiques et idempotence | M1 | backend | todo | DOM-01 |
| DOM-03 — Annuler et rétablir par groupe | M1 | frontend | todo | DOM-02 |
| CAT-01 — Primitives et schémas de composants | M1 | designer | todo | ARC-03 |
| CAT-02 — Dix blocs de référence | M1 | designer | todo | CAT-01, UX-01 |
| CAT-03 — Release immuable et profil Unslop | M1 | designer | todo | CAT-02 |
| UX-01 — Primitives de l'outil et tokens | M1 | designer | todo | ARC-03 |
| UI-01 — Puck contrôlé et inspecteur | M1 | frontend | todo | DOM-01, CAT-01, UX-01 |
| UI-02 — Catalogue, navigation et alternatives | M1 | frontend | todo | UI-01, CAT-02 |
| UI-03 — Saisie réactive et suivi des jobs | M1 | frontend | todo | UI-01, JOB-01, AI-01 |
| UI-04 — Proposition et conservation atomique | M1 | frontend | todo | UI-03, DOM-02 |
| UI-05 — Autosave, récupération et conflit | M1 | frontend | todo | UI-01, DOM-02, API-01 |
| API-01 — Persistance et transports communs | M1 | backend | todo | DOM-02, ARC-02 |
| JOB-01 — Cycle durable des tâches | M1 | backend | todo | API-01 |
| AI-01 — Adaptateur OpenAI | M1 | backend | todo | JOB-01, CAT-01 |
| AI-02 — Contexte, cibles et profil | M1 | backend | todo | AI-01, CAT-03 |
| SEC-01 — Autorisations et contrôle d'usage | M1 | backend | todo | ARC-02, API-01, JOB-01 |
| ASSET-01 — Ressources du projet | M1 | backend | todo | API-01, SEC-01 |
| REV-01 — Approbation, historique et restauration | M1 | backend | todo | DOM-02, UI-04 |
| EXP-01 — Export React depuis le catalogue | M1 | platform | todo | DOM-01, CAT-03, REV-01 |
| EXP-02 — Construction et vérification isolées | M1 | platform | todo | EXP-01, SEC-01, ASSET-01 |
| OPS-01 — Déploiement et restauration | M1 | platform | todo | API-01, SEC-01, EXP-02 |
| TEST-01 — Recette transversale M1 | M1 | qa | todo | ARC-03, DOM-01, DOM-02, DOM-03, CAT-01, CAT-02, CAT-03, UX-01, UI-01, UI-02, UI-03, UI-04, UI-05, API-01, JOB-01, AI-01, AI-02, SEC-01, ASSET-01, REV-01, EXP-01, EXP-02, OPS-01 |
| GEN-01 — Boucle de conception réactive | M0 | frontend | done | — |
| GEN-02 — Catalogue local de composition versionné | M1 | backend | in_progress | — |
| GEN-03 — Génération guidée par les capacités du catalogue | M1 | backend | todo | GEN-02 |
| GEN-04 — Aperçu réactif de pages composées | M1 | frontend | todo | GEN-01, GEN-02, GEN-03 |
| GEN-05 — Étendre les mouvements compris depuis le langage libre | M2 | backend | todo | GEN-02, GEN-03, GEN-04 |
