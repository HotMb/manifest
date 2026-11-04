import { readFileSync, writeFileSync, openSync, closeSync, unlinkSync, renameSync, realpathSync, statSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

export const roles = ['orchestrator', 'designer', 'frontend', 'backend', 'platform', 'qa'];
export const states = ['todo', 'ready', 'in_progress', 'review', 'done', 'blocked'];
const active = (ticket) => ['in_progress', 'review'].includes(ticket.status);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const cleanPath = (path) => typeof path === 'string' && path.length > 0 && !isAbsolute(path) && !/[\\:\0]/.test(path) && !path.split('/').some((part) => ['.', '..', '.git', 'node_modules', ''].includes(part.toLowerCase()));
const normalized = (path) => path.replace(/\/$/, '');
const overlaps = (a, b) => {
  // Comparaison conservatrice : des branches peuvent être reprises sous Windows.
  a = normalized(a).toLowerCase(); b = normalized(b).toLowerCase();
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
};

export function validateBoard(board) {
  assert(board?.schemaVersion === 1, 'schemaVersion doit être 1');
  if (board.productName !== undefined) assert(typeof board.productName === 'string' && board.productName.trim(), 'nom de produit invalide');
  assert(Number.isInteger(board.revision) && board.revision >= 0, 'révision de backlog invalide');
  assert(Array.isArray(board.tickets) && board.tickets.length > 0, 'backlog vide');
  const ids = new Set();
  for (const ticket of board.tickets) {
    assert(/^[A-Z]+-\d{2}$/.test(ticket.id) && !ids.has(ticket.id), `ID invalide ou doublon : ${ticket.id}`);
    ids.add(ticket.id);
    assert(typeof ticket.title === 'string' && ticket.title.trim(), `titre absent : ${ticket.id}`);
    assert(typeof ticket.phase === 'string' && ticket.phase.trim(), `phase absente : ${ticket.id}`);
    assert(roles.includes(ticket.owner), `propriétaire inconnu : ${ticket.id}`);
    assert(states.includes(ticket.status), `état inconnu : ${ticket.id}`);
    assert(Array.isArray(ticket.dependencies) && new Set(ticket.dependencies).size === ticket.dependencies.length, `dépendances invalides : ${ticket.id}`);
    assert(Array.isArray(ticket.ownedPaths) && ticket.ownedPaths.length > 0 && ticket.ownedPaths.every((p) => cleanPath(normalized(p))), `chemins invalides : ${ticket.id}`);
    assert(Array.isArray(ticket.acceptance) && ticket.acceptance.length > 0 && ticket.acceptance.every((s) => typeof s === 'string' && s.trim()), `critères absents : ${ticket.id}`);
    assert(Array.isArray(ticket.evidence) && ticket.evidence.every((p) => cleanPath(p) && p.startsWith('docs/evidence/')), `preuves invalides : ${ticket.id}`);
    if (['review', 'done'].includes(ticket.status)) assert(ticket.evidence.length > 0, `preuve requise : ${ticket.id}`);
    if (ticket.status === 'done') assert(roles.includes(ticket.reviewer) && ticket.reviewer !== ticket.owner && ticket.evidence.length >= 2, `revue indépendante requise : ${ticket.id}`);
  }
  const lookup = new Map(board.tickets.map((t) => [t.id, t]));
  for (const ticket of board.tickets) for (const id of ticket.dependencies) assert(ids.has(id) && id !== ticket.id, `dépendance inconnue ou soi-même : ${ticket.id} -> ${id}`);
  const done = new Set(), stack = new Set();
  function visit(id) {
    assert(!stack.has(id), `cycle de dépendances : ${id}`);
    if (done.has(id)) return;
    stack.add(id);
    for (const dep of lookup.get(id).dependencies) visit(dep);
    stack.delete(id); done.add(id);
  }
  for (const id of ids) visit(id);
  const running = board.tickets.filter(active);
  assert(running.length <= 3, 'limite WIP : trois tickets actifs');
  for (const ticket of board.tickets.filter((t) => active(t) || ['ready', 'done'].includes(t.status))) {
    assert(ticket.dependencies.every((id) => lookup.get(id).status === 'done'), `dépendances inachevées : ${ticket.id}`);
  }
  for (let i = 0; i < running.length; i++) for (let j = i + 1; j < running.length; j++) {
    assert(!running[i].ownedPaths.some((a) => running[j].ownedPaths.some((b) => overlaps(a, b))), `propriété en conflit : ${running[i].id}/${running[j].id}`);
  }
  return board;
}

export function eligibleTickets(board) {
  validateBoard(board);
  const done = new Set(board.tickets.filter((t) => t.status === 'done').map((t) => t.id));
  const running = board.tickets.filter(active);
  if (running.length >= 3) return [];
  return board.tickets.filter((t) => ['todo', 'ready'].includes(t.status) && t.dependencies.every((id) => done.has(id)) && !running.some((other) => t.ownedPaths.some((a) => other.ownedPaths.some((b) => overlaps(a, b)))));
}

export function verifyEvidence(root, path) {
  assert(cleanPath(path) && path.startsWith('docs/evidence/'), 'preuve attendue sous docs/evidence/');
  const base = realpathSync(root), target = realpathSync(resolve(root, path));
  const rel = relative(base, target);
  assert(rel && !isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`), 'preuve hors dépôt');
  const canonical = rel.split(sep).join('/');
  assert(canonical.startsWith('docs/evidence/'), 'preuve réelle hors docs/evidence/');
  assert(statSync(target).isFile() && statSync(target).size > 0, 'preuve absente ou vide');
  return canonical;
}

export function transition(board, command, id, options = {}, root) {
  validateBoard(board);
  assert(Number.isInteger(options.expectedRevision) && options.expectedRevision === board.revision, `conflit de révision : attendu ${options.expectedRevision}, actuel ${board.revision}`);
  const next = structuredClone(board);
  if (command === 'revise' || command === 'add') {
    assert(options.agent === 'orchestrator', 'seul orchestrator peut réviser le backlog');
    assert(typeof options.reason === 'string' && options.reason.trim().length >= 8, 'motif de révision explicite requis');
    assert(cleanPath(options.source) && options.source.startsWith('docs/delivery/changes/') && options.source.endsWith('.json'), 'source versionnée sous docs/delivery/changes/ requise');
    assert(options.patch && typeof options.patch === 'object' && !Array.isArray(options.patch), 'patch JSON requis');
    if (command === 'revise') {
      const ticket = next.tickets.find((t) => t.id === id);
      assert(ticket, `ticket inconnu : ${id}`);
      const allowed = new Set(['title', 'phase', 'owner', 'dependencies', 'ownedPaths', 'acceptance', 'blockers', 'reason']);
      const fields = Object.keys(options.patch);
      assert(fields.length > 0 && fields.every((field) => allowed.has(field)), 'champs de révision vides ou interdits');
      const from = ticket.status;
      Object.assign(ticket, structuredClone(options.patch));
      next.history ??= [];
      next.revision++;
      next.history.push({ revision: next.revision, ticketId: id, from, to: ticket.status, actor: options.agent, at: new Date().toISOString(), action: 'criteria_updated', fields, source: options.source, reason: options.reason.trim() });
      return validateBoard(next);
    }
    assert(/^[A-Z]+-\d{2}$/.test(id) && !next.tickets.some((t) => t.id === id), `ID invalide ou déjà utilisé : ${id}`);
    assert(options.patch.id === id, 'l’ID du ticket doit correspondre à celui de la commande');
    assert(options.patch.status === 'todo' || options.patch.status === 'ready', 'un nouveau ticket doit commencer todo ou ready');
    const ticket = structuredClone(options.patch);
    assert(!('reviewer' in ticket) && !('branch' in ticket) && ticket.evidence?.length === 0, 'un nouveau ticket ne peut recevoir branche, reviewer ou preuve préremplis');
    next.tickets.push(ticket);
    next.history ??= [];
    next.revision++;
    next.history.push({ revision: next.revision, ticketId: id, from: 'absent', to: ticket.status, actor: options.agent, at: new Date().toISOString(), action: 'ticket_added', source: options.source, reason: options.reason.trim() });
    return validateBoard(next);
  }
  const ticket = next.tickets.find((t) => t.id === id);
  assert(ticket, `ticket inconnu : ${id}`);
  const from = ticket.status;
  const depsDone = ticket.dependencies.every((dep) => next.tickets.find((t) => t.id === dep).status === 'done');
  let actor;
  if (command === 'claim') {
    assert(['todo', 'ready'].includes(from), 'ticket non disponible');
    assert(options.agent === ticket.owner, `rôle attendu : ${ticket.owner}`);
    assert(depsDone, 'dépendances inachevées');
    assert(next.tickets.filter(active).length < 3, 'limite WIP : trois tickets actifs');
    assert(!next.tickets.filter(active).some((t) => ticket.ownedPaths.some((a) => t.ownedPaths.some((b) => overlaps(a, b)))), 'propriété de fichiers en conflit');
    ticket.status = 'in_progress';
    ticket.branch = `work/${id.toLowerCase()}`;
    actor = options.agent;
  } else if (command === 'submit') {
    assert(from === 'in_progress', 'soumission attendue depuis in_progress');
    assert(options.agent === ticket.owner, `rôle attendu : ${ticket.owner}`);
    const evidence = verifyEvidence(root, options.evidence);
    ticket.evidence = [...new Set([...ticket.evidence, evidence])];
    ticket.status = 'review'; actor = options.agent;
  } else if (command === 'done') {
    assert(from === 'review', 'clôture attendue depuis review');
    assert(depsDone, 'dépendances inachevées');
    assert(roles.includes(options.reviewer) && options.reviewer !== ticket.owner, 'reviewer distinct du propriétaire requis');
    const evidence = verifyEvidence(root, options.evidence);
    assert(!ticket.evidence.some((path) => verifyEvidence(root, path).toLowerCase() === evidence.toLowerCase()), 'une preuve distincte de relecture est requise');
    ticket.evidence.push(evidence); ticket.reviewer = options.reviewer;
    ticket.status = 'done'; actor = options.reviewer;
  } else if (command === 'block' || command === 'reopen') {
    assert(options.agent === 'orchestrator', 'seul orchestrator arbitre blocage/réouverture');
    assert(typeof options.reason === 'string' && options.reason.trim().length >= 5, 'motif explicite requis');
    if (command === 'block') {
      assert(from !== 'done', 'rouvrir avant de bloquer un ticket terminé');
      ticket.status = 'blocked';
    } else {
      assert(['blocked', 'review', 'done'].includes(from), 'réouverture depuis blocked/review/done');
      const dependent = next.tickets.find((t) => (active(t) || t.status === 'done') && t.dependencies.includes(id));
      assert(!dependent, `réouvrir les consommateurs d'abord : ${dependent?.id}`);
      ticket.status = 'todo'; delete ticket.reviewer;
    }
    ticket.reason = options.reason.trim(); actor = options.agent;
  } else throw new Error(`commande inconnue : ${command}`);
  next.revision++;
  next.history ??= [];
  next.history.push({ revision: next.revision, ticketId: id, from, to: ticket.status, actor, at: new Date().toISOString(), ...(options.reason ? { reason: options.reason } : {}) });
  return validateBoard(next);
}

