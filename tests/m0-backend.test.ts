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
import { initialProject, hashSnapshot, makeEditCommand, M0Error, stableStringify, applyOperations, createHeroBlock, validateCommand, validateSnapshot, MAX_COMMAND_UTF8_BYTES } from '@design-workbench/m0-contract';
import { heroProject } from './fixtures/m0-project.ts';
import { createSalesDashboardRecipe } from '../packages/catalog/src/recipes.ts';
import { validateCatalogPage, type CatalogNode, type CatalogPage } from '../packages/catalog/src/index.ts';
import type { ApplyOpsCommand, M0Project } from '@design-workbench/m0-contract';

const make = (key = 'edit-one', title = 'Un titre modifié', version = 0): ApplyOpsCommand => ({
  projectId: 'project-m0', expectedDraftVersion: version, idempotencyKey: key, action: 'apply_ops',
  payload: { operations: [{ op: 'update_props', pageId: 'page-home', blockId: 'block-hero', props: { title } }] },
});
const insertCommand = (key = 'insert-one', version = 0): ApplyOpsCommand => ({
  projectId: 'project-m0', expectedDraftVersion: version, idempotencyKey: key, action: 'apply_ops',
  payload: { operations: [{ op: 'insert_block', pageId: 'page-home', parentBlockId: null, slot: 'content', beforeBlockId: null, block: createHeroBlock() }] },
});
const code = (expected: string) => (error: unknown) => error instanceof M0Error && error.code === expected;
const scratch = fileURLToPath(new URL('../.team/m0-backend-tests/', import.meta.url));
mkdirSync(scratch, { recursive: true });
const htmlPath = join(mkdtempSync(join(scratch, 'view-')), 'index.html');
writeFileSync(htmlPath, '<!doctype html><html lang="fr"><title>Vue test</title><body>Vue locale de test</body></html>');

test('le hash partagé initial est exact et le document reste canonique', async () => {
  const project = initialProject();
  assert.deepEqual(project.snapshot.pages[0]!.composition.content, []);
  assert.equal(await hashSnapshot(project.snapshot), project.contentHash);
  assert.equal(new MemoryProjectStore().read(project.projectId).contentHash, project.contentHash);
});

test('la fixture Hero historique reste lisible sans migration ni suppression implicite', async () => {
  const previous = heroProject();
  assert.equal(previous.contentHash, '2cc78efcbea8b854de4e33b8cb8e441372f102e5c92b3141d57122f9329ab990');
  assert.equal(await hashSnapshot(previous.snapshot), previous.contentHash);
  assert.deepEqual(new MemoryProjectStore(previous).read(previous.projectId), previous);
  const twoBlocks = structuredClone(previous.snapshot);
  twoBlocks.pages[0]!.composition.content.push(createHeroBlock('second-hero'));
  assert.throws(() => validateSnapshot(twoBlocks), code('INVALID_INPUT'));
});

test('CatalogPage versionnée est une projection réversible et son diff conserve le Hero historique', async () => {
  const empty = initialProject(), catalogPage = createSalesDashboardRecipe({ motion: { speed: 1.5 } });
  const preview = applyOperations(empty.snapshot, [{ op: 'set_catalog_page', pageId: 'page-home', catalogPage }]);
  assert.deepEqual(preview.pages[0]!.catalogPage, catalogPage);
  assert.deepEqual(preview.pages[0]!.composition.content, []);
  assert.deepEqual(empty.snapshot.pages[0]!.composition.content, []);
  const add = makeEditCommand(empty, preview, 'catalog-page-add');
  assert.deepEqual(add.payload.operations.map((operation) => operation.op), ['set_catalog_page']);
  assert.deepEqual((await new MemoryProjectStore(empty).commit(add)).snapshot, preview);

  const projected = { ...empty, snapshot: preview };
  const remove = makeEditCommand(projected, empty.snapshot, 'catalog-page-remove');
  assert.deepEqual(remove.payload.operations, [{ op: 'set_catalog_page', pageId: 'page-home', catalogPage: null }]);
  assert.deepEqual(new MemoryProjectStore(projected).commit(remove).snapshot, empty.snapshot);

  const oldHero = heroProject();
  assert.throws(() => applyOperations(oldHero.snapshot, [{ op: 'set_catalog_page', pageId: 'page-home', catalogPage }]), code('CAPABILITY_UNSUPPORTED'));
  const locked = initialProject();
  locked.snapshot.locks = [{ pageId: 'page-home', blockId: null, properties: ['catalogPage'] }];
  assert.throws(() => applyOperations(locked.snapshot, [{ op: 'set_catalog_page', pageId: 'page-home', catalogPage }]), code('LOCKED_TARGET'));
});

