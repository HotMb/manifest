import test from 'node:test';
import assert from 'node:assert/strict';
import { heroProject } from './fixtures/m0-project.ts';
import {
  ProviderHttpAdapterError,
  createChatGPTResponsesAdapter,
  stableStringify,
  type ManifestModelRequest,
  type ModelProviderDescriptor,
} from '@design-workbench/m0-contract';

const descriptor: ModelProviderDescriptor = {
  id: 'openai', label: 'ChatGPT', protocol: 'openai-responses', status: 'configured',
  models: [{ id: 'gpt-test', label: 'Test model', providerId: 'openai', capabilities: ['structured-output', 'streaming'] }],
  supportsBYOK: false, secretConfigured: true,
};

function request(signal?: AbortSignal): ManifestModelRequest {
  const project = heroProject();
  return { requestId: 'req-responses-1', providerId: 'openai', modelId: 'gpt-test', description: 'Descends le bloc avec un fondu.', snapshot: project.snapshot, baseSignature: stableStringify(project.snapshot), signal };
}

function stream(events: unknown[], chunkSize = 13): Response {
  const text = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += chunkSize) controller.enqueue(bytes.slice(offset, offset + chunkSize));
      controller.close();
    },
  }), { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

test('l’adaptateur appelle Responses en stream non stocké puis ne renvoie que les opérations M0 validées', async () => {
  let seenUrl = '';
  let seenInit: RequestInit | undefined;
  const operation = { op: 'update_props', pageId: 'page-home', blockId: 'block-hero', props: { animation: 'fade' } };
  const adapter = createChatGPTResponsesAdapter({
    descriptor,
    getAccessToken: async () => 'oauth-token-test',
    fetchImpl: async (url, init) => {
      seenUrl = url;
      seenInit = init;
      return stream([
        { type: 'response.output_text.delta', delta: JSON.stringify({ operations: [operation], rationale: 'Fondu demandé.' }) },
        { type: 'response.completed', response: { usage: { input_tokens: 21, output_tokens: 9 }, output: [] } },
      ]);
    },
  });
  const result = await adapter.suggest(request());
  const body = JSON.parse(String(seenInit?.body));
  assert.equal(seenUrl, 'https://api.openai.com/v1/responses');
  assert.equal(seenInit?.method, 'POST');
  assert.equal((seenInit?.headers as Record<string, string>).authorization, 'Bearer oauth-token-test');
  assert.equal(body.store, false);
  assert.equal(body.stream, true);
  assert.deepEqual(body.text, { format: { type: 'json_object' } });
  assert.match(body.instructions, /set_catalog_page/);
  assert.match(body.input[0].content[0].text, /Descends le bloc/);
  assert.deepEqual(result.operations, [operation]);
  assert.deepEqual(result.usage, { inputTokens: 21, outputTokens: 9 });
  assert.equal(stableStringify(request().snapshot), stableStringify(heroProject().snapshot));
});

test('un flux sans response.completed est refusé même si du texte a été reçu', async () => {
  const adapter = createChatGPTResponsesAdapter({
    descriptor,
    getAccessToken: async () => 'oauth-token-test',
    fetchImpl: async () => stream([{ type: 'response.output_text.delta', delta: '{"operations":[]}' }]),
  });
  await assert.rejects(adapter.suggest(request()), (error: unknown) => error instanceof ProviderHttpAdapterError && error.code === 'UNAVAILABLE');
});

test('les erreurs du flux et du serveur ne relaient pas le corps distant', async () => {
  const failed = createChatGPTResponsesAdapter({
    descriptor,
    getAccessToken: async () => 'oauth-token-test',
    fetchImpl: async () => stream([{ type: 'response.failed', secret: 'must-not-escape' }]),
  });
  await assert.rejects(failed.suggest(request()), (error: unknown) => error instanceof ProviderHttpAdapterError && !error.message.includes('must-not-escape'));

  const unauthorized = createChatGPTResponsesAdapter({
    descriptor,
    getAccessToken: async () => 'oauth-token-test',
    fetchImpl: async () => new Response(JSON.stringify({ error: 'private-body' }), { status: 401 }),
  });
  await assert.rejects(unauthorized.suggest(request()), (error: unknown) => error instanceof ProviderHttpAdapterError && error.code === 'UNAUTHORIZED' && !error.message.includes('private-body'));
});

test('un jeton refusé par le contrat OAuth ne déclenche aucun appel Responses', async () => {
  let called = false;
  const adapter = createChatGPTResponsesAdapter({
    descriptor,
    getAccessToken: async () => { throw Object.assign(new Error('private'), { code: 'insufficient_scope' }); },
    fetchImpl: async () => { called = true; return stream([]); },
  });
  await assert.rejects(adapter.suggest(request()), (error: unknown) => error instanceof ProviderHttpAdapterError && error.code === 'MISSING_CREDENTIAL');
  assert.equal(called, false);
});
