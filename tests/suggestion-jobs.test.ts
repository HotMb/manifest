import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  DETERMINISTIC_SIMULATOR_DESCRIPTOR,
  ModelSuggestionOrchestrator,
  createDeterministicModelAdapter,
  applyOperations,
  initialProject,
  makeEditCommand,
  stableStringify,
} from '@design-workbench/m0-contract';
import { heroProject } from './fixtures/m0-project.ts';
import { MemoryProjectStore } from '../services/api/src/domain.ts';
import { SuggestionJobException, SuggestionJobManager } from '../services/api/src/suggestion-jobs.ts';
import { createDesignerMcpServer } from '../services/api/src/mcp.ts';
import { createDesignerHttpServer } from '../services/api/src/http.ts';

function setup(delayMs = 0, empty = false) {
  const store = new MemoryProjectStore(empty ? initialProject() : heroProject());
  const descriptor = { ...DETERMINISTIC_SIMULATOR_DESCRIPTOR, status: 'configured' as const };
  const adapter = createDeterministicModelAdapter(delayMs);
  const orchestrator = new ModelSuggestionOrchestrator({ registry: { schemaVersion: 1, providers: [descriptor] }, adapters: [adapter] });
  return { store, jobs: new SuggestionJobManager(store, orchestrator) };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: 'suggestion-1',
    expectedDraftVersion: 0,
    editorSessionId: 'editor-session-1',
    intentEpoch: 1,
    intent: 'Sans animation',
    provider: 'custom' as const,
    model: 'manifest-simulator-v1',
    mode: 'auto' as const,
    selectedPageId: 'page-home',
    selectedBlockId: null,
    ...overrides,
  };
}

test('un candidat insère le premier Hero dans la projection puis seulement sur conservation', async () => {
  const { store, jobs } = setup(0, true);
  const before = store.read('project-m0');
  const started = jobs.start('project-m0', input({ intent: 'Titre : Ma première page\nFondu' }));
  const done = await jobs.waitForCompletion(started.jobId);
  assert.equal(done.state, 'succeeded');
  const proposal = jobs.readProposal(done.proposalIds[0]!);
  assert.equal(proposal.operations[0]?.op, 'insert_block');
  const projection = applyOperations(before.snapshot, proposal.operations);
  assert.equal(projection.pages[0]!.composition.content[0]!.props.title, 'Ma première page');
  assert.deepEqual(store.read('project-m0'), before);
  const decision = jobs.keepProposal(proposal.id);
  assert.deepEqual(decision.project.snapshot, projection);
  assert.equal(decision.project.draftVersion, 1);
  assert.deepEqual(jobs.keepProposal(proposal.id), decision);
});

test('ignorer un candidat initial laisse le document et son hash vides', async () => {
  const { store, jobs } = setup(0, true);
  const before = store.read('project-m0');
  const started = jobs.start('project-m0', input({ intent: 'Titre : Un candidat temporaire' }));
  const done = await jobs.waitForCompletion(started.jobId);
  assert.equal(jobs.rejectProposal(done.proposalIds[0]!).status, 'rejected');
  assert.deepEqual(store.read('project-m0'), before);
});

test('une insertion manuelle rend le candidat initial obsolète sans écraser le bloc', async () => {
  const { store, jobs } = setup(0, true);
  const started = jobs.start('project-m0', input({ intent: 'Titre : Candidat modèle' }));
  const done = await jobs.waitForCompletion(started.jobId);
  const proposal = jobs.readProposal(done.proposalIds[0]!);
  const before = store.read('project-m0');
  const manual = applyOperations(before.snapshot, proposal.operations);
  manual.pages[0]!.composition.content[0]!.props.title = 'Ajout manuel conservé';
  store.commit(makeEditCommand(before, manual, 'manual-first-block'));
  assert.throws(() => jobs.keepProposal(proposal.id), (error: unknown) => error instanceof SuggestionJobException && error.code === 'VERSION_CONFLICT');
  assert.deepEqual(store.read('project-m0').snapshot, manual);
  assert.equal(jobs.readProposal(proposal.id).status, 'stale');
});

test('la frontière job refuse aussi un adaptateur injecté ciblant un bloc absent', async () => {
  const store = new MemoryProjectStore();
  const adapter = createDeterministicModelAdapter();
  const invalidAdapter = { ...adapter, async suggest(request: Parameters<typeof adapter.suggest>[0]) {
    const result = await adapter.suggest(request);
    return { ...result, operations: [{ op: 'update_props' as const, pageId: 'page-home', blockId: 'absent', props: { title: 'Impossible' } }] };
  } };
  const orchestrator = new ModelSuggestionOrchestrator({ registry: { schemaVersion: 1, providers: [DETERMINISTIC_SIMULATOR_DESCRIPTOR] }, adapters: [invalidAdapter] });
  const jobs = new SuggestionJobManager(store, orchestrator);
  const job = jobs.start('project-m0', input());
  const done = await jobs.waitForCompletion(job.jobId);
  assert.equal(done.state, 'failed');
  assert.equal(done.error?.code, 'PROVIDER_REFUSAL');
  assert.deepEqual(done.proposalIds, []);
  assert.deepEqual(store.read('project-m0').snapshot.pages[0]!.composition.content, []);
});