test('un Snapshot accepte les huit niveaux documentés du catalogue', () => {
  const nestedNode = (depth: number, maxDepth: number): CatalogNode => ({
    id: `section-${depth}`,
    component: { id: 'section', version: '1.0.0' },
    props: { variant: 'default' },
    slots: { content: depth < maxDepth ? [nestedNode(depth + 1, maxDepth)] : [] },
  });
  const project = initialProject();
  project.snapshot.pages[0]!.catalogPage = {
    schemaVersion: 1,
    release: { id: 'manifest-core', version: '0.3.0' },
    nodes: [nestedNode(0, 7)],
  } satisfies CatalogPage;
  assert.doesNotThrow(() => validateCatalogPage(project.snapshot.pages[0]!.catalogPage!));
  assert.doesNotThrow(() => validateSnapshot(project.snapshot));
  const tooDeep = structuredClone(project.snapshot);
  tooDeep.pages[0]!.catalogPage!.nodes = [nestedNode(0, 8)];
  assert.throws(() => validateSnapshot(tooDeep), code('INVALID_INPUT'));
});

test('la recette ventes borne vitesse, durée, direction et densité des animations', () => {
  const fast = createSalesDashboardRecipe({ motion: { speed: 1.5, id: 'slide-down' } });
  const slow = createSalesDashboardRecipe({ motion: { speed: 0.5, durationMs: 1200, delayMs: 9000, distancePx: 900 } });
  const fastMotion = fast.nodes.find((node) => node.id === 'sales-chart-revenue')!.motion!;
  const slowMotion = slow.nodes.find((node) => node.id === 'sales-chart-revenue')!.motion!;
  assert.equal(fastMotion.id, 'slide-down');
  assert.equal(fastMotion.config.durationMs, 373);
  assert.equal(slowMotion.config.durationMs, 2400);
  assert.equal(slowMotion.config.delayMs, 2000);
  assert.equal(slowMotion.config.distancePx, 40);
  const clouds = createSalesDashboardRecipe({ cloudSpeed: 8, cloudDensity: 'high' }).nodes.find((node) => node.id === 'cloud-cover')!;
  assert.equal(clouds.props.speed, 1);
  assert.equal(clouds.props.density, 'high');
  const fasterClouds = createSalesDashboardRecipe({ motion: { speed: 1.5 } }).nodes.find((node) => node.id === 'cloud-cover')!;
  assert.equal(fasterClouds.props.motionSpeedMultiplier, 1.5);
});

test('un Snapshot catalogue supérieur à 32 Ko reste accepté par le contrat et Ajv', () => {
  const project = initialProject();
  const longText = 'x'.repeat(1600);
  const catalogPage = createSalesDashboardRecipe();
  catalogPage.nodes = Array.from({ length: 30 }, (_, index) => ({
    id: `text-${index}`,
    component: { id: 'text' as const, version: '1.0.0' },
    props: { text: longText, tone: 'body' },
  }));
  project.snapshot.pages[0]!.catalogPage = catalogPage;
  const bytes = new TextEncoder().encode(JSON.stringify(project.snapshot)).byteLength;
  assert.ok(bytes > 32_768, `expected >32 KiB, got ${bytes}`);
  assert.ok(bytes < 160 * 1024, `expected <160 KiB, got ${bytes}`);
  validateSnapshot(project.snapshot);
  assert.deepEqual(new MemoryProjectStore(project).read('project-m0').snapshot, project.snapshot);
});

