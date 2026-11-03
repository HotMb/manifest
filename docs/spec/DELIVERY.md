# Organisation de l'équipe et backlog de départ

Produit : **Manifest**. Les tickets sont le plan de travail de l'application Manifest ; `docs/delivery/tickets.json` est la source des statuts et des dépendances, et les Issues GitHub leur servent de miroir public.

## Addendum de conception approuvé — 2 novembre 2026

Le commanditaire a validé le parcours des captures : invocation depuis le chat vers une carte « Ouvrir Manifest », puis espace en trois zones (intention à gauche, aperçu dominant au centre, suggestions à droite), attente de 1,5 s, itérations visibles, version figée et rapport relu avant transmission explicite au chat. Cette validation fixe la direction produit, pas la disponibilité des commandes de l'hôte ni l'achèvement du prototype.

| Capacité à livrer | Tickets existants concernés | Critère à préserver |
|---|---|---|
| Carte d'ouverture et fallback hôte | ARC-01, puis UX/recette | `@Manifest`/sélection explicite comme voie documentée ; tester `/manifest` sans le promettre comme commande native ; fallback conserve le même projet |
| Trois zones et palette issue des captures | UX-01, UI-01 | séparation du shell et du thème de page, contrôle clavier/mobile, contraste mesuré ; le fond clair vide est un état initial, pas un thème imposé |
| Catalogue et cartes de suggestion | CAT-01/02/03, UI-02 | suggérer uniquement les candidats admissibles après contrôles capacité/compatibilité/version/licence ; afficher raison/source/version, prévisualiser puis ajouter par action ; si aucun candidat ne convient, le dire plutôt que d'en inventer |
| Réactivité et provenance | UI-03, UI-04, AI-01/02 | 1 500 ms hors IME, dernière prévisualisation stable pendant la génération, obsolescence correcte et origine capturée par le job/proposal |
| Version et transmission du rapport | REV-01, UI-02/04, API/MCP et TEST-01 à détailler | rapport lié à une révision/hash, avec preuve d'éligibilité capturée et hash JCS déterministe ; relu avant envoi, provenance fidèle, reçu d'envoi confirmé ou fallback explicite |

Les critères du registre machine ont été précisés en révision 6 sans modifier les statuts ni les dépendances. ARC-01 reste le seul ticket actif. Le nouveau parcours local vide -> ajout explicite -> édition/enregistrement est qualifié séparément de l'ouverture/authentification réelle dans ChatGPT Desktop. UI-02 précise la recherche catalogue, le rendu/animation, les licences, l'insertion accessible et les références de rapport ; il demeure non éligible jusqu'à UI-01 et CAT-02.

### Correction de fidélité au démarrage — audit du 3 novembre 2026

La comparaison du prototype ouvert avec la maquette a révélé un écart de contrat, pas seulement de CSS : l'écran Figma commence avec une composition vide, tandis que le validateur M0 et sa fixture démarrent toujours avec un Hero rempli. Le JSON Schema canonique accepte déjà `composition.content: []`; le sous-ensemble sémantique M0 et plusieurs helpers l'interdisent.

La correction est bornée à zéro ou un Hero M0 dans le même Snapshot : un projet réellement neuf ouvre un canevas blanc; `insert_block`/`remove_block` sont atomiques, la destination racine est explicite (`slot: "content"`, `parentBlockId: null`, `beforeBlockId: null`), une proposition reste une projection jusqu'à « Conserver », et l'undo/redo préserve l'identité du bloc. La fixture Hero et les projets déjà enregistrés restent compatibles. Une fixture vide distincte couvre le nouveau démarrage. Il est interdit de cacher le Hero dans le rendu tout en le conservant dans le document ou le rapport.

Ce changement ne livre pas l'annuaire multi-cartes de l'exemple Figma. Les membres, la fiche au survol, les propositions de bibliothèque avec versions/licences et l'animation stagger restent sous les tickets catalogue/UI M1. Les règles locales ne sont pas une réponse LLM ; la capture de suggestions utilisée pour le contrôle visuel ne fait aucun appel fournisseur.

Le critère local ARC-01 est désormais vide -> ajout du Hero M0 -> modification/enregistrement dans le navigateur ; la reprise d'un ancien brouillon Hero doit aussi rester intacte. La preuve ChatGPT Desktop, l'authentification, les capacités du bridge et le poll hôte restent des critères séparés et bloquants pour la clôture. Le travail shell seul ne ferme pas ARC-01.

### Clarification du flux à deux entrées — 3 novembre 2026

