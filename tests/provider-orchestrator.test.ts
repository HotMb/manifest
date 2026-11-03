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
  assert.equal(outcome.result.operations[0]?.op, 'insert_block');
});

test('deux sessions du même hôte peuvent générer sans annuler le job de l’autre', async () => {
  const service = orchestrator(25);
  const first = service.suggest(request('req-1', 'Fondu'));
  const second = service.suggest(request('req-2', 'Sans animation'));
  const [firstOutcome, secondOutcome] = await Promise.all([first, second]);
  assert.equal(firstOutcome.status, 'ready');
  assert.equal(firstOutcome.result.requestId, 'req-1');
  assert.equal(secondOutcome.status, 'ready');
  assert.equal(secondOutcome.result.requestId, 'req-2');
});

test('une réponse tardive d’une session ne rend pas obsolète celle d’une autre', async () => {
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
  const [firstOutcome, secondOutcome] = await Promise.all([first, second]);
  assert.equal(firstOutcome.status, 'ready');
  assert.equal(secondOutcome.status, 'ready');
});

test('un signal appelant déjà annulé ne lance pas l’adaptateur', async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  const adapter = createDeterministicModelAdapter();
  const guardedAdapter = { descriptor: adapter.descriptor, async suggest(input: ManifestModelRequest) { called = true; return adapter.suggest(input); } };
  const service = new ModelSuggestionOrchestrator({ registry: { schemaVersion: 1, providers: [DETERMINISTIC_SIMULATOR_DESCRIPTOR] }, adapters: [guardedAdapter] });
  await assert.rejects(service.suggest({ ...request('req-1', 'Sans animation'), signal: controller.signal }), { name: 'AbortError' });
  assert.equal(called, false);
});

test('une annulation appelant invalide aussi une réponse tardive', async () => {
  const controller = new AbortController();
  const adapter = createDeterministicModelAdapter(1);
  const ignoringAdapter = {
    descriptor: adapter.descriptor,
    async suggest(input: ManifestModelRequest) {
      await new Promise((resolve) => setTimeout(resolve, 15));
      return adapter.suggest({ ...input, signal: undefined });
    },
  };
  const service = new ModelSuggestionOrchestrator({ registry: { schemaVersion: 1, providers: [DETERMINISTIC_SIMULATOR_DESCRIPTOR] }, adapters: [ignoringAdapter] });
  const pending = service.suggest({ ...request('req-1', 'Sans animation'), signal: controller.signal });
  controller.abort();
  const outcome = await pending;
  assert.equal(outcome.status, 'stale');
});

test('un modèle absent du registre est refusé avant tout appel adaptateur', async () => {
  const service = orchestrator();
  await assert.rejects(service.suggest({ ...request('req-1', 'Fondu'), modelId: 'unknown' }), (error: unknown) => error instanceof ModelOrchestratorError && error.code === 'MODEL_NOT_REGISTERED');
});
