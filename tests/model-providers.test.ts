import test from 'node:test';
import assert from 'node:assert/strict';
import { disconnectedProviderRegistry, validateModelProviderDescriptor, validateModelProviderRegistry, type ModelProviderDescriptor } from '@design-workbench/m0-contract';

const openAI: ModelProviderDescriptor = {
  id: 'openai', label: 'OpenAI', protocol: 'openai-responses', status: 'configured', supportsBYOK: true, secretConfigured: true,
  models: [{ id: 'gpt-test', label: 'Test model', providerId: 'openai', capabilities: ['structured-output', 'streaming'], limits: { contextWindowTokens: 128_000 }, pricing: { currency: 'USD', estimatedOnly: true } }],
};

test('registre fournisseur déconnecté par défaut et sans secret', () => {
  const registry = disconnectedProviderRegistry();
  validateModelProviderRegistry(registry);
  assert.deepEqual(registry, { schemaVersion: 1, providers: [] });
});

test('registre accepte un fournisseur configuré avec un prix estimatif', () => {
  validateModelProviderRegistry({ schemaVersion: 1, providers: [openAI] });
});

test('un fournisseur configuré sans secret est refusé', () => {
  assert.throws(() => validateModelProviderDescriptor({ ...openAI, secretConfigured: false }), /secret configuré/);
});

test('un modèle ne peut pas déclarer un autre fournisseur', () => {
  assert.throws(() => validateModelProviderDescriptor({ ...openAI, models: [{ ...openAI.models[0]!, providerId: 'anthropic' }] }), /autre fournisseur/);
});

test('le contrat refuse les capacités dupliquées et les prix négatifs', () => {
  assert.throws(() => validateModelProviderDescriptor({ ...openAI, models: [{ ...openAI.models[0]!, capabilities: ['streaming', 'streaming'] }] }), /capacités/);
  assert.throws(() => validateModelProviderDescriptor({ ...openAI, models: [{ ...openAI.models[0]!, pricing: { currency: 'USD', estimatedOnly: true, outputPerMillionTokens: -1 } }] }), /prix/);
});