La maquette détaillée par le commanditaire établit deux tâches parallèles dans le même éditeur, avec une source de vérité documentaire unique :

| Zone | Rôle | Comportement et données |
|---|---|---|
| Entrée principale à gauche | Décrire/créer/modifier la page, sa logique, son mouvement et ses contraintes | À l'ouverture, le contexte d'hôte explicitement transmis (projet/page ciblé et dernier message déjà envoyé) peut préremplir une suggestion éditable. L'utilisateur choisit nouveau projet/page ou modification si la cible n'est pas univoque. Le debounce de 1 500 ms s'applique uniquement à cette intention ; la réponse modèle reste une proposition vérifiée et réversible. |
| Recherche à droite | Trouver un élément oublié ou une piste visuelle (ex. « menu ») | Recherche locale dans le catalogue versionné, sans appel IA. Les cartes montrent l'aperçu et l'animation, la raison, le slot/position, bibliothèque, version, licence et compatibilité. Prévisualiser n'écrit pas ; ajouter par drag/drop ou action accessible met à jour le Snapshot et affiche sous l'entrée principale un jeton de référence lisible/stable, inclus dans le contexte IA et le rapport sans modifier le texte libre. |
| Aperçu au centre | Montrer exactement la page issue du Snapshot et la projection en cours | Le canevas neuf est blanc. Une proposition IA se prévisualise selon la causalité ; les composants du catalogue sont ajoutés à la bonne position. Aucun Hero, menu ou annuaire n'est maquetté comme résultat si son contenu n'existe pas dans le Snapshot/catalogue. |
| `/validate` dans l'entrée principale | Finaliser et remettre le contexte au modèle hôte | Fige la composition/brief, calcule le rapport lié à une révision/hash, le transmet via la capacité déclarée de l'hôte puis cède la main après accusé. En cas d'absence/échec, garde l'éditeur et le rapport accessibles en copie/téléchargement. Ne présume pas que `/validate` est une commande native ChatGPT. |

Portes de livraison correspondantes : contexte d'ouverture/retour dans ARC-01 et API-01, choix nouveau/existant et intention dans UI-03/AI-02, recherche/prévisualisation/insertion et jetons de référence visibles dans UI-02/CAT-01/02/03, DOM-02/UI-04, AI-02, REV-01 et TEST-01. La révision 7 du registre précise les critères ARC-01, UI-02, UI-03, CAT-02, AI-02, REV-01 et TEST-01 ; leurs Issues GitHub restent des miroirs ouverts. Le sous-ensemble M0 zéro/un Hero n'est qu'une qualification ; il n'est pas le catalogue final ni une promesse que le modèle prendra toujours le même type de composant.

## Rôles et responsabilité

Le nombre de personnes dépend de la disponibilité et des compétences. Les responsabilités suivantes doivent avoir un propriétaire nommé ; une personne peut en cumuler plusieurs. Aucun effectif, coût ou délai n'est présenté comme estimé sans revue de l'équipe.

| Rôle | Propriété | Livrable attendu |
|---|---|---|
| Responsable produit / commanditaire | priorités, briefs, validation du design | décisions et recette d'usage |
| Tech lead | domaine, contrats, migrations et intégration | compatibilité des modules et arbitrages |
| Frontend éditeur | Puck contrôlé, inspecteur, causalité et accessibilité | expérience complète dans la vue |
| Backend / IA / MCP | auth, commandes, jobs, adaptateurs et budgets | invariants serveur et intégration hôte |
| Designer + frontend catalogue | primitives, blocs, profil et licences | qualité des compositions et des sources |
| Export / plateforme | builds isolés, packaging, déploiement et restauration | artefacts reproductibles et exploitation |
| QA / automatisation | fixtures, parcours, tests d'erreur et comparaison | preuves de passage des jalons |

## Découpage et parallélisme

M0 termine ARC-01/02 et initialise ARC-03. Ensuite : DOM-01 et CAT-01 fixent les structures ; UI, backend, catalogue et export peuvent avancer sur les mêmes fixtures. Aucun groupe ne crée son propre format de projet, bridge ou catalogue privé.

Chemin critique M1 : qualification hôte -> domaine/commandes -> édition -> propositions -> approbation -> export validé. Le catalogue et les scénarios QA avancent en parallèle ; la sécurité d'exécution précède toute compilation de contenu non figé.

Les agents de développement peuvent prendre un ticket avec propriété de fichiers explicite. Ils ne réécrivent pas les interfaces des autres, ne retirent pas leurs modifications et ne déclarent pas « terminé » sans preuve. Le tech lead intègre les changements et arbitre les conflits de contrats. Les revues de modèles complètent les tests réels ; elles ne les remplacent pas.

