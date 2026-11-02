import assert from 'node:assert/strict';
import test from 'node:test';
import { validateModelProviderRegistry } from '@design-workbench/m0-contract';
import { INITIAL_PROVIDER_PREPARATION, PREPARATION_PROVIDER_REGISTRY, prepareModel, prepareProvider, providerPreparationDeclaration } from '../src/provider-preparation.ts';

test('le registre UI est accepté par le contrat partagé sans modèle ni secret configuré', () => {
  validateModelProviderRegistry(PREPARATION_PROVIDER_REGISTRY);
  assert.ok(PREPARATION_PROVIDER_REGISTRY.providers.every((provider) => provider.status === 'disconnected' && !provider.secretConfigured && provider.models.length === 0));
});

test('choisir un autre fournisseur efface le modèle précédent au lieu de le réutiliser implicitement', () => {
  const openai = prepareModel(prepareProvider(INITIAL_PROVIDER_PREPARATION, 'openai'), 'mon-modele');
  const anthropic = prepareProvider(openai, 'anthropic');
  assert.deepEqual(anthropic, { providerId: 'anthropic', requestedModelId: '' });
  assert.equal(prepareProvider(openai, 'openai'), openai);
  assert.deepEqual(prepareProvider(openai, ''), INITIAL_PROVIDER_PREPARATION);
});

test('un identifiant saisi ne devient jamais un modèle connecté ou vérifié', () => {
  const selection = prepareModel(prepareProvider(INITIAL_PROVIDER_PREPARATION, 'deepseek'), '  modele-demande  ');
  assert.deepEqual(providerPreparationDeclaration(selection), {
    schemaVersion: 1, mode: 'preparation-only', provider: { id: 'deepseek', label: 'DeepSeek' },
    requestedModelId: 'modele-demande', connection: 'not-connected', modelVerified: false,
    inferenceEnabled: false, persisted: false,
  });
  assert.equal(selection.requestedModelId, '  modele-demande  ');
});

test('aucun modèle ni fournisseur implicite ne peut apparaître avant un choix explicite', () => {
  assert.equal(prepareModel(INITIAL_PROVIDER_PREPARATION, 'modele'), INITIAL_PROVIDER_PREPARATION);
  assert.equal(providerPreparationDeclaration(INITIAL_PROVIDER_PREPARATION).provider, null);
  assert.equal(providerPreparationDeclaration(INITIAL_PROVIDER_PREPARATION).requestedModelId, null);
  assert.throws(() => prepareProvider(INITIAL_PROVIDER_PREPARATION, 'fournisseur-inconnu'));
});
