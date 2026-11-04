import test from 'node:test';
import assert from 'node:assert/strict';
import { heroProject } from './fixtures/m0-project.ts';
import {
  DETERMINISTIC_SIMULATOR_DESCRIPTOR,
  ProviderHttpAdapterError,
  createOpenAICompatibleModelAdapter,
  initialProject,
  createHeroBlock,
  applyOperations,
  stableStringify,
  type ManifestModelRequest,
  type ProviderFetchResponse,
} from '@design-workbench/m0-contract';
import { createSalesDashboardRecipe } from '../packages/catalog/src/recipes.ts';

const descriptor = { ...DETERMINISTIC_SIMULATOR_DESCRIPTOR, status: 'configured' as const, secretConfigured: true };
function request(signal?: AbortSignal): ManifestModelRequest {
  const project = heroProject();
  return { requestId: 'req-http-1', providerId: 'custom', modelId: 'manifest-simulator-v1', description: 'Sans animation', snapshot: project.snapshot, baseSignature: stableStringify(project.snapshot), signal };
}
function response(payload: unknown, status = 200): ProviderFetchResponse { return { ok: status >= 200 && status < 300, status, json: async () => payload }; }

test('l’adaptateur envoie le modèle et la description sans persister la clé', async () => {
  let seenUrl = '', seenInit: { headers: Record<string, string>; body: string } | undefined;
  const adapter = createOpenAICompatibleModelAdapter({ descriptor, baseUrl: 'https://api.example.test/v1', getApiKey: () => 'secret-test', fetchImpl: async (url, init) => { seenUrl = url; seenInit = init; return response({ choices: [{ message: { content: '{"operations":[{"op":"update_props","pageId":"page-home","blockId":"block-hero","props":{"animation":"none"}}]}' } }] }); } });
  const result = await adapter.suggest(request());
  assert.equal(seenUrl, 'https://api.example.test/v1/chat/completions');
  assert.equal(seenInit?.headers.authorization, 'Bearer secret-test');
  assert.match(seenInit?.body ?? '', /manifest-simulator-v1/);
  assert.equal(result.operations[0]?.op, 'update_props');
  assert.equal(stableStringify(request().snapshot), stableStringify(heroProject().snapshot));
});

test('une clé absente est refusée avant l’appel HTTP', async () => {
  let called = false;
  const adapter = createOpenAICompatibleModelAdapter({ descriptor, baseUrl: 'https://api.example.test', getApiKey: () => undefined, fetchImpl: async () => { called = true; return response({}); } });
  await assert.rejects(adapter.suggest(request()), (error: unknown) => error instanceof ProviderHttpAdapterError && error.code === 'MISSING_CREDENTIAL');
  assert.equal(called, false);
});

test('le contrat envoyé permet une insertion racine vérifiée sur un Snapshot vide', async () => {
  const project = initialProject();
  const operation = { op: 'insert_block', pageId: 'page-home', parentBlockId: null, slot: 'content', beforeBlockId: null, block: createHeroBlock('from-provider') };
  let sentBody = '';
  const adapter = createOpenAICompatibleModelAdapter({ descriptor, baseUrl: 'https://api.example.test/v1', getApiKey: () => 'test-only', fetchImpl: async (_url, init) => {
    sentBody = init.body;
    return response({ choices: [{ message: { content: JSON.stringify({ operations: [operation], rationale: 'Premier bloc' }) } }] });
  } });
  const result = await adapter.suggest({ ...request(), snapshot: project.snapshot, baseSignature: stableStringify(project.snapshot) });
  const instruction = JSON.parse(sentBody).messages[0].content;
  for (const name of ['insert_block', 'update_props', 'remove_block', 'update_theme']) assert.ok(instruction.includes(name));
  assert.ok(instruction.includes('"parentBlockId":null,"slot":"content","beforeBlockId":null'));
  assert.deepEqual(result.operations, [operation]);
  assert.equal(applyOperations(project.snapshot, result.operations).pages[0]!.composition.content[0]!.props.id, 'from-provider');
  assert.deepEqual(project.snapshot.pages[0]!.composition.content, []);
});

