import assert from 'node:assert/strict';
import test from 'node:test';
import { disconnectedProviderRegistry, validateModelProviderRegistry, type ModelProviderRegistry } from '@design-workbench/m0-contract';
import { defaultModelSelection, EMPTY_MODEL_SELECTION, modelSelectionDeclaration, selectModel, selectProvider, selectedModel } from '../src/model-selection.ts';

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
  assert.deepEqual(defaultModelSelection(disconnectedProviderRegistry()), EMPTY_MODEL_SELECTION);
});

test('un seul fournisseur et un seul modèle configurés deviennent la cible automatique de l’aperçu live', () => {
  const singleModel: ModelProviderRegistry = { ...registry, providers: [{ ...registry.providers[0]!, models: [registry.providers[0]!.models[0]!] }] };
  assert.deepEqual(defaultModelSelection(singleModel), { providerId: 'deepseek', modelId: 'deepseek-chat' });
  assert.deepEqual(defaultModelSelection(registry), EMPTY_MODEL_SELECTION);
  const ambiguous: ModelProviderRegistry = { ...registry, providers: [...registry.providers, { ...registry.providers[0]!, id: 'openai', label: 'OpenAI', models: [{ id: 'gpt-test', label: 'GPT Test', providerId: 'openai', capabilities: ['structured-output'] }] }] };
  assert.deepEqual(defaultModelSelection(ambiguous), EMPTY_MODEL_SELECTION);
});

test('le modèle unique est sélectionné automatiquement, plusieurs modèles demandent un choix explicite', () => {
  const first = selectProvider(registry, EMPTY_MODEL_SELECTION, 'deepseek');
  assert.deepEqual(first, { providerId: 'deepseek', modelId: null });
  const selected = selectModel(registry, first, 'deepseek-reasoner');
  assert.deepEqual(selected, { providerId: 'deepseek', modelId: 'deepseek-reasoner' });
  assert.equal(selectProvider(registry, selected, 'deepseek'), selected);
  const singleModel: ModelProviderRegistry = { ...registry, providers: [{ ...registry.providers[0]!, models: [registry.providers[0]!.models[0]!] }] };
  assert.deepEqual(selectProvider(singleModel, EMPTY_MODEL_SELECTION, 'deepseek'), { providerId: 'deepseek', modelId: 'deepseek-chat' });
});

test('les modèles non déclarés ou non configurés ne deviennent pas sélectionnables', () => {
  assert.throws(() => selectProvider(registry, EMPTY_MODEL_SELECTION, 'anthropic'));
  assert.throws(() => selectModel(registry, EMPTY_MODEL_SELECTION, 'deepseek-chat'));
  assert.throws(() => selectModel(registry, { providerId: 'deepseek', modelId: null }, 'model-injected'));
});

test('la déclaration de rapport n’inclut que les métadonnées non sensibles', () => {
  const providerSelection = selectProvider(registry, EMPTY_MODEL_SELECTION, 'deepseek');
  const declaration = modelSelectionDeclaration(registry, selectModel(registry, providerSelection, 'deepseek-chat'));
  assert.equal(declaration.mode, 'provider-suggestions');
  assert.deepEqual(declaration.provider, { id: 'deepseek', label: 'DeepSeek', protocol: 'openai-compatible' });
  assert.deepEqual(declaration.model, { id: 'deepseek-chat', label: 'DeepSeek Chat' });
  assert.equal(JSON.stringify(declaration).includes('secret'), false);
  assert.equal(JSON.stringify(declaration).includes('key'), false);
});