export function renderBoard(board) {
  const ready = new Set(eligibleTickets(board).map((t) => t.id));
  return `# ${board.productName ?? 'Manifest'} — tableau de livraison\n\nVue générée depuis tickets.json, révision ${board.revision}. GitHub Issues est un miroir ; les preuves restent dans Git.\n\n| Ticket | Phase | Responsable | État | Dépendances |\n|---|---|---|---|---|\n` + board.tickets.map((t) => `| ${t.id} — ${t.title.replaceAll('|', '/')} | ${t.phase} | ${t.owner} | ${t.status}${ready.has(t.id) ? ' (éligible)' : ''} | ${t.dependencies.join(', ') || '—'} |`).join('\n') + '\n';
}

export function mutateFile(root, command, id, options) {
  const path = resolve(root, 'docs/delivery/tickets.json'), lock = `${path}.lock`;
  const fd = openSync(lock, 'wx');
  const temporary = `${path}.${randomUUID()}.tmp`;
  let temporaryCreated = false;
  try {
    writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    const board = JSON.parse(readFileSync(path, 'utf8'));
    const result = transition(board, command, id, options, root);
    writeFileSync(temporary, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
    temporaryCreated = true;
    renameSync(temporary, path);
    return result;
  } finally {
    if (temporaryCreated) {
      try { unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    closeSync(fd); unlinkSync(lock);
  }
}

export function renderFile(root) {
  const path = resolve(root, 'docs/delivery/tickets.json'), lock = `${path}.lock`;
  const fd = openSync(lock, 'wx');
  const destination = resolve(root, 'docs/delivery/BOARD.md');
  const temporary = `${destination}.${randomUUID()}.tmp`;
  let temporaryCreated = false;
  try {
    writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    // Relire après le lock : aucun renderer ne publie une ancienne lecture.
    const current = validateBoard(JSON.parse(readFileSync(path, 'utf8')));
    writeFileSync(temporary, renderBoard(current), { flag: 'wx' });
    temporaryCreated = true;
    renameSync(temporary, destination);
  } finally {
    if (temporaryCreated) {
      try { unlinkSync(temporary); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    closeSync(fd); unlinkSync(lock);
  }
}

function optionsFrom(args) {
  const result = {};
  const keys = { '--expected-revision': 'expectedRevision', '--agent': 'agent', '--reviewer': 'reviewer', '--evidence': 'evidence', '--reason': 'reason', '--patch-file': 'patchFile' };
  for (let i = 0; i < args.length; i += 2) {
    const key = keys[args[i]];
    assert(key && args[i + 1] !== undefined && !args[i + 1].startsWith('--') && !(key in result), `option invalide : ${args[i]}`);
    result[key] = key === 'expectedRevision' ? Number(args[i + 1]) : args[i + 1];
  }
  return result;
}

function readGovernancePatch(root, options) {
  if (!options.patchFile) return options;
  const patchPath = options.patchFile;
  assert(cleanPath(patchPath) && patchPath.startsWith('docs/delivery/changes/') && patchPath.endsWith('.json'), 'patch attendu en JSON sous docs/delivery/changes/');
  const base = realpathSync(resolve(root, 'docs/delivery/changes'));
  const target = realpathSync(resolve(root, patchPath));
  const rel = relative(base, target);
  assert(rel && !isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`), 'patch hors docs/delivery/changes');
  assert(statSync(target).isFile() && statSync(target).size > 0, 'patch absent ou vide');
  return { ...options, patch: JSON.parse(readFileSync(target, 'utf8')), source: patchPath };
}

function main() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const [command = 'status', id, ...args] = process.argv.slice(2);
  const path = resolve(root, 'docs/delivery/tickets.json');
  const board = validateBoard(JSON.parse(readFileSync(path, 'utf8')));
  if (command === 'check') {
    for (const t of board.tickets) for (const proof of t.evidence) verifyEvidence(root, proof);
    assert(readFileSync(resolve(root, 'docs/delivery/BOARD.md'), 'utf8') === renderBoard(board), 'BOARD.md périmé : lancer npm run team:board');
    console.log(`Backlog valide : ${board.tickets.length} tickets, révision ${board.revision}.`);
  } else if (command === 'render') {
    renderFile(root);
    console.log('BOARD.md régénéré.');
  } else if (command === 'status') {
    console.log(renderBoard(board));
  } else if (command === 'next') {
    console.log(`Révision ${board.revision} — ${board.tickets.filter(active).length}/3 tickets actifs`);
    const candidates = eligibleTickets(board);
    for (const t of candidates) console.log(`${t.id} [${t.owner}] ${t.title}`);
    if (!candidates.length) console.log('Aucun nouveau ticket éligible. Examiner les tickets actifs ou bloqués.');
  } else {
    const options = readGovernancePatch(root, optionsFrom(args));
    const result = mutateFile(root, command, id, options);
    const ticket = result.tickets.find((t) => t.id === id);
    console.log(`${id} : ${ticket?.status ?? 'ajouté'} ; révision ${result.revision}. Régénérer BOARD.md puis committer avec la preuve.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
