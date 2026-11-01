import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { MemoryProjectStore } from '../services/api/src/domain.ts';
import { createDesignerMcpServer, EDITOR_URI } from '../services/api/src/mcp.ts';
import { createDesignerHttpServer } from '../services/api/src/http.ts';
import { initialProject, hashSnapshot, makeEditCommand, M0Error, stableStringify } from '@design-workbench/m0-contract';
import type { ApplyOpsCommand, M0Project } from '@design-workbench/m0-contract';

const make = (key = 'edit-one', title = 'Un titre modifié', version = 0): ApplyOpsCommand => ({
  projectId: 'project-m0', expectedDraftVersion: version, idempotencyKey: key, action: 'apply_ops',
  payload: { operations: [{ op: 'update_props', pageId: 'page-home', blockId: 'block-hero', props: { title } }] },
});
const code = (expected: string) => (error: unknown) => error instanceof M0Error && error.code === expected;
const scratch = fileURLToPath(new URL('../.team/m0-backend-tests/', import.meta.url));
mkdirSync(scratch, { recursive: true });
const htmlPath = join(mkdtempSync(join(scratch, 'view-')), 'index.html');
writeFileSync(htmlPath, '<!doctype html><html lang="fr"><title>Vue test</title><body>Vue locale de test</body></html>');

