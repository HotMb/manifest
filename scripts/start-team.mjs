import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const prompt = `Agis comme orchestrator de Design Workbench. Lis AGENTS.md, docs/TEAM.md, docs/STATUS.md, docs/delivery/ORCHESTRATION.md et le backlog. Vérifie Git puis npm run team:next. Sélectionne un ticket éligible et avance concrètement avec designer, frontend, backend, platform et qa selon le besoin, au plus trois sous-agents en parallèle et propriété exclusive des fichiers. Hérite du modèle courant. Après chaque tâche, tiens la réunion asynchrone avec les contributions réelles des agents concernés, consigne résultat, tests, dettes attribuées, décisions et verdict dans docs/meetings/, puis donne la synthèse à l'utilisateur. Après au plus trois tickets intégrés ou un blocage nécessitant l'utilisateur, laisse une passation en français avec preuves, limites et prochaine action. Ne termine pas ARC-01/02 sans preuve dans le vrai hôte et d'identité. Ne déploie pas ni ne lance d'appel API fournisseur payant sans autorisation. Respecte les contrôles habituels et ne contourne pas les permissions.`;

// Lecture locale seulement : l'option --print ne démarre aucune inférence.
JSON.parse(readFileSync(resolve(root, 'docs/delivery/tickets.json'), 'utf8'));
if (process.argv.includes('--print')) {
  console.log(prompt);
} else {
  const child = spawn('codex', ['--cd', root, prompt], { stdio: 'inherit', shell: false });
  child.on('error', (error) => {
    console.error(`Impossible d'ouvrir Codex : ${error.message}. Ouvre ce dossier dans l'application ou installe le CLI.`);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
}
