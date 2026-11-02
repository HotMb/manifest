import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DETERMINISTIC_SIMULATOR_DESCRIPTOR,
  ProviderHttpAdapterError,
  createOpenAICompatibleModelAdapter,
  initialProject,
  stableStringify,
  type ManifestModelRequest,
  type ProviderFetchResponse,
} from '@design-workbench/m0-contract';

const descriptor = { ...DETERMINISTIC_SIMULATOR_DESCRIPTOR, status: 'configured' as const, secretConfigured: true };
function request(signal?: AbortSignal): ManifestModelRequest {
  const project = initialProject();
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
  assert.equal(stableStringify(request().snapshot), stableStringify(initialProject().snapshot));
});

test('une clé absente est refusée avant l’appel HTTP', async () => {
  let called = false;
  const adapter = createOpenAICompatibleModelAdapter({ descriptor, baseUrl: 'https://api.example.test', getApiKey: () => undefined, fetchImpl: async () => { called = true; return response({}); } });
  await assert.rejects(adapter.suggest(request()), (error: unknown) => error instanceof ProviderHttpAdapterError && error.code === 'MISSING_CREDENTIAL');
  assert.equal(called, false);
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
