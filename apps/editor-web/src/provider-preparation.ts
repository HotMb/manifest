import { validateModelProviderRegistry, type ModelProviderDescriptor, type ModelProviderRegistry } from '@design-workbench/m0-contract';

/** A UI fallback registry conforming to the shared contract, with no active adapter. */
export const PREPARATION_PROVIDERS = [
  { id: 'openai', label: 'OpenAI', protocol: 'openai-responses', status: 'disconnected', models: [], supportsBYOK: false, secretConfigured: false },
  { id: 'anthropic', label: 'Anthropic', protocol: 'anthropic-messages', status: 'disconnected', models: [], supportsBYOK: false, secretConfigured: false },
  { id: 'google', label: 'Google', protocol: 'google-generate-content', status: 'disconnected', models: [], supportsBYOK: false, secretConfigured: false },
  { id: 'deepseek', label: 'DeepSeek', protocol: 'openai-compatible', status: 'disconnected', models: [], supportsBYOK: false, secretConfigured: false },
] satisfies ModelProviderDescriptor[];

export const PREPARATION_PROVIDER_REGISTRY: ModelProviderRegistry = { schemaVersion: 1, providers: PREPARATION_PROVIDERS };
validateModelProviderRegistry(PREPARATION_PROVIDER_REGISTRY);

export type PreparationProviderId = typeof PREPARATION_PROVIDERS[number]['id'];
export type ProviderPreparationSelection = {
  providerId: PreparationProviderId | null;
  requestedModelId: string;
};

export const INITIAL_PROVIDER_PREPARATION: ProviderPreparationSelection = { providerId: null, requestedModelId: '' };

export function prepareProvider(current: ProviderPreparationSelection, providerId: string): ProviderPreparationSelection {
  const provider = PREPARATION_PROVIDERS.find((entry) => entry.id === providerId);
  if (providerId && !provider) throw new Error('Ce fournisseur ne figure pas dans la liste de préparation.');
  const nextId = provider?.id ?? null;
  // A model identifier belongs to a provider; changing provider must not silently carry it over.
  return nextId === current.providerId ? current : { providerId: nextId, requestedModelId: '' };
}

export function prepareModel(current: ProviderPreparationSelection, requestedModelId: string): ProviderPreparationSelection {
  if (!current.providerId) return current;
  return { ...current, requestedModelId: requestedModelId.slice(0, 160) };
}

export function providerPreparationDeclaration(selection: ProviderPreparationSelection) {
  const provider = PREPARATION_PROVIDERS.find((entry) => entry.id === selection.providerId);
  return {
    schemaVersion: 1 as const,
    mode: 'preparation-only' as const,
    provider: provider ? { id: provider.id, label: provider.label } : null,
    requestedModelId: provider ? selection.requestedModelId.trim() || null : null,
    connection: 'not-connected' as const,
    modelVerified: false as const,
    inferenceEnabled: false as const,
    persisted: false as const,
  };
}