test('une commande M0 accepte exactement 192 Kio UTF-8 et rejette un octet de plus', () => {
  const catalogPage = createSalesDashboardRecipe();
  catalogPage.nodes = Array.from({ length: 30 }, (_, index) => ({
    id: `text-${index}`,
    component: { id: 'text' as const, version: '1.0.0' },
    props: { text: 'x'.repeat(1600), tone: 'body' as const },
  }));
  const command: ApplyOpsCommand = {
    projectId: 'project-m0', expectedDraftVersion: 0, idempotencyKey: 'catalog-command-limit', action: 'apply_ops',
    payload: { operations: Array.from({ length: 4 }, (_, index) => ({
      op: 'set_catalog_page' as const, pageId: 'page-home', catalogPage: structuredClone(catalogPage),
    })) },
  };
  const enc = () => new TextEncoder().encode(JSON.stringify(command)).byteLength;
  let excess = enc() - MAX_COMMAND_UTF8_BYTES;
  assert.ok(excess > 0, 'fixture must exercise the command-size boundary');
  for (const operation of command.payload.operations) {
    if (operation.op !== 'set_catalog_page' || !operation.catalogPage) continue;
    for (const node of operation.catalogPage.nodes) {
      const text = node.props.text;
      if (typeof text !== 'string' || excess <= 0) continue;
      const shrink = Math.min(text.length, excess);
      node.props.text = text.slice(0, text.length - shrink);
      excess -= shrink;
    }
  }
  assert.equal(excess, 0);
  assert.equal(enc(), MAX_COMMAND_UTF8_BYTES);
  validateCommand(command);
  assert.equal(new MemoryProjectStore().commit(command).snapshot.pages[0]!.catalogPage?.nodes.length, 30);

  const oversized = structuredClone(command);
  const textNode = oversized.payload.operations
    .filter((operation) => operation.op === 'set_catalog_page')
    .flatMap((operation) => operation.op === 'set_catalog_page' && operation.catalogPage ? operation.catalogPage.nodes : [])
    .find((node) => String(node.props.text).length < 1600)!;
  textNode.props.text = `${String(textNode.props.text)}x`;
  assert.equal(new TextEncoder().encode(JSON.stringify(oversized)).byteLength, MAX_COMMAND_UTF8_BYTES + 1);
  assert.throws(() => validateCommand(oversized), /192 Ko UTF-8 maximum/);
  assert.ok(MAX_COMMAND_UTF8_BYTES < 256 * 1024, 'the compact command leaves room for MCP framing');
});

test('insertion puis modification dans un lot résout le nouveau bloc sans muter la base', () => {
  const store = new MemoryProjectStore(), before = store.read('project-m0');
  const command = insertCommand();
  command.payload.operations.push({ op: 'update_props', pageId: 'page-home', blockId: 'block-hero', props: { title: 'Créé dans ce lot' } });
  const result = store.commit(command);
  assert.equal(result.draftVersion, 1);
  assert.equal(result.snapshot.pages[0]!.composition.content[0]!.props.title, 'Créé dans ce lot');
  assert.deepEqual(before.snapshot.pages[0]!.composition.content, []);
  assert.deepEqual(result.snapshot.designBrief, before.snapshot.designBrief);
  assert.deepEqual(result.snapshot.catalogLock, before.snapshot.catalogLock);
  assert.deepEqual(store.commit(command), result);
  assert.equal(store.read('project-m0').snapshot.pages[0]!.composition.content.length, 1);
});

test('insertion concurrente : un seul gagnant et aucun bloc dupliqué', async () => {
  const store = new MemoryProjectStore();
  const outcomes = await Promise.allSettled(['a', 'b'].map((key) => Promise.resolve().then(() => store.commit(insertCommand(key)))));
  assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter((outcome) => outcome.status === 'rejected' && code('VERSION_CONFLICT')(outcome.reason)).length, 1);
  assert.equal(store.read('project-m0').snapshot.pages[0]!.composition.content.length, 1);
});

test('suppression et réinsertion conservent un undo/redo fidèle par diff canonique', () => {
  const store = new MemoryProjectStore(), empty = store.read('project-m0');
  const populated = applyOperations(empty.snapshot, insertCommand().payload.operations);
  const inserted = store.commit(makeEditCommand(empty, populated, 'history-insert'));
  const removed = store.commit(makeEditCommand(inserted, empty.snapshot, 'history-undo'));
  assert.deepEqual(removed.snapshot, empty.snapshot);
  assert.equal(removed.draftVersion, 2);
  const restored = store.commit(makeEditCommand(removed, populated, 'history-redo'));
  assert.deepEqual(restored.snapshot, populated);
  assert.equal(restored.snapshot.pages[0]!.composition.content[0]!.props.id, 'block-hero');
  const replaced = structuredClone(populated);
  replaced.pages[0]!.composition.content[0]!.props.id = 'another-hero';
  const replacement = makeEditCommand(restored, replaced, 'replace');
  assert.deepEqual(replacement.payload.operations.map((operation) => operation.op), ['remove_block', 'insert_block']);
  assert.deepEqual(store.commit(replacement).snapshot, replaced);
});