test('le hash partagé initial est exact et le document reste canonique', async () => {
  const project = initialProject();
  assert.equal(await hashSnapshot(project.snapshot), project.contentHash);
  assert.equal(new MemoryProjectStore().read(project.projectId).contentHash, project.contentHash);
});
test('une lecture ne permet pas de muter le store par référence', () => {
  const store = new MemoryProjectStore(), a = store.read('project-m0');
  a.snapshot.pages[0]!.composition.content[0]!.props.title = 'Mutation externe';
  assert.notEqual(store.read('project-m0').snapshot.pages[0]!.composition.content[0]!.props.title, 'Mutation externe');
});
test('lot props et thème conserve brief, sources et identité', () => {
  const store = new MemoryProjectStore(), before = store.read('project-m0');
  const command = make();
  command.payload.operations.push({ op: 'update_theme', tokens: { 'color.accent': { kind: 'color', value: '#123456' } } });
  const result = store.commit(command);
  assert.equal(result.draftVersion, 1);
  assert.equal(result.snapshot.pages[0]!.composition.content[0]!.props.title, 'Un titre modifié');
  assert.equal(result.snapshot.theme.tokens['color.accent'].value, '#123456');
  assert.deepEqual(result.snapshot.designBrief, before.snapshot.designBrief);
  assert.deepEqual(result.snapshot.catalogLock, before.snapshot.catalogLock);
  assert.deepEqual(result.snapshot.designPolicy, before.snapshot.designPolicy);
  assert.equal(result.snapshot.pages[0]!.composition.content[0]!.props.id, 'block-hero');
});
test('CAS concurrent : un seul gagnant pour une même version', async () => {
  const store = new MemoryProjectStore();
  const results = await Promise.allSettled([Promise.resolve().then(() => store.commit(make('a', 'Titre A'))), Promise.resolve().then(() => store.commit(make('b', 'Titre B')))]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected' && code('VERSION_CONFLICT')(r.reason)).length, 1);
  assert.equal(store.read('project-m0').draftVersion, 1);
});
test('replay idempotent retourne le reçu initial même après progression', () => {
  const store = new MemoryProjectStore(), command = make();
  const first = store.commit(command);
  store.commit(make('later', 'Encore un titre', 1));
  assert.deepEqual(store.commit(command), first);
  assert.equal(store.read('project-m0').draftVersion, 2);
  first.snapshot.projectTitle = 'Altéré';
  assert.notEqual(store.commit(command).snapshot.projectTitle, 'Altéré');
});
test('collision de clé refusée sans effet supplémentaire', () => {
  const store = new MemoryProjectStore(); store.commit(make());
  assert.throws(() => store.commit(make('edit-one', 'Autre commande', 1)), code('IDEMPOTENCY_CONFLICT'));
  assert.equal(store.read('project-m0').draftVersion, 1);
});
test('no-op confirme un reçu sans incrémenter draftVersion', () => {
  const store = new MemoryProjectStore(), before = store.read('project-m0');
  const result = store.commit(make('no-op', before.snapshot.pages[0]!.composition.content[0]!.props.title));
  assert.equal(result.draftVersion, 0);
  assert.equal(result.contentHash, before.contentHash);
  assert.match(result.receiptId, /^receipt-/);
});
test('lot avec seconde opération invalide refuse aussi la première', () => {
  const store = new MemoryProjectStore(), before = store.read('project-m0'), command = make();
  command.payload.operations.push({ op: 'update_props', pageId: 'page-foreign', blockId: 'block-hero', props: { body: 'Interdit' } });
  assert.throws(() => store.commit(command), code('NOT_FOUND'));
  assert.deepEqual(store.read('project-m0'), before);
});
test('références de projet étrangères et propriété id non modifiable', () => {
  const store = new MemoryProjectStore();
  assert.throws(() => store.read('project-foreign'), code('NOT_FOUND'));
  assert.throws(() => store.commit({ ...make(), projectId: 'project-foreign' }), code('NOT_FOUND'));
  const command = make() as unknown as Record<string, unknown>;
  (command.payload as { operations: { props: object }[] }).operations[0]!.props = { id: 'replacement' };
  assert.throws(() => store.commit(command), code('INVALID_INPUT'));
});
test('propriétés exécutables, prototype et couleurs CSS arbitraires refusés', () => {
  const store = new MemoryProjectStore();
  for (const props of [{ onClick: 'alert(1)' }, JSON.parse('{"__proto__":{"polluted":true}}')]) {
    const command = make(); command.payload.operations = [{ op: 'update_props', pageId: 'page-home', blockId: 'block-hero', props }];
    assert.throws(() => store.commit(command), code('INVALID_INPUT'));
  }
  const command = make(); command.payload.operations = [{ op: 'update_theme', tokens: { 'color.background': { kind: 'color', value: 'url(https://evil.invalid)' } } }];
  assert.throws(() => store.commit(command), code('INVALID_INPUT'));
  assert.equal(store.read('project-m0').draftVersion, 0);
});
test('verrouillage de propriété et de thème respecté', () => {
  const seed = initialProject(); seed.snapshot.locks = [{ pageId: 'page-home', blockId: 'block-hero', properties: ['title'] }];
  const store = new MemoryProjectStore(seed);
  assert.throws(() => store.commit(make()), code('LOCKED_TARGET'));
  const allowed = make('allowed'); allowed.payload.operations = [{ op: 'update_props', pageId: 'page-home', blockId: 'block-hero', props: { body: 'Texte permis' } }];
  assert.equal(store.commit(allowed).draftVersion, 1);
  const locked = initialProject(); locked.snapshot.locks = [{ pageId: 'page-home', blockId: null, properties: ['theme.tokens.color.accent'] }];
  const lockedStore = new MemoryProjectStore(locked), change = make();
  change.payload.operations = [{ op: 'update_theme', tokens: { 'color.accent': { kind: 'color', value: '#123456' } } }];
  assert.throws(() => lockedStore.commit(change), code('LOCKED_TARGET'));
});
test('diff partagé représente seulement les modifications admises', () => {
  const project = initialProject(), next = structuredClone(project.snapshot);
  next.pages[0]!.composition.content[0]!.props.body = 'Un texte édité';
  assert.equal(makeEditCommand(project, next, 'diff').payload.operations.length, 1);
  next.projectTitle = 'Hors périmètre M0';
  assert.throws(() => makeEditCommand(project, next, 'outside'), code('CAPABILITY_UNSUPPORTED'));
});

test('MCP SDK : découverte, ressource UI et réponses réservées à la vue', async (t) => {
  const server = createDesignerMcpServer({ htmlPath });
  const client = new Client({ name: 'm0-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => { await client.close(); await server.close(); });
  await server.connect(serverTransport); await client.connect(clientTransport);
  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), ['commit_commands', 'open_designer', 'read_project']);
  const open = listed.tools.find((tool) => tool.name === 'open_designer')!;
  assert.equal((open._meta?.ui as { resourceUri: string }).resourceUri, EDITOR_URI);
  for (const name of ['read_project', 'commit_commands']) {
    const meta = listed.tools.find((tool) => tool.name === name)!._meta?.ui as { resourceUri?: string; visibility: string[] };
    assert.equal(meta.resourceUri, undefined); assert.deepEqual(meta.visibility, ['app']);
  }
  const resource = await client.readResource({ uri: EDITOR_URI });
  assert.equal(resource.contents[0]!.mimeType, 'text/html;profile=mcp-app');
  const opened = await client.callTool({ name: 'open_designer', arguments: {} });
  assert.equal((opened.structuredContent as Record<string, unknown> | undefined)?.projectId, 'project-m0');
  assert.equal((opened.structuredContent as Record<string, unknown> | undefined)?.snapshot, undefined);
  assert.equal((opened._meta?.project as M0Project).snapshot.pages[0]!.composition.content[0]!.type, 'Hero');
  const saved = await client.callTool({ name: 'commit_commands', arguments: make() });
  assert.equal((saved.structuredContent as Record<string, unknown> | undefined)?.draftVersion, 1);
  assert.equal((saved._meta?.project as M0Project).draftVersion, 1);
  const foreign = await client.callTool({ name: 'read_project', arguments: { projectId: 'project-foreign' } });
  assert.equal(foreign.isError, true);
  assert.equal((foreign._meta?.error as { code: string }).code, 'NOT_FOUND');
  const malformed = await client.callTool({ name: 'commit_commands', arguments: { ...make('bad'), extra: true } });
  assert.equal(malformed.isError, true);
});

test('HTTP local : authentification, origine, corps borné et vrai client MCP', async (t) => {
  const token = 'test-only-token-never-use-in-production-0000001';
  const server = createDesignerHttpServer({ token, htmlPath });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); });
  const address = server.address(); assert(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  assert.equal((await fetch(`${base}/health`)).status, 200);
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { Authorization: 'Bearer invalid', 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, Origin: 'https://foreign.invalid', 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(70_000) }) })).status, 413);
  const client = new Client({ name: 'http-m0-test', version: '0.0.0' });
  t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
  const result = await client.callTool({ name: 'read_project', arguments: { projectId: 'project-m0' } });
  assert.equal((result.structuredContent as Record<string, unknown> | undefined)?.projectId, 'project-m0');
  const saved = await client.callTool({ name: 'commit_commands', arguments: make('http-save') });
  assert.equal((saved.structuredContent as Record<string, unknown> | undefined)?.draftVersion, 1);
  const replay = await client.callTool({ name: 'commit_commands', arguments: make('http-save') });
  assert.equal((replay.structuredContent as Record<string, unknown> | undefined)?.receiptId, (saved.structuredContent as Record<string, unknown> | undefined)?.receiptId);
  assert.equal(stableStringify(replay._meta), stableStringify(saved._meta));
});