test('le job produit une proposition ordonnée sans enregistrer le brouillon', async () => {
  const { store, jobs } = setup();
  const before = store.read('project-m0');
  const started = jobs.start('project-m0', input());
  assert.equal(started.state, 'queued');
  const done = await jobs.waitForCompletion(started.jobId);
  assert.equal(done.state, 'succeeded');
  assert.equal(store.read('project-m0').draftVersion, before.draftVersion);
  assert.equal(stableStringify(store.read('project-m0').snapshot), stableStringify(before.snapshot));
  const events = jobs.getUpdates(started.jobId);
  assert.deepEqual(events.events.map((event) => event.type), ['queued', 'started', 'proposal_ready', 'succeeded']);
  assert.deepEqual(events.events.map((event) => event.seq), [1, 2, 3, 4]);
  const proposal = jobs.readProposal(done.proposalIds[0]!);
  assert.equal(proposal.status, 'ready');
  assert.equal(proposal.baseDraftVersion, 0);
  assert.equal(proposal.operations[0]?.op, 'update_props');
});

test('conserver une proposition l’applique une fois au brouillon et reste rejouable', async () => {
  const { store, jobs } = setup();
  const started = jobs.start('project-m0', input());
  await jobs.waitForCompletion(started.jobId);
  const proposal = jobs.readProposal(jobs.get(started.jobId).proposalIds[0]!);
  const first = jobs.keepProposal(proposal.id);
  const retry = jobs.keepProposal(proposal.id);
  assert.deepEqual(retry, first);
  assert.equal(first.proposal.status, 'kept');
  assert.equal(first.project.draftVersion, 1);
  assert.equal(store.read('project-m0').snapshot.pages[0]!.composition.content[0]!.props.animation, 'none');
  assert.equal(jobs.getUpdates(started.jobId).events.at(-1)?.type, 'proposal_kept');
});

test('garder une proposition sur une version plus ancienne la marque obsolète sans écraser le brouillon', async () => {
  const { store, jobs } = setup();
  const started = jobs.start('project-m0', input());
  await jobs.waitForCompletion(started.jobId);
  const proposal = jobs.readProposal(jobs.get(started.jobId).proposalIds[0]!);
  const current = store.read('project-m0'), changed = structuredClone(current.snapshot);
  changed.pages[0]!.composition.content[0]!.props.title = 'Modification plus récente';
  store.commit(makeEditCommand(current, changed, 'newer-manual-edit'));
  assert.throws(() => jobs.keepProposal(proposal.id), (error: unknown) => error instanceof SuggestionJobException && error.code === 'VERSION_CONFLICT');
  assert.equal(jobs.readProposal(proposal.id).status, 'stale');
  assert.equal(store.read('project-m0').snapshot.pages[0]!.composition.content[0]!.props.title, 'Modification plus récente');
});

test('ignorer une proposition est rejouable et ne modifie pas le brouillon', async () => {
  const { store, jobs } = setup();
  const before = store.read('project-m0');
  const started = jobs.start('project-m0', input());
  await jobs.waitForCompletion(started.jobId);
  const proposalId = jobs.get(started.jobId).proposalIds[0]!;
  assert.deepEqual(jobs.rejectProposal(proposalId), jobs.rejectProposal(proposalId));
  assert.equal(jobs.readProposal(proposalId).status, 'rejected');
  assert.equal(store.read('project-m0').contentHash, before.contentHash);
  assert.equal(jobs.getUpdates(started.jobId).events.at(-1)?.type, 'proposal_rejected');
});

test('marquer une proposition ancienne ne la rejette pas et interdit ensuite sa conservation', async () => {
  const { store, jobs } = setup();
  const before = store.read('project-m0');
  const started = jobs.start('project-m0', input());
  await jobs.waitForCompletion(started.jobId);
  const proposalId = jobs.get(started.jobId).proposalIds[0]!;
  assert.equal(jobs.markProposalStale(proposalId).status, 'stale');
  assert.equal(jobs.markProposalStale(proposalId).status, 'stale');
  assert.throws(() => jobs.keepProposal(proposalId), (error: unknown) => error instanceof SuggestionJobException && error.code === 'VERSION_CONFLICT');
  assert.equal(jobs.readProposal(proposalId).status, 'stale');
  assert.equal(store.read('project-m0').contentHash, before.contentHash);
  assert.equal(jobs.getUpdates(started.jobId).events.at(-1)?.type, 'proposal_stale');
});