test('no-op vide et insertion suivie de suppression préservent la version et le hash', () => {
  const store = new MemoryProjectStore(), before = store.read('project-m0');
  const noop = store.commit(makeEditCommand(before, before.snapshot, 'empty-noop'));
  assert.equal(noop.draftVersion, 0);
  assert.equal(noop.contentHash, before.contentHash);
  const roundTrip = insertCommand('empty-roundtrip');
  roundTrip.payload.operations.push({ op: 'remove_block', pageId: 'page-home', blockId: 'block-hero' });
  const result = store.commit(roundTrip);
  assert.deepEqual(result.snapshot, before.snapshot);
  assert.equal(result.draftVersion, 0);
});

test('cibles absentes, insertion non racine et lot structurel invalide ne modifient rien', () => {
  const store = new MemoryProjectStore(), before = store.read('project-m0');
  assert.throws(() => store.commit(make()), code('NOT_FOUND'));
  for (const fields of [{ parentBlockId: 'other' }, { slot: 'elsewhere' }, { beforeBlockId: 'other' }]) {
    const command = insertCommand();
    Object.assign(command.payload.operations[0]!, fields);
    assert.throws(() => store.commit(command), code('CAPABILITY_UNSUPPORTED'));
  }
  const foreign = insertCommand(); Object.assign(foreign.payload.operations[0]!, { pageId: 'foreign' });
  assert.throws(() => store.commit(foreign), code('NOT_FOUND'));
  const duplicate = insertCommand(); duplicate.payload.operations.push(insertCommand().payload.operations[0]!);
  assert.throws(() => store.commit(duplicate), code('INVALID_INPUT'));
  const invalid = insertCommand();
  invalid.payload.operations.push({ op: 'remove_block', pageId: 'page-home', blockId: 'not-created' });
  assert.throws(() => store.commit(invalid), code('NOT_FOUND'));
  const badId = insertCommand();
  (badId.payload.operations[0] as { block: { props: { id: string } } }).block.props.id = 'page-home';
  assert.throws(() => store.commit(badId), code('INVALID_INPUT'));
  assert.deepEqual(store.read('project-m0'), before);
});