## Format obligatoire d'un ticket

Objectif, propriétaire, exigences RQ, dépendances, modules/fichiers concernés, entrées/sorties, critères observables, tests d'erreur, preuve de recette et éléments hors périmètre. Les tests et fixtures font partie du ticket ; un ticket ne se termine pas par une simple capture du code.

## Tickets M0

### ARC-01 — Qualifier le parcours embarqué

Propriétaires : frontend + backend/MCP. Dépendances : aucune. RQ-01/03. Livrer un essai jetable d'éditeur avec un bloc, bridge officiel, initialisation Vue -> Hôte et appel de lecture autorisé. Prouver ouverture, rafraîchissement, dimensions étroites, clavier, poll court et erreur d'autorisation. Noter capacités de fichier/stockage/iframe réellement disponibles et fallback navigateur. Preuve : enregistrement du parcours et matrice de capacités datée, sans secrets. Ne pas développer le catalogue complet ni publier le plugin.

### ARC-02 — Verrouiller versions et environnement

Propriétaire : tech lead + plateforme. Dépendance : ARC-01. Choisir versions exactes compatibles React/Puck/SDK MCP/validation, runtime Node supporté et stratégie OAuth. Livrer lockfile, matrice de compatibilité et décision de déploiement. Prouver installation/build propres, vérification de token avec mauvaise audience et capacité fournisseur sélectionné. Ne pas supposer des numéros de versions à partir des seuls exemples du dossier.

### ARC-03 — Installer les contrats de l'équipe

Propriétaire : tech lead + QA. Dépendances : ARC-01/02. Mettre en place dépôt, dossiers de modules, CI de contrats, règles de propriété et fixtures de ce dossier. Prouver qu'un changement incompatible de schéma fait échouer la vérification et que les exemples valides passent. Livrer mocks locaux pour développer UI/API indépendamment ; aucun appel réel facturable dans les tests par défaut.

## Tickets M1 — domaine et catalogue

### DOM-01 — Snapshot et validation complète

Propriétaire : domaine. Dépendances : ARC-03, CAT-01 pour les schémas des primitives. RQ-05/09/14. Implémenter sérialisation et validation structurelle + catalogue : IDs, slots, routes, tokens, assets, profondeur et limites. Cas : fixture correcte, bloc inconnu, doublon imbriqué, cycle de déplacement, référence hors projet. Aucune dépendance réseau/React dans le domaine.

### DOM-02 — Commandes atomiques et idempotence

Propriétaire : domaine + backend. Dépendance : DOM-01. RQ-06/10/12. Implémenter les quatre actions de CONTRACTS.md. Critères : un seul résultat sur retry identique ; conflit sur même clé/autre corps ; un seul gagnant pour deux versions attendues identiques ; aucun lot partiel ; verrouillage respecté. Reçu et nouvelle version sont dans la même transaction. AT-05/06/09/10.

### DOM-03 — Annuler et rétablir par groupe

Propriétaire : frontend domaine. Dépendance : DOM-02. RQ-06. Une modification manuelle ou proposition conservée forme un groupe réversible ; une restauration approuvée ne modifie pas l'histoire. Tester sous-arbre supprimé/restauré, IDs et références, conflit après réponse serveur. Ne pas traiter les tokens IA ou les frappes du prompt comme des groupes de document.

### CAT-01 — Primitives et schémas de composants

Propriétaire : catalogue. Dépendance : ARC-03. RQ-04/05/14. Livrer Section/Stack/Grid/Heading/Text/Button/Image avec champs éditables, slots déclarés et schémas stricts. Critères : mêmes paramètres dans éditeur/rendu/export, valeurs hors bornes rejetées, trois dispositions distinctes réalisables sans code arbitraire. Inclure fixtures avec emboîtement et responsive.

### CAT-02 — Dix blocs de référence

Propriétaire : designer/catalogue. Dépendances : CAT-01, UX-01. RQ-04/08/14. Implémenter les dix blocs de CATALOGUE.md et les préréglages d'animation admis. Chaque bloc inclut états, mobile, clavier, contenu long, mouvement réduit et preuve de licence. Restaurant/portfolio/produit ne doivent pas dépendre d'un unique layout figé. AT-14/15/20.

### CAT-03 — Release immuable et profil Unslop

