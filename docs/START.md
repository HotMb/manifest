# Démarrage

## Préparer le poste

Node.js 24, Python 3.11 ou plus récent (CI : 3.13), Git et Codex connecté. Le bootstrap Node ne dépend d'aucun paquet tiers. Les validateurs Python sont verrouillés dans requirements-dev.txt. Aucune clé d'API modèle n'est nécessaire pour les contrôles de démarrage.

Depuis la racine du dépôt :

```sh
npm ci
python -m venv .venv
```

Sous Windows PowerShell :

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
npm test
npm run check
.\.venv\Scripts\python.exe scripts/check_contracts.py
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_*.py' -v
```

Sous macOS/Linux, remplacer le chemin Python par `.venv/bin/python`. Ces commandes contrôlent l'outillage et les contrats ; les vérifications du prototype se lancent séparément ci-dessous.

## Démonstration locale M0

```sh
npm ci
npm run dev
```

Ouvrir `http://127.0.0.1:5173`. L'éditeur permet de modifier le Hero et les trois couleurs, d'annuler/rétablir et d'enregistrer un brouillon local. Le libellé distingue ce diagnostic du serveur. Aucune suggestion IA ni aucun export de code n'est simulé. Ne pas utiliser ce prototype pour des données importantes : la persistance du produit n'est pas encore livrée.

```sh
npm run typecheck
npm run build
npm run test:m0
npm run test:e2e
```

Le build doit précéder les tests M0 : une vérification lit réellement l'HTML construit à travers le serveur MCP. Les tests navigateur emploient Chrome installé localement ; la CI installe Chromium. Si Chrome n'est pas disponible, installer un navigateur Playwright et adapter le canal de test au poste, sans masquer les échecs.

Pour préparer la qualification dans un hôte MCP local, construire la vue puis configurer le client avec le lancement direct suivant depuis la racine du dépôt :

```sh
node --import tsx services/api/src/main.ts --stdio
```

Voir [le contrat du serveur M0](../services/api/README.md) pour HTTP et les limites d'authentification. Aucun serveur M0 n'est inscrit automatiquement dans les paramètres globaux de l'utilisateur. Une connexion du vrai client et la grille M0 doivent être éprouvées avant clôture ARC-01 ; le seul lancement du processus ne le prouve pas. Ne pas exposer le transport de développement sur Internet.

## Ouvrir l'équipe

Ouvrir le dossier dans Codex, laisser le client appliquer sa politique de confiance, puis demander à l'orchestrateur de reprendre le prochain ticket. Les six profils se trouvent dans `.codex/agents/`. Ne pas activer une permission globale pour résoudre un simple problème de chemin.

En terminal :

```sh
npm run team:brief
npm run team:start
```

La première commande affiche le brief. La seconde ouvre Codex en mode interactif : les modèles et limites du compte s'appliquent. Elle n'utilise aucun contournement d'autorisation et n'installe aucun démon. Ces profils peuvent nécessiter une nouvelle session pour être découverts. Dans le chat de bootstrap existant, les spécialistes ont reçu leurs responsabilités directement.

## Première tranche

Lire [STATUS.md](STATUS.md), puis `npm run team:next`. Commencer ARC-01 et la grille M0. Un test navigateur local peut isoler un problème mais ne termine pas la qualification ChatGPT. Si l'accès hôte ou l'identité manque, consigner le besoin et conserver la preuve comme non exécutée. Le travail de bootstrap prépare ARC-03 sans contourner ses dépendances.