test('locks de page et de bloc protègent aussi la structure sans référence orpheline', () => {
  const empty = initialProject();
  empty.snapshot.locks = [{ pageId: 'page-home', blockId: null, properties: ['content'] }];
  assert.throws(() => new MemoryProjectStore(empty).commit(insertCommand()), code('LOCKED_TARGET'));
  const populated = heroProject();
  populated.snapshot.locks = [{ pageId: 'page-home', blockId: 'block-hero', properties: ['title'] }];
  const store = new MemoryProjectStore(populated);
  const removal = { ...make(), payload: { operations: [{ op: 'remove_block', pageId: 'page-home', blockId: 'block-hero' }] } };
  assert.throws(() => store.commit(removal), code('LOCKED_TARGET'));
  assert.deepEqual(store.read('project-m0').snapshot, populated.snapshot);
  const orphan = initialProject(); orphan.snapshot.locks = populated.snapshot.locks;
  assert.throws(() => validateSnapshot(orphan), code('INVALID_INPUT'));
  const themeOnly = initialProject();
  themeOnly.snapshot.locks = [{ pageId: 'page-home', blockId: null, properties: ['theme.tokens.color.accent'] }];
  assert.equal(new MemoryProjectStore(themeOnly).commit(insertCommand()).snapshot.pages[0]!.composition.content.length, 1);
});
test('une lecture ne permet pas de muter le store par référence', () => {
  const store = new MemoryProjectStore(heroProject()), a = store.read('project-m0');
  a.snapshot.pages[0]!.composition.content[0]!.props.title = 'Mutation externe';
  assert.notEqual(store.read('project-m0').snapshot.pages[0]!.composition.content[0]!.props.title, 'Mutation externe');
});
test('lot props et thème conserve brief, sources et identité', () => {
  const store = new MemoryProjectStore(heroProject()), before = store.read('project-m0');
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
  const store = new MemoryProjectStore(heroProject());
  const results = await Promise.allSettled([Promise.resolve().then(() => store.commit(make('a', 'Titre A'))), Promise.resolve().then(() => store.commit(make('b', 'Titre B')))]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter((r) => r.status === 'rejected' && code('VERSION_CONFLICT')(r.reason)).length, 1);
  assert.equal(store.read('project-m0').draftVersion, 1);
});
test('replay idempotent retourne le reçu initial même après progression', () => {
  const store = new MemoryProjectStore(heroProject()), command = make();
  const first = store.commit(command);
  store.commit(make('later', 'Encore un titre', 1));
  assert.deepEqual(store.commit(command), first);
  assert.equal(store.read('project-m0').draftVersion, 2);
  first.snapshot.projectTitle = 'Altéré';
  assert.notEqual(store.commit(command).snapshot.projectTitle, 'Altéré');
});
test('collision de clé refusée sans effet supplémentaire', () => {
  const store = new MemoryProjectStore(heroProject()); store.commit(make());
  assert.throws(() => store.commit(make('edit-one', 'Autre commande', 1)), code('IDEMPOTENCY_CONFLICT'));
  assert.equal(store.read('project-m0').draftVersion, 1);
});
test('no-op confirme un reçu sans incrémenter draftVersion', () => {
  const store = new MemoryProjectStore(heroProject()), before = store.read('project-m0');
  const result = store.commit(make('no-op', before.snapshot.pages[0]!.composition.content[0]!.props.title));
  assert.equal(result.draftVersion, 0);
  assert.equal(result.contentHash, before.contentHash);
  assert.match(result.receiptId, /^receipt-/);
});
test('lot avec seconde opération invalide refuse aussi la première', () => {
  const store = new MemoryProjectStore(heroProject()), before = store.read('project-m0'), command = make();
  command.payload.operations.push({ op: 'update_props', pageId: 'page-foreign', blockId: 'block-hero', props: { body: 'Interdit' } });
  assert.throws(() => store.commit(command), code('NOT_FOUND'));
  assert.deepEqual(store.read('project-m0'), before);
});
test('références de projet étrangères et propriété id non modifiable', () => {
  const store = new MemoryProjectStore(heroProject());
  assert.throws(() => store.read('project-foreign'), code('NOT_FOUND'));
  assert.throws(() => store.commit({ ...make(), projectId: 'project-foreign' }), code('NOT_FOUND'));
  const command = make() as unknown as Record<string, unknown>;
  (command.payload as { operations: { props: object }[] }).operations[0]!.props = { id: 'replacement' };
  assert.throws(() => store.commit(command), code('INVALID_INPUT'));
});
test('propriétés exécutables, prototype et couleurs CSS arbitraires refusés', () => {
  const store = new MemoryProjectStore(heroProject());
  for (const props of [{ onClick: 'alert(1)' }, JSON.parse('{"__proto__":{"polluted":true}}')]) {
    const command = make(); command.payload.operations = [{ op: 'update_props', pageId: 'page-home', blockId: 'block-hero', props }];
    assert.throws(() => store.commit(command), code('INVALID_INPUT'));
  }
  const command = make(); command.payload.operations = [{ op: 'update_theme', tokens: { 'color.background': { kind: 'color', value: 'url(https://evil.invalid)' } } }];
  assert.throws(() => store.commit(command), code('INVALID_INPUT'));
  assert.equal(store.read('project-m0').draftVersion, 0);
});
test('verrouillage de propriété et de thème respecté', () => {
  const seed = heroProject(); seed.snapshot.locks = [{ pageId: 'page-home', blockId: 'block-hero', properties: ['title'] }];
  const store = new MemoryProjectStore(seed);
  assert.throws(() => store.commit(make()), code('LOCKED_TARGET'));
  const allowed = make('allowed'); allowed.payload.operations = [{ op: 'update_props', pageId: 'page-home', blockId: 'block-hero', props: { body: 'Texte permis' } }];
  assert.equal(store.commit(allowed).draftVersion, 1);
  const locked = heroProject(); locked.snapshot.locks = [{ pageId: 'page-home', blockId: null, properties: ['theme.tokens.color.accent'] }];
  const lockedStore = new MemoryProjectStore(locked), change = make();
  change.payload.operations = [{ op: 'update_theme', tokens: { 'color.accent': { kind: 'color', value: '#123456' } } }];
  assert.throws(() => lockedStore.commit(change), code('LOCKED_TARGET'));
});
test('diff partagé représente seulement les modifications admises', () => {
  const project = heroProject(), next = structuredClone(project.snapshot);
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
  assert.equal(client.getServerVersion()?.name, 'manifest-m0');
  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map((tool) => tool.name).sort(), ['commit_commands', 'get_provider_registry', 'open_designer', 'read_project']);
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
  assert.deepEqual((opened._meta?.project as M0Project).snapshot.pages[0]!.composition.content, []);
  const saved = await client.callTool({ name: 'commit_commands', arguments: insertCommand('mcp-insert') });
  assert.equal((saved.structuredContent as Record<string, unknown> | undefined)?.draftVersion, 1);
  assert.equal((saved._meta?.project as M0Project).draftVersion, 1);
  const foreign = await client.callTool({ name: 'read_project', arguments: { projectId: 'project-foreign' } });
  assert.equal(foreign.isError, true);
  assert.equal((foreign._meta?.error as { code: string }).code, 'NOT_FOUND');
  const malformed = await client.callTool({ name: 'commit_commands', arguments: { ...make('bad'), extra: true } });
  assert.equal(malformed.isError, true);
});