Propriétaire : catalogue + tech lead. Dépendances : CAT-02. RQ-08/14. Produire manifests avec hashes sources/assets/lockfile, profil et notices. Tester qu'une mise à jour du catalogue ne change pas une ancienne révision. Les règles esthétiques peuvent être adaptées, les locks sont respectés et les exceptions documentées. Aucun contenu tierce partie n'est admis sur la seule base de sa popularité.

## Tickets M1 — éditeur

### UX-01 — Primitives de l'outil et tokens

Propriétaire : design + frontend. Dépendance : ARC-03. Livrer mapping DESIGN.md -> styles, contrôles partagés, états et scroll. Critères : sélection distincte du thème de page, focus visible, menus utilisables au clavier, aucune duplication des valeurs normatives. Vérifier les popups ouverts et écran étroit ; ne pas limiter la recette au shell fermé.

### UI-01 — Puck contrôlé et inspecteur

Propriétaire : frontend. Dépendances : DOM-01, CAT-01, UX-01. RQ-04/05/09. Brancher la composition au contrôleur ; viewport mobile, sélection et champs réellement opérants. Critères : reload restitue le document confirmé ; une propriété affichée change le rendu ; un déplacement conserve les IDs ; la sélection n'apparaît pas dans l'export.

### UI-02 — Catalogue, navigation et alternatives

Propriétaire : frontend. Dépendances : UI-01, CAT-02. RQ-04/05. Rechercher/filtrer sans coût IA, naviguer pages et comparer des candidats. Critères : état vide/sans résultat/erreur, alternative tactile au survol, ajout au bon slot et position. Une cible non compatible est expliquée et non insérée silencieusement.

### UI-03 — Saisie réactive et suivi des jobs

Propriétaire : frontend + IA. Dépendances : UI-01, JOB-01, AI-01. RQ-02/03/07. Implémenter temporisation, IME, arrêt, reprise et causalité. Critères : aucune requête par frappe ; input reste utilisable ; événements dupliqués/hors ordre ignorés ; ancien résultat sans effet ; reconnect ne relance pas le fournisseur. Tests avec horloge et réseau contrôlés, puis vrai hôte. AT-01/02/03/07/08.

### UI-04 — Proposition et conservation atomique

Propriétaire : frontend + domaine. Dépendances : UI-03, DOM-02. RQ-03/06/12. Projection sans écriture du brouillon, Conserver/Refuser et promotion + réglage manuel atomiques. Critères : aucune proposition obsolète exportée ; conserver puis annuler restaure la composition ; cliquer sur un bloc de candidat permet son réglage après commit valide. Tester frappe ou deuxième onglet pendant la conservation. AT-04/05/06.

### UI-05 — Autosave, récupération et conflit

Propriétaire : frontend. Dépendances : UI-01, DOM-02, API-01. RQ-06/10. File ordonnée avec un appel en vol, statuts exacts et récupération limitée. Critères : pas de faux Sauvegardé, reload n'écrase pas un serveur plus récent, file arrêtée sur conflit, brouillon préservé après 401/timeout. AT-09/11/12.

## Tickets M1 — serveur et IA

### API-01 — Persistance et transports communs

Propriétaire : backend. Dépendances : DOM-02, ARC-02. RQ-01/10/13. Implémenter les opérations OpenAPI et wrappers MCP sur mêmes services. Critères : autorisation par ressource, erreurs communes, outputSchema conforme, aucune ressource UI retournée par les polls, HTTP et MCP produisent les mêmes résultats sur fixture. AT-16/17.

### JOB-01 — Cycle durable des tâches

Propriétaire : backend/plateforme. Dépendance : API-01. RQ-02/06/13. Queue durable en base, lease, événements paginés, annulation et issue inconnue. Critères : crash avant/après dispatch différencié ; pas de double appel sur replay ; curseur expiré récupérable ; proposition annulée jamais réactivée. AT-07/08/18.

### AI-01 — Adaptateur OpenAI

Propriétaire : backend IA. Dépendances : JOB-01, CAT-01. RQ-03/07. SDK officiel, sortie structurée et validation domaine, erreurs/usage normalisés. Critères : schéma incompatible refusé ; refus/timeout/quota traités ; réparation bornée ; résultat partiel non appliqué ; clés absentes de toutes sorties. Tests mocks par défaut ; essai réel volontaire et plafonné en intégration.

### AI-02 — Contexte, cibles et profil

Propriétaire : backend IA + designer. Dépendances : AI-01, CAT-03. RQ-08/12. Construire un contexte réduit avec page/sélection/locks/opérations autorisées et profil. Critères : instruction hostile dans un texte ne donne aucun accès ; demande locale ne modifie pas le thème global ; demande ambiguë propose des variantes. Conserver des briefs de référence et vérifier plusieurs cas, pas un seul prompt heureux.

