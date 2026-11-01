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

Sous macOS/Linux, remplacer le chemin Python par `.venv/bin/python`. Les tests concernent l'outillage et les contrats ; l'application n'a pas encore de commande de démarrage.

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
