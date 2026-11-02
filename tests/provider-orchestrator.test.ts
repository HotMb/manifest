import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DETERMINISTIC_SIMULATOR_DESCRIPTOR,
  ModelOrchestratorError,
  ModelSuggestionOrchestrator,
  createDeterministicModelAdapter,
  initialProject,
  stableStringify,
  type ManifestModelRequest,
} from '@design-workbench/m0-contract';

function request(id: string, description: string): ManifestModelRequest {
  const project = initialProject();
  return {
    requestId: id,
    providerId: 'custom',
    modelId: 'manifest-simulator-v1',
    description,
    snapshot: project.snapshot,
    baseSignature: stableStringify(project.snapshot),
  };
}

function orchestrator(delayMs = 0) {
  return new ModelSuggestionOrchestrator({
    registry: { schemaVersion: 1, providers: [DETERMINISTIC_SIMULATOR_DESCRIPTOR] },
    adapters: [createDeterministicModelAdapter(delayMs)],
  });
}

test('l’orchestrateur route une intention vers l’adaptateur qualifié', async () => {
  const outcome = await orchestrator().suggest(request('req-1', 'Sans animation'));
  assert.equal(outcome.status, 'ready');
  assert.equal(outcome.result.operations[0]?.op, 'update_props');
});

test('une nouvelle intention annule la précédente et seule la plus récente reste active', async () => {
  const service = orchestrator(25);
  const first = service.suggest(request('req-1', 'Fondu'));
  const second = service.suggest(request('req-2', 'Sans animation'));
  await assert.rejects(first, { name: 'AbortError' });
  const outcome = await second;
  assert.equal(outcome.status, 'ready');
  assert.equal(outcome.result.requestId, 'req-2');
});

test('une réponse tardive ignorée par un adaptateur devient stale', async () => {
  const adapter = createDeterministicModelAdapter(1);
  const lateAdapter = {
    descriptor: adapter.descriptor,
    async suggest(input: ManifestModelRequest) {
      await new Promise((resolve) => setTimeout(resolve, input.requestId === 'req-1' ? 30 : 1));
      return adapter.suggest({ ...input, signal: undefined });
    },
  };
  const service = new ModelSuggestionOrchestrator({ registry: { schemaVersion: 1, providers: [DETERMINISTIC_SIMULATOR_DESCRIPTOR] }, adapters: [lateAdapter] });
  const first = service.suggest(request('req-1', 'Fondu'));
  const second = service.suggest(request('req-2', 'Sans animation'));
  const outcome = await first;
  assert.equal(outcome.status, 'stale');
  await second;
});

test('un modèle absent du registre est refusé avant tout appel adaptateur', async () => {
  const service = orchestrator();
  await assert.rejects(service.suggest({ ...request('req-1', 'Fondu'), modelId: 'unknown' }), (error: unknown) => error instanceof ModelOrchestratorError && error.code === 'MODEL_NOT_REGISTERED');
});
