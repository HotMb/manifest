import assert from 'node:assert/strict';
import test from 'node:test';
import { disconnectedProviderRegistry, validateModelProviderRegistry, type ModelProviderRegistry } from '@design-workbench/m0-contract';
import { EMPTY_MODEL_SELECTION, modelSelectionDeclaration, selectModel, selectProvider, selectedModel } from '../src/model-selection.ts';

const registry: ModelProviderRegistry = {
  schemaVersion: 1,
  providers: [{ id: 'deepseek', label: 'DeepSeek', protocol: 'openai-compatible', status: 'configured', models: [
    { id: 'deepseek-chat', label: 'DeepSeek Chat', providerId: 'deepseek', capabilities: ['structured-output'] },
    { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner', providerId: 'deepseek', capabilities: ['structured-output'] },
  ], supportsBYOK: false, secretConfigured: true }],
};

test('un registre vide garde le mode local sans fournisseur implicite', () => {
  validateModelProviderRegistry(disconnectedProviderRegistry());
  assert.equal(selectedModel(disconnectedProviderRegistry(), EMPTY_MODEL_SELECTION), undefined);
  assert.equal(modelSelectionDeclaration(disconnectedProviderRegistry(), EMPTY_MODEL_SELECTION).inferenceEnabled, false);
});

test('un fournisseur choisi utilise son premier modèle vérifié puis conserve un changement valide', () => {
  const first = selectProvider(registry, EMPTY_MODEL_SELECTION, 'deepseek');
  assert.deepEqual(first, { providerId: 'deepseek', modelId: 'deepseek-chat' });
  assert.deepEqual(selectModel(registry, first, 'deepseek-reasoner'), { providerId: 'deepseek', modelId: 'deepseek-reasoner' });
  assert.equal(selectProvider(registry, first, 'deepseek'), first);
});

test('les modèles non déclarés ou non configurés ne deviennent pas sélectionnables', () => {
  assert.throws(() => selectProvider(registry, EMPTY_MODEL_SELECTION, 'anthropic'));
  assert.throws(() => selectModel(registry, EMPTY_MODEL_SELECTION, 'deepseek-chat'));
  assert.throws(() => selectModel(registry, { providerId: 'deepseek', modelId: null }, 'model-injected'));
});

test('la déclaration de rapport n’inclut que les métadonnées non sensibles', () => {
  const declaration = modelSelectionDeclaration(registry, selectProvider(registry, EMPTY_MODEL_SELECTION, 'deepseek'));
  assert.equal(declaration.mode, 'provider-suggestions');
  assert.deepEqual(declaration.provider, { id: 'deepseek', label: 'DeepSeek', protocol: 'openai-compatible' });
  assert.deepEqual(declaration.model, { id: 'deepseek-chat', label: 'DeepSeek Chat' });
  assert.equal(JSON.stringify(declaration).includes('secret'), false);
  assert.equal(JSON.stringify(declaration).includes('key'), false);
});
