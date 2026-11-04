import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, existsSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBoard, eligibleTickets, transition, mutateFile, renderBoard, renderFile, verifyEvidence } from '../scripts/board.mjs';

const scratch = fileURLToPath(new URL('../.team/tests/', import.meta.url));
mkdirSync(scratch, { recursive: true });
function ticket(id, owner = 'frontend', dependencies = [], ownedPaths = [`packages/${id}/`]) {
  return { id, title: `Ticket ${id}`, phase: 'M0', owner, dependencies, ownedPaths, acceptance: ['Résultat vérifié'], evidence: [], status: 'todo' };
}
const board = (...tickets) => ({ schemaVersion: 1, revision: 0, tickets });
function fixture(b = board(ticket('ARC-01'))) {
  const root = mkdtempSync(join(scratch, 'case-'));
  mkdirSync(join(root, 'docs/delivery'), { recursive: true });
  mkdirSync(join(root, 'docs/evidence'), { recursive: true });
  writeFileSync(join(root, 'docs/delivery/tickets.json'), JSON.stringify(b));
  writeFileSync(join(root, 'docs/evidence/implementation.md'), 'Résultat et limites vérifiés par le propriétaire.');
  writeFileSync(join(root, 'docs/evidence/review.md'), 'Reproduction et verdict de revue distincts.');
  return root;
}
const claim = (b, id = 'ARC-01') => transition(b, 'claim', id, { expectedRevision: b.revision, agent: b.tickets.find((t) => t.id === id).owner });