### SEC-01 — Autorisations et contrôle d'usage

Propriétaire : backend + plateforme. Dépendances : ARC-02, API-01, JOB-01. RQ-13. Valider tokens/droits, chiffrement des secrets, réservations d'usage, plafonds et logs minimisés. Critères : accès croisé refusé pour toutes ressources ; dépassement bloque avant appel ; coût inconnu n'est pas zéro ; configuration de clé hors plugin/chat. AT-16/17/18.

### ASSET-01 — Ressources du projet

Propriétaire : backend + catalogue. Dépendances : API-01, SEC-01. RQ-04/14. Upload raster validé, empreinte, attribution et accès privé ; capacité hôte seulement si qualifiée. Critères : faux MIME et image excessive rejetés, asset d'un autre projet refusé, source immuable retrouvable à l'export. Alternative navigateur utilisable si transfert hôte indisponible. AT-19.

## Tickets M1 — versions, export et livraison

### REV-01 — Approbation, historique et restauration

Propriétaire : domaine/backend + frontend. Dépendances : DOM-02, UI-04. RQ-10. Révisions hors snapshots, parent immuable, comparaison et restauration en nouvelle révision. Critères : export lié à l'état exact approuvé ; snapshot inchangé après modification ultérieure ; restauration ne perd pas le head précédent. AT-10/13.

### EXP-01 — Export React depuis le catalogue

Propriétaire : export. Dépendances : DOM-01, CAT-03, REV-01. RQ-11. Générer projet, styles, ressources et notices depuis release + snapshot. Critères : pas de Puck/SDK modèles/bridge dans bundle exporté ; routes et interactions déclarées fonctionnelles ; dépendances verrouillées ; fonctionnalités non implémentées signalées. Ne pas laisser le modèle redessiner librement les blocs figés.

### EXP-02 — Construction et vérification isolées

Propriétaire : export/plateforme + QA. Dépendances : EXP-01, SEC-01, ASSET-01. RQ-11/13. Build propre, rendu et archive avec manifeste/hash. Critères : aucun secret ni accès production ; traversée de chemin rejetée ; erreurs de build/rendu empêchent le statut validé ; mêmes fixtures/tailles/polices pour aperçu et export. AT-20/21/22.

### OPS-01 — Déploiement et restauration

Propriétaire : plateforme. Dépendances : API-01, SEC-01, EXP-02. Déployer les environnements, métriques, alertes et sauvegardes. Critères : restauration DB+assets+releases exécutée, rollback d'application compatible, procédure de rotation de clé éprouvée. Fixer RPO/RTO avant production ; ne pas annoncer un objectif non testé. AT-23.

### TEST-01 — Recette transversale M1

Propriétaire : QA + produit. Commence après ARC-03 ; se termine après tous tickets M1. Mettre en place fixtures et tests de QA.md dès le début. Sortie : scénario complet dans ChatGPT + archive exécutée proprement + registre des limites connues. Un PASS de modèle, un screenshot ou un build seul ne remplace pas cette preuve.

## Tickets M2 / M3 non bloquants pour M1

| ID | Sujet | Condition de démarrage / acceptation |
|---|---|---|
| MOD-02 | Anthropic et Gemini | adaptateur commun stabilisé ; suite de conformité commune passée pour chaque modèle admis |
| HOST-02 | Claude et commande Claude Code | M1 éprouvé ; même projet et mêmes contrôles sans nouveau domaine métier |
| REV-02 | branches avancées | snapshots/reçus robustes ; branche/merge explicites, pas de fusion opaque |
| CAT-04 | animations enrichies | mesure par bloc, fallback et mouvement réduit |
| SCENE-01 | première scène 3D | assets immuables, budget GPU et alternative ; versions compatibles |
| EXPORT-03 | HTML/Astro/Vue/Svelte | matrice de capacités et besoins réels ; recette par cible avant promesse |
| BIZ-01 | diffusion commerciale | licences, support, règles d'hôte et modèle économique vérifiés ; aucune dépendance M1 |

## Critères de fin communs

Contrats et types à jour, tests succès/échec, critères RQ satisfaits, preuve navigateur si UI, limites documentées, aucune donnée secrète, revue d'intégration. Tout écart est une décision consignée. Les tickets prêts peuvent être estimés S/M/L puis découpés selon l'équipe ; aucune somme de points n'est convertie arbitrairement en calendrier.