test('MCP lancement : transmet le brief et le fond noir sans modifier un brouillon existant', async (t) => {
  const store = new MemoryProjectStore(heroProject());
  store.commit(make('launch-base-edit', 'Titre déjà conservé'));
  const before = store.read('project-m0');
  assert.equal(before.draftVersion, 1);
  const server = createDesignerMcpServer({ store, htmlPath });
  const client = new Client({ name: 'launch-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => { await client.close(); await server.close(); });
  await server.connect(serverTransport); await client.connect(clientTransport);
  const request = { userRequest: 'Affiche un fond noir.', assistantProposal: 'Une page sur fond noir.', backgroundColor: '#000000' };
  const opened = await client.callTool({ name: 'open_designer', arguments: request });
  assert.equal(opened.isError, undefined);
  const launch = opened._meta?.launchContext as Record<string, unknown>;
  assert.match(String(launch.id), /^launch-/);
  assert.deepEqual({ ...launch, id: undefined }, { id: undefined, projectId: before.projectId, baseDraftVersion: before.draftVersion, ...request });
  assert.deepEqual(store.read('project-m0'), before);
  assert.deepEqual(opened._meta?.project, before);
  assert.equal((opened.structuredContent as Record<string, unknown>).userRequest, undefined);
  const oldClient = await client.callTool({ name: 'open_designer', arguments: {} });
  assert.equal(oldClient.isError, undefined);
  assert.equal(oldClient._meta?.launchContext, undefined);
  for (const arguments_ of [{ userRequest: 'x'.repeat(6001) }, { userRequest: '   ' }, { backgroundColor: 'black' }, { backgroundColor: '#000000', projectId: 'foreign' }]) {
    const invalid = await client.callTool({ name: 'open_designer', arguments: arguments_ });
    assert.equal(invalid.isError, true);
  }
  assert.deepEqual(store.read('project-m0'), before);
});

test('HTTP local : authentification, origine, corps borné et vrai client MCP', async (t) => {
  const token = 'test-only-token-never-use-in-production-0000001';
  const server = createDesignerHttpServer({ token, htmlPath });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); });
  const address = server.address(); assert(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  assert.equal((await fetch(`${base}/health`)).status, 200);
  const unauthenticated = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.headers.get('www-authenticate'), 'Bearer realm="manifest-m0"');
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { Authorization: 'Bearer invalid', 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, Origin: 'https://foreign.invalid', 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ text: 'x'.repeat(270_000) }) })).status, 413);
  const client = new Client({ name: 'http-m0-test', version: '0.0.0' });
  t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }));
  const result = await client.callTool({ name: 'read_project', arguments: { projectId: 'project-m0' } });
  assert.equal((result.structuredContent as Record<string, unknown> | undefined)?.projectId, 'project-m0');
  const saved = await client.callTool({ name: 'commit_commands', arguments: insertCommand('http-save') });
  assert.equal((saved.structuredContent as Record<string, unknown> | undefined)?.draftVersion, 1);
  const replay = await client.callTool({ name: 'commit_commands', arguments: insertCommand('http-save') });
  assert.equal((replay.structuredContent as Record<string, unknown> | undefined)?.receiptId, (saved.structuredContent as Record<string, unknown> | undefined)?.receiptId);
  assert.equal(stableStringify(replay._meta), stableStringify(saved._meta));
});