test('le modèle reçoit seulement les capacités de la release locale et peut proposer une CatalogPage structurée', async () => {
  const project = initialProject();
  const catalogPage = createSalesDashboardRecipe();
  const operation = { op: 'set_catalog_page', pageId: 'page-home', catalogPage };
  let sentMessages: { role: string; content: string }[] = [];
  const adapter = createOpenAICompatibleModelAdapter({ descriptor, baseUrl: 'https://api.example.test/v1', getApiKey: () => 'test-only', fetchImpl: async (_url, init) => {
    sentMessages = JSON.parse(init.body).messages;
    return response({ choices: [{ message: { content: JSON.stringify({ operations: [operation], rationale: 'Page de ventes composée avec les blocs locaux.' }) } }] });
  } });
  const result = await adapter.suggest({ ...request(), snapshot: project.snapshot, baseSignature: stableStringify(project.snapshot) });
  const capabilityMessage = sentMessages[1]!.content;
  assert.match(capabilityMessage, /manifest-core/);
  assert.match(capabilityMessage, /cloud-background/);
  assert.match(capabilityMessage, /sales-chart/);
  assert.match(capabilityMessage, /fade-in/);
  assert.match(capabilityMessage, /unslop-informed/);
  assert.match(capabilityMessage, /CC BY 4\.0/);
  assert.match(capabilityMessage, /spacing/);
  assert.match(capabilityMessage, /severity/);
  assert.match(capabilityMessage, /contrast/);
  assert.match(capabilityMessage, /exceptions/);
  assert.doesNotMatch(capabilityMessage, /React Bits|Aceternity|https?:\/\//);
  assert.doesNotMatch(capabilityMessage, /test-only|secret-test|api[_-]?key|credential/i);
  assert.deepEqual(result.operations, [operation]);
  assert.deepEqual(applyOperations(project.snapshot, result.operations).pages[0]!.catalogPage, catalogPage);
  assert.doesNotMatch(JSON.stringify(result), /<script|<style|dangerouslySetInnerHTML/);
});

test('le fournisseur ne peut pas utiliser update_props pour créer un bloc absent', async () => {
  const project = initialProject();
  const adapter = createOpenAICompatibleModelAdapter({ descriptor, baseUrl: 'https://api.example.test', getApiKey: () => 'test-only', fetchImpl: async () => response({ choices: [{ message: { content: JSON.stringify({ operations: [{ op: 'update_props', pageId: 'page-home', blockId: 'absent', props: { title: 'Interdit' } }] }) } }] }) });
  await assert.rejects(adapter.suggest({ ...request(), snapshot: project.snapshot, baseSignature: stableStringify(project.snapshot) }), (error: unknown) => error instanceof ProviderHttpAdapterError && error.code === 'INVALID_OUTPUT');
  assert.deepEqual(project.snapshot.pages[0]!.composition.content, []);
});

test('une réponse hors contrat est rejetée sans muter le Snapshot', async () => {
  const input = request();
  const before = stableStringify(input.snapshot);
  const adapter = createOpenAICompatibleModelAdapter({ descriptor, baseUrl: 'https://api.example.test', getApiKey: () => 'secret-test', fetchImpl: async () => response({ choices: [{ message: { content: '{"operations":[{"op":"run_code"}]}' } }] }) });
  await assert.rejects(adapter.suggest(input), (error: unknown) => error instanceof ProviderHttpAdapterError && error.code === 'INVALID_OUTPUT');
  assert.equal(stableStringify(input.snapshot), before);
});

test('les erreurs HTTP sont normalisées sans relayer le corps distant', async () => {
  const adapter = createOpenAICompatibleModelAdapter({ descriptor, baseUrl: 'https://api.example.test', getApiKey: () => 'secret-test', fetchImpl: async () => response({ secret: 'do-not-return' }, 401) });
  await assert.rejects(adapter.suggest(request()), (error: unknown) => error instanceof ProviderHttpAdapterError && error.code === 'UNAUTHORIZED' && !error.message.includes('do-not-return'));
});

test('les endpoints non sécurisés, avec paramètres ou credentials sont refusés', () => {
  for (const baseUrl of ['http://api.example.test/v1', 'https://user:pass@api.example.test/v1', 'https://api.example.test/v1?token=secret']) {
    assert.throws(() => createOpenAICompatibleModelAdapter({ descriptor, baseUrl, getApiKey: () => 'secret-test', fetchImpl: async () => response({}) }), ProviderHttpAdapterError);
  }
  assert.doesNotThrow(() => createOpenAICompatibleModelAdapter({ descriptor, baseUrl: 'http://127.0.0.1:9000/v1', getApiKey: () => 'secret-test', fetchImpl: async () => response({}) }));
});