test('une clé rejouée retourne le job initial, une autre demande produit un conflit', async () => {
  const { jobs } = setup();
  const first = jobs.start('project-m0', input());
  await jobs.waitForCompletion(first.jobId);
  assert.deepEqual(jobs.start('project-m0', input()), jobs.get(first.jobId));
  assert.throws(() => jobs.start('project-m0', input({ intent: 'Fondu' })), (error: unknown) => error instanceof SuggestionJobException && error.code === 'IDEMPOTENCY_CONFLICT');
});

test('un retry exact renvoie son reçu sans relire le projet', async () => {
  const store = new MemoryProjectStore();
  let readable = true;
  const reader = { read: (projectId: string) => {
    if (!readable) throw new SuggestionJobException('NOT_FOUND', 'Projet inaccessible.');
    return store.read(projectId);
  } };
  const descriptor = { ...DETERMINISTIC_SIMULATOR_DESCRIPTOR, status: 'configured' as const };
  const orchestrator = new ModelSuggestionOrchestrator({ registry: { schemaVersion: 1, providers: [descriptor] }, adapters: [createDeterministicModelAdapter()] });
  const jobs = new SuggestionJobManager(reader, orchestrator);
  const first = jobs.start('project-m0', input());
  readable = false;
  assert.deepEqual(jobs.start('project-m0', input()), first);
  jobs.cancel(first.jobId);
});

test('les clés restent distinctes lorsque projet et clé contiennent des deux-points', async () => {
  const base = heroProject();
  const projects = new Map([
    ['alpha', { ...structuredClone(base), projectId: 'alpha' }],
    ['alpha:beta', { ...structuredClone(base), projectId: 'alpha:beta' }],
  ]);
  const reader = { read: (projectId: string) => {
    const project = projects.get(projectId);
    if (!project) throw new SuggestionJobException('NOT_FOUND', 'Projet absent.');
    return structuredClone(project);
  } };
  const descriptor = { ...DETERMINISTIC_SIMULATOR_DESCRIPTOR, status: 'configured' as const };
  const orchestrator = new ModelSuggestionOrchestrator({ registry: { schemaVersion: 1, providers: [descriptor] }, adapters: [createDeterministicModelAdapter()] });
  const jobs = new SuggestionJobManager(reader, orchestrator);
  const first = jobs.start('alpha', input({ idempotencyKey: 'beta:gamma' }));
  const second = jobs.start('alpha:beta', input({ idempotencyKey: 'gamma' }));
  assert.notEqual(first.jobId, second.jobId);
  jobs.cancel(first.jobId); jobs.cancel(second.jobId);
});

test('le job refuse une base ou une cible qui ne correspond pas au projet', () => {
  const { jobs, store } = setup();
  assert.throws(() => jobs.start('project-m0', input({ expectedDraftVersion: 1 })), (error: unknown) => error instanceof SuggestionJobException && error.code === 'VERSION_CONFLICT');
  assert.throws(() => jobs.start('project-m0', input({ selectedPageId: 'foreign-page' })), (error: unknown) => error instanceof SuggestionJobException && error.code === 'INVALID_INPUT');
  store.commit(makeEditCommand(store.read('project-m0'), (() => { const next = store.read('project-m0').snapshot; next.pages[0]!.composition.content[0]!.props.title = 'new'; return next; })(), 'manual-update'));
  assert.throws(() => jobs.start('project-m0', input({ idempotencyKey: 'new-after-update' })), (error: unknown) => error instanceof SuggestionJobException && error.code === 'VERSION_CONFLICT');
});

test('une version périmée est refusée avant la création d’un job', () => {
  const { jobs } = setup();
  assert.throws(
    () => jobs.start('project-m0', input({ expectedDraftVersion: 12, idempotencyKey: 'stale-version' })),
    (error: unknown) => error instanceof SuggestionJobException && error.code === 'VERSION_CONFLICT',
  );
});

test('la lecture des événements plafonne les pages à 100 et ne saute pas le curseur', async () => {
  const { jobs } = setup();
  const job = jobs.start('project-m0', input());
  await jobs.waitForCompletion(job.jobId);
  const first = jobs.getUpdates(job.jobId, 0, 2);
  assert.equal(first.events.length, 2);
  assert.equal(first.nextSeq, first.events.at(-1)?.seq);
  const second = jobs.getUpdates(job.jobId, first.nextSeq, 100);
  assert.equal(second.events[0]?.seq, 3);
  assert.equal(second.events.length, 2);
  assert.throws(() => jobs.getUpdates(job.jobId, 0, 101), (error: unknown) => error instanceof SuggestionJobException && error.code === 'INVALID_INPUT');
});

