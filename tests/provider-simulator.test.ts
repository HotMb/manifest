import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProject, stableStringify, createDeterministicModelAdapter, isModelResultCurrent, applyOperations, type ManifestModelRequest } from '@design-workbench/m0-contract';
import { heroProject } from './fixtures/m0-project.ts';

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
  const insertion = result.operations.find((operation) => operation.op === 'insert_block');
  assert.equal(insertion?.slot, 'content');
  assert.equal(insertion?.parentBlockId, null);
  assert.equal(insertion?.beforeBlockId, null);
  assert.equal(applyOperations(input.snapshot, result.operations).pages[0]!.composition.content[0]!.props.title, 'Une page calme');
});

test('une palette seule ne crée pas silencieusement un Hero sur le canevas vide', async () => {
  const input = request('Un fond sombre avec un accent vert');
  const result = await createDeterministicModelAdapter().suggest(input);
  assert.deepEqual(result.operations.map((operation) => operation.op), ['update_theme']);
  assert.deepEqual(applyOperations(input.snapshot, result.operations).pages[0]!.composition.content, []);
});

test('un projet Hero existant est modifié sans insertion et garde ses identifiants', async () => {
  const project = heroProject();
  const input = { ...request('Titre : Nouveau titre'), snapshot: project.snapshot, baseSignature: stableStringify(project.snapshot) };
  const result = await createDeterministicModelAdapter().suggest(input);
  assert.deepEqual(result.operations.map((operation) => operation.op), ['update_props']);
  assert.equal(applyOperations(input.snapshot, result.operations).pages[0]!.composition.content[0]!.props.id, 'block-hero');
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