test('seuls les tickets sans dépendance inachevée sont éligibles', () => {
  const b = board(ticket('ARC-01'), ticket('ARC-02', 'backend', ['ARC-01']));
  assert.deepEqual(eligibleTickets(b).map((t) => t.id), ['ARC-01']);
});
test('graphe cyclique refusé', () => {
  assert.throws(() => validateBoard(board(ticket('ARC-01', 'frontend', ['ARC-02']), ticket('ARC-02', 'backend', ['ARC-01']))), /cycle/);
});
test('ID dupliqué ou dépendance inconnue refusés', () => {
  assert.throws(() => validateBoard(board(ticket('ARC-01'), ticket('ARC-01'))), /doublon/);
  assert.throws(() => validateBoard(board(ticket('ARC-01', 'frontend', ['UNK-99']))), /inconnue/);
});
test('révision périmée refuse sans modifier entrée', () => {
  const b = board(ticket('ARC-01')), before = structuredClone(b);
  assert.throws(() => transition(b, 'claim', 'ARC-01', { agent: 'frontend', expectedRevision: 5 }), /conflit de révision/);
  assert.deepEqual(b, before);
});
test('mauvais rôle et ticket non éligible refusés', () => {
  const b = board(ticket('ARC-01'), ticket('ARC-02', 'backend', ['ARC-01']));
  assert.throws(() => transition(b, 'claim', 'ARC-01', { agent: 'backend', expectedRevision: 0 }), /rôle attendu/);
  assert.throws(() => claim(b, 'ARC-02'), /dépendances/);
});
test('chemins parent/enfant ne peuvent être attribués simultanément', () => {
  let b = board(ticket('ARC-01', 'frontend', [], ['packages/editor/']), ticket('ARC-02', 'backend', [], ['packages/editor/input.mjs']));
  b = claim(b);
  assert.throws(() => claim(b, 'ARC-02'), /propriété/);
});
test('alias de chemin refusés et casse des propriétés comparée', () => {
  assert.throws(() => validateBoard(board(ticket('ARC-01', 'frontend', [], ['./packages/editor']))), /chemins invalides/);
  assert.throws(() => validateBoard(board(ticket('ARC-01', 'frontend', [], ['packages/editor/./button.mjs']))), /chemins invalides/);
  let b = board(ticket('ARC-01', 'frontend', [], ['packages/Editor']), ticket('ARC-02', 'backend', [], ['packages/editor/button.mjs']));
  b = claim(b);
  assert.throws(() => claim(b, 'ARC-02'), /propriété/);
  assert.deepEqual(eligibleTickets(b), []);
});
test('trois tickets actifs au maximum', () => {
  let b = board(...[1, 2, 3, 4].map((i) => ticket(`ARC-0${i}`)));
  for (const id of ['ARC-01', 'ARC-02', 'ARC-03']) b = claim(b, id);
  assert.throws(() => claim(b, 'ARC-04'), /limite WIP/);
});
test('soumission exige un fichier preuve existant', () => {
  const root = fixture(), b = claim(board(ticket('ARC-01')));
  assert.throws(() => transition(b, 'submit', 'ARC-01', { agent: 'frontend', expectedRevision: 1, evidence: 'docs/evidence/absent.md' }, root), /ENOENT/);
});
test('chemins de preuve hors périmètre et fichiers vides refusés', () => {
  const root = fixture();
  assert.throws(() => verifyEvidence(root, '../secret.txt'), /preuve attendue/);
  assert.throws(() => verifyEvidence(root, 'docs/evidence/../../secret.txt'), /preuve attendue/);
  writeFileSync(join(root, 'docs/evidence/empty.md'), '');
  assert.throws(() => verifyEvidence(root, 'docs/evidence/empty.md'), /vide/);
});
test('une preuve ne peut pointer hors du dossier de preuves via un lien', (t) => {
  const root = fixture();
  mkdirSync(join(root, 'other'));
  writeFileSync(join(root, 'other/note.md'), 'Ceci ne se trouve pas dans les preuves.');
  try { symlinkSync(join(root, 'other'), join(root, 'docs/evidence/link'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) return t.skip('Création de liens non autorisée sur ce poste'); throw error; }
  assert.throws(() => verifyEvidence(root, 'docs/evidence/link/note.md'), /hors docs\/evidence/);
});
test('clôture directe et auto-approbation refusées', () => {
  const root = fixture();
  let b = claim(board(ticket('ARC-01')));
  assert.throws(() => transition(b, 'done', 'ARC-01', { reviewer: 'qa', expectedRevision: 1, evidence: 'docs/evidence/review.md' }, root), /depuis review/);
  b = transition(b, 'submit', 'ARC-01', { agent: 'frontend', expectedRevision: 1, evidence: 'docs/evidence/implementation.md' }, root);
  assert.throws(() => transition(b, 'done', 'ARC-01', { reviewer: 'frontend', expectedRevision: 2, evidence: 'docs/evidence/review.md' }, root), /reviewer distinct/);
});
test('une preuve distincte de revue est requise', () => {
  const root = fixture();
  let b = claim(board(ticket('ARC-01')));
  b = transition(b, 'submit', 'ARC-01', { agent: 'frontend', expectedRevision: 1, evidence: 'docs/evidence/implementation.md' }, root);
  assert.throws(() => transition(b, 'done', 'ARC-01', { reviewer: 'qa', expectedRevision: 2, evidence: 'docs/evidence/implementation.md' }, root), /distincte/);
  assert.throws(() => transition(b, 'done', 'ARC-01', { reviewer: 'qa', expectedRevision: 2, evidence: 'docs/evidence/./implementation.md' }, root), /preuve attendue/);
});
test('parcours complet ouvre le dépendant et conserve une trace', () => {
  const root = fixture();
  let b = claim(board(ticket('ARC-01'), ticket('ARC-02', 'backend', ['ARC-01'])));
  b = transition(b, 'submit', 'ARC-01', { agent: 'frontend', expectedRevision: 1, evidence: 'docs/evidence/implementation.md' }, root);
  b = transition(b, 'done', 'ARC-01', { reviewer: 'qa', expectedRevision: 2, evidence: 'docs/evidence/review.md' }, root);
  assert.equal(b.revision, 3);
  assert.equal(b.history.length, 3);
  assert.deepEqual(eligibleTickets(b).map((t) => t.id), ['ARC-02']);
  assert.match(renderBoard(b), /ARC-02.*éligible/);
});
test('réouvrir un producteur actif refuse tant que son consommateur est actif', () => {
  const root = fixture();
  let b = claim(board(ticket('ARC-01'), ticket('ARC-02', 'backend', ['ARC-01'])));
  b = transition(b, 'submit', 'ARC-01', { agent: 'frontend', expectedRevision: 1, evidence: 'docs/evidence/implementation.md' }, root);
  b = transition(b, 'done', 'ARC-01', { reviewer: 'qa', expectedRevision: 2, evidence: 'docs/evidence/review.md' }, root);
  b = claim(b, 'ARC-02');
  assert.throws(() => transition(b, 'reopen', 'ARC-01', { agent: 'orchestrator', reason: 'Régression à corriger', expectedRevision: 4 }), /consommateurs/);
});
test('blocage motivé puis reprise n’invente aucune clôture', () => {
  let b = board(ticket('ARC-01'));
  assert.throws(() => transition(b, 'block', 'ARC-01', { agent: 'frontend', expectedRevision: 0, reason: 'Accès manquant' }), /orchestrator/);
  b = transition(b, 'block', 'ARC-01', { agent: 'orchestrator', expectedRevision: 0, reason: 'Accès hôte manquant' });
  assert.deepEqual(eligibleTickets(b), []);
  b = transition(b, 'reopen', 'ARC-01', { agent: 'orchestrator', expectedRevision: 1, reason: 'Accès hôte disponible' });
  assert.equal(b.tickets[0].status, 'todo');
});
test('révision de critères CAS, journalisée et protégée aux champs autorisés', () => {
  const b = board(ticket('ARC-01'));
  const revised = transition(b, 'revise', 'ARC-01', {
    agent: 'orchestrator', expectedRevision: 0, reason: 'Rendre le debounce automatique obligatoire', source: 'docs/delivery/changes/REV-15-ui-03.json',
    patch: { acceptance: ['Après une pause de 1,5 s, la génération se lance automatiquement.'] },
  });
  assert.equal(revised.revision, 1);
  assert.deepEqual(revised.tickets[0].acceptance, ['Après une pause de 1,5 s, la génération se lance automatiquement.']);
  assert.equal(revised.history[0].action, 'criteria_updated');
  assert.deepEqual(revised.history[0].fields, ['acceptance']);
  assert.throws(() => transition(revised, 'revise', 'ARC-01', { agent: 'orchestrator', expectedRevision: 1, reason: 'Ne pas respecter les garde-fous', source: 'docs/delivery/changes/REV-16-invalid.json', patch: { status: 'done' } }), /champs.*interdits/);
  assert.throws(() => transition(b, 'revise', 'ARC-01', { agent: 'orchestrator', expectedRevision: 8, reason: 'Révision périmée', patch: { title: 'Autre' } }), /conflit de révision/);
});
test('ajout ticket versionné valide dépendances, critères et journal', () => {
  const b = board(ticket('ARC-01'));
  const added = transition(b, 'add', 'GEN-01', {
    agent: 'orchestrator', expectedRevision: 0, reason: 'Débloquer le parcours réactif M0', source: 'docs/delivery/changes/REV-15-gen-01.json',
    patch: { id: 'GEN-01', title: 'Boucle de conception réactive', phase: 'M0', owner: 'frontend', dependencies: [], ownedPaths: ['apps/editor-web/', 'tests/e2e/intent/', 'docs/evidence/GEN-01'], acceptance: ['Le brief se relit automatiquement après 1,5 s.'], evidence: [], blockers: [], status: 'ready' },
  });
  assert.equal(added.revision, 1);
  assert.deepEqual(eligibleTickets(added).map((t) => t.id), ['ARC-01', 'GEN-01']);
  assert.equal(added.history[0].action, 'ticket_added');
  assert.throws(() => transition(added, 'add', 'GEN-02', { agent: 'orchestrator', expectedRevision: 1, reason: 'Ajouter une entrée invalide', source: 'docs/delivery/changes/REV-16-invalid.json', patch: { id: 'GEN-02', title: 'Invalide', phase: 'M0', owner: 'frontend', dependencies: ['NO-99'], ownedPaths: ['apps/editor-web/'], acceptance: ['test'], evidence: [], status: 'ready' } }), /dépendance inconnue/);
});
test('écriture CAS atomique : un seul gagnant et lock libéré', () => {
  const root = fixture();
  mutateFile(root, 'claim', 'ARC-01', { agent: 'frontend', expectedRevision: 0 });
  const path = join(root, 'docs/delivery/tickets.json'), before = readFileSync(path, 'utf8');
  assert.throws(() => mutateFile(root, 'claim', 'ARC-01', { agent: 'frontend', expectedRevision: 0 }), /conflit de révision/);
  assert.equal(readFileSync(path, 'utf8'), before);
  assert.equal(existsSync(`${path}.lock`), false);
});
test('lock existant refuse une deuxième mutation et reste intact', () => {
  const root = fixture(), lock = join(root, 'docs/delivery/tickets.json.lock');
  writeFileSync(lock, 'autre processus');
  assert.throws(() => mutateFile(root, 'claim', 'ARC-01', { agent: 'frontend', expectedRevision: 0 }), /EEXIST/);
  assert.equal(readFileSync(lock, 'utf8'), 'autre processus');
});
test('une mutation refusée ne supprime pas un temporaire préexistant', () => {
  const root = fixture(), stale = join(root, `docs/delivery/tickets.json.${process.pid}.tmp`);
  writeFileSync(stale, 'Contenu préexistant à préserver.');
  assert.throws(() => mutateFile(root, 'claim', 'ARC-01', { agent: 'frontend', expectedRevision: 999 }), /conflit de révision/);
  assert.equal(readFileSync(stale, 'utf8'), 'Contenu préexistant à préserver.');
});
test('le renderer respecte le verrou des mutations', () => {
  const root = fixture(), lock = join(root, 'docs/delivery/tickets.json.lock');
  writeFileSync(lock, 'Processus actif');
  assert.throws(() => renderFile(root), /EEXIST/);
  assert.equal(existsSync(join(root, 'docs/delivery/BOARD.md')), false);
});
test('le renderer relit et publie la dernière révision puis libère le verrou', () => {
  const root = fixture(), output = join(root, 'docs/delivery/BOARD.md');
  renderFile(root);
  assert.match(readFileSync(output, 'utf8'), /révision 0/);
  const current = mutateFile(root, 'claim', 'ARC-01', { agent: 'frontend', expectedRevision: 0 });
  renderFile(root);
  assert.equal(readFileSync(output, 'utf8'), renderBoard(current));
  assert.equal(existsSync(join(root, 'docs/delivery/tickets.json.lock')), false);
});
