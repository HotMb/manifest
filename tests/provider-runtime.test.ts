import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { heroProject } from './fixtures/m0-project.ts';
import { MemoryProjectStore } from '../services/api/src/domain.ts';
import { ProviderRuntimeConfigError, createSuggestionRuntime } from '../services/api/src/provider-runtime.ts';
import { createDesignerMcpServer } from '../services/api/src/mcp.ts';
import type { ProviderFetchResponse } from '@design-workbench/m0-contract';

const ok = (payload: unknown): ProviderFetchResponse => ({ ok: true, status: 200, json: async () => payload });

test('aucune configuration ne crée pas de job IA ou d’outil fournisseur', () => {
  assert.equal(createSuggestionRuntime(new MemoryProjectStore(heroProject()), {}), undefined);
});

test('la configuration incomplète est refusée au démarrage', () => {
  assert.throws(() => createSuggestionRuntime(new MemoryProjectStore(heroProject()), { MANIFEST_PROVIDER: 'openai' }), ProviderRuntimeConfigError);
});

test('la configuration hôte injecte la clé seulement dans l’adaptateur', async () => {
  let authorization = '';
  const projectStore = new MemoryProjectStore(heroProject());
  const runtime = createSuggestionRuntime(projectStore, {
    MANIFEST_PROVIDER: 'openai', MANIFEST_MODEL: 'test-model', MANIFEST_API_BASE_URL: 'https://api.example.test/v1', MANIFEST_API_KEY: 'temporary-test-key',
  }, async (_url, init) => {
    authorization = init.headers.authorization ?? '';
    return ok({ choices: [{ message: { content: '{"operations":[{"op":"update_props","pageId":"page-home","blockId":"block-hero","props":{"animation":"none"}}]}' } }] });
  });
  assert.ok(runtime);
  const job = runtime.start('project-m0', {
    idempotencyKey: 'runtime-job', expectedDraftVersion: 0, editorSessionId: 'session-1', intentEpoch: 1,
    intent: 'Sans animation', provider: 'openai', model: 'test-model', mode: 'direct', selectedPageId: 'page-home', selectedBlockId: null,
  });
  const done = await runtime.waitForCompletion(job.jobId);
  assert.equal(done.state, 'succeeded');
  assert.equal(authorization, 'Bearer temporary-test-key');
  assert.equal(JSON.stringify(done).includes('temporary-test-key'), false);
  assert.equal(JSON.stringify(runtime.getUpdates(job.jobId)).includes('temporary-test-key'), false);
  assert.equal(JSON.stringify(runtime.readProposal(done.proposalIds[0]!)).includes('temporary-test-key'), false);
  assert.equal(projectStore.read('project-m0').draftVersion, 0);
});

test('le runtime n’accepte que les fournisseurs au protocole compatible actuel', () => {
  const config = { MANIFEST_PROVIDER: 'anthropic', MANIFEST_MODEL: 'model', MANIFEST_API_BASE_URL: 'https://api.example.test', MANIFEST_API_KEY: 'dummy' };
  assert.throws(() => createSuggestionRuntime(new MemoryProjectStore(heroProject()), config), ProviderRuntimeConfigError);
});

test('aucune métadonnée MCP ne révèle la clé pendant le cycle suggestion', async (t) => {
  const apiKey = 'mcp-only-test-secret';
  const store = new MemoryProjectStore(heroProject());
  const runtime = createSuggestionRuntime(store, {
    MANIFEST_PROVIDER: 'openai', MANIFEST_MODEL: 'test-model', MANIFEST_API_BASE_URL: 'https://api.example.test/v1', MANIFEST_API_KEY: apiKey,
  }, async () => ok({ choices: [{ message: { content: '{"operations":[{"op":"update_props","pageId":"page-home","blockId":"block-hero","props":{"animation":"none"}}]}' } }] }));
  assert.ok(runtime);
  const server = createDesignerMcpServer({ store, suggestionJobs: runtime });
  const client = new Client({ name: 'secret-metadata-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => { await client.close(); await server.close(); });
  await server.connect(serverTransport); await client.connect(clientTransport);
  const started = await client.callTool({ name: 'start_suggestion', arguments: {
    projectId: 'project-m0', idempotencyKey: 'secret-check', expectedDraftVersion: 0, editorSessionId: 'session-1', intentEpoch: 1,
    intent: 'Sans animation', provider: 'openai', model: 'test-model', mode: 'direct', selectedPageId: 'page-home', selectedBlockId: null,
  } });
  assert.equal(JSON.stringify(started._meta).includes(apiKey), false);
  const jobId = (started.structuredContent as { jobId: string }).jobId;
  const completed = await runtime.waitForCompletion(jobId);
  const updates = await client.callTool({ name: 'get_job_updates', arguments: { jobId, afterSeq: 0, limit: 100 } });
  const proposal = await client.callTool({ name: 'read_proposal', arguments: { proposalId: completed.proposalIds[0] } });
  assert.equal(JSON.stringify(updates._meta).includes(apiKey), false);
  assert.equal(JSON.stringify(proposal._meta).includes(apiKey), false);
});
