import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProject, stableStringify, createDeterministicModelAdapter, isModelResultCurrent, type ManifestModelRequest } from '@design-workbench/m0-contract';

function request(description: string, signal?: AbortSignal): ManifestModelRequest {
  const project = initialProject();
  return { requestId: 'req-1', providerId: 'custom', modelId: 'manifest-simulator-v1', description, snapshot: project.snapshot, baseSignature: stableStringify(project.snapshot), signal };
}

test('le simulateur produit des opérations structurées sans modifier le Snapshot', async () => {
  const input = request('Un fond sombre avec un accent vert.\nTitre : Une page calme');
  const before = stableStringify(input.snapshot);
  const result = await createDeterministicModelAdapter().suggest(input);
  assert.equal(result.source, 'provider');
  assert.equal(result.baseSignature, input.baseSignature);
  assert.ok(result.operations.length > 0);
  assert.equal(stableStringify(input.snapshot), before);
});

test('un résultat qui vise une autre base devient obsolète', async () => {
  const input = request('Fondu');
  const result = await createDeterministicModelAdapter().suggest(input);
  assert.equal(isModelResultCurrent(input, result), true);
  assert.equal(isModelResultCurrent({ ...input, baseSignature: 'other-base' }, result), false);
  assert.equal(isModelResultCurrent({ ...input, requestId: 'req-2' }, result), false);
});

test('une demande annulée ne retourne jamais de résultat', async () => {
  const controller = new AbortController();
  const pending = createDeterministicModelAdapter(20).suggest(request('Fondu', controller.signal));
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('un fournisseur réel ne peut pas être simulé par erreur', async () => {
  const input = request('Fondu');
  await assert.rejects(createDeterministicModelAdapter().suggest({ ...input, providerId: 'openai' }), /modèle déterministe/);
});