test('le manager refuse les jobs au-delà de sa capacité mémoire', () => {
  const { jobs } = setup();
  for (let index = 0; index < 1_000; index += 1) {
    const job = jobs.start('project-m0', input({ idempotencyKey: `capacity-${index}` }));
    jobs.cancel(job.jobId);
  }
  assert.throws(() => jobs.start('project-m0', input({ idempotencyKey: 'capacity-overflow' })), (error: unknown) => error instanceof SuggestionJobException && error.code === 'RATE_LIMITED');
});

test('annuler un job avant son démarrage est idempotent et ne crée pas de proposition', async () => {
  const { jobs } = setup();
  const started = jobs.start('project-m0', input());
  const cancelled = jobs.cancel(started.jobId);
  assert.equal(cancelled.state, 'cancelled');
  assert.deepEqual(jobs.cancel(started.jobId), cancelled);
  assert.equal((await jobs.waitForCompletion(started.jobId)).proposalIds.length, 0);
  assert.equal(jobs.getUpdates(started.jobId).events.at(-1)?.type, 'cancelled');
});

test('une modification du brouillon pendant le calcul marque la proposition obsolète', async () => {
  const { store, jobs } = setup(25);
  const started = jobs.start('project-m0', input());
  await Promise.resolve();
  const project = store.read('project-m0');
  const changed = structuredClone(project.snapshot);
  changed.pages[0]!.composition.content[0]!.props.title = 'Modifié pendant le calcul';
  store.commit(makeEditCommand(project, changed, 'manual-during-suggestion'));
  await jobs.waitForCompletion(started.jobId);
  const proposal = jobs.readProposal(jobs.get(started.jobId).proposalIds[0]!);
  assert.equal(proposal.status, 'stale');
});

test('les outils MCP exposent le cycle job aux vues autorisées', async (t) => {
  const { store, jobs } = setup();
  const server = createDesignerMcpServer({ store, suggestionJobs: jobs });
  const client = new Client({ name: 'suggestion-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => { await client.close(); await server.close(); });
  await server.connect(serverTransport); await client.connect(clientTransport);
  const names = (await client.listTools()).tools.map((tool) => tool.name).sort();
  for (const name of ['get_provider_registry', 'start_suggestion', 'get_job', 'get_job_updates', 'cancel_job', 'read_proposal', 'mark_proposal_stale', 'keep_proposal', 'reject_proposal']) assert.ok(names.includes(name));
  const toolList = (await client.listTools()).tools;
  for (const name of ['get_provider_registry', 'start_suggestion', 'get_job', 'get_job_updates', 'cancel_job', 'read_proposal', 'mark_proposal_stale', 'keep_proposal', 'reject_proposal']) {
    const tool = toolList.find((item) => item.name === name)!;
    assert.deepEqual((tool._meta?.ui as { visibility: string[] }).visibility, ['app']);
  }
  const registry = await client.callTool({ name: 'get_provider_registry', arguments: {} });
  assert.deepEqual((registry.structuredContent as { providers: unknown[] }).providers.map((item: unknown) => (item as { id: string }).id), ['custom']);
  const started = await client.callTool({ name: 'start_suggestion', arguments: { projectId: 'project-m0', ...input() } });
  const job = started.structuredContent as { jobId: string; state: string };
  assert.equal(job.state, 'queued');
  const finished = await jobs.waitForCompletion(job.jobId);
  const updates = await client.callTool({ name: 'get_job_updates', arguments: { jobId: job.jobId, afterSeq: 0, limit: 50 } });
  assert.equal((updates.structuredContent as { state: string }).state, 'succeeded');
  const proposal = await client.callTool({ name: 'read_proposal', arguments: { proposalId: finished.proposalIds[0] } });
  assert.equal((proposal.structuredContent as { status: string }).status, 'ready');
  const kept = await client.callTool({ name: 'keep_proposal', arguments: { proposalId: finished.proposalIds[0] } });
  assert.equal((kept.structuredContent as { proposal: { status: string } }).proposal.status, 'kept');
  const updated = await client.callTool({ name: 'read_project', arguments: { projectId: 'project-m0' } });
  assert.equal(((updated._meta as { project: { draftVersion: number } }).project).draftVersion, 1);
});

test('la vue MCP refuse un store différent de celui des jobs de suggestion', () => {
  const { store, jobs } = setup();
  assert.equal(jobs.usesProjectStore(store), true);
  assert.throws(() => createDesignerMcpServer({ suggestionJobs: jobs }), /doivent partager le même store/);
  assert.throws(() => createDesignerMcpServer({ store: new MemoryProjectStore(), suggestionJobs: jobs }), /doivent partager le même store/);
  assert.throws(() => createDesignerHttpServer({ token: 'development-token-'.padEnd(36, 'x'), store: new MemoryProjectStore(), suggestionJobs: jobs }), /doivent partager le même store/);
});
