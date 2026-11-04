import type { ModelProviderId, ModelProviderRegistry } from '@design-workbench/m0-contract';

export type ModelSelection = { providerId: ModelProviderId | null; modelId: string | null };
export const EMPTY_MODEL_SELECTION: ModelSelection = { providerId: null, modelId: null };

/** Select only a single configured provider with a single model; ambiguity stays explicit. */
export function defaultModelSelection(registry: ModelProviderRegistry): ModelSelection {
  const configured = registry.providers.filter((provider) => provider.status === 'configured' && provider.models.length > 0);
  return configured.length === 1 && configured[0]!.models.length === 1
    ? selectProvider(registry, EMPTY_MODEL_SELECTION, configured[0]!.id)
    : EMPTY_MODEL_SELECTION;
}

export function selectProvider(registry: ModelProviderRegistry, current: ModelSelection, providerId: string): ModelSelection {
  if (!providerId) return EMPTY_MODEL_SELECTION;
  const provider = registry.providers.find((entry) => entry.id === providerId && entry.status === 'configured' && entry.models.length > 0);
  if (!provider) throw new Error('Ce fournisseur n’est pas disponible dans cet atelier.');
  if (provider.id === current.providerId && provider.models.some((model) => model.id === current.modelId)) return current;
  return { providerId: provider.id, modelId: provider.models.length === 1 ? provider.models[0]!.id : null };
}

export function selectModel(registry: ModelProviderRegistry, current: ModelSelection, modelId: string): ModelSelection {
  const provider = registry.providers.find((entry) => entry.id === current.providerId && entry.status === 'configured');
  if (!provider || !provider.models.some((model) => model.id === modelId)) throw new Error('Ce modèle n’est pas disponible dans cet atelier.');
  return { providerId: provider.id, modelId };
}

export function selectedModel(registry: ModelProviderRegistry, selection: ModelSelection) {
  const provider = registry.providers.find((entry) => entry.id === selection.providerId && entry.status === 'configured');
  const model = provider?.models.find((entry) => entry.id === selection.modelId);
  return provider && model ? { provider, model } : undefined;
}

/** Report-safe selection metadata. Secret material and key-derived values are never included. */
export function modelSelectionDeclaration(registry: ModelProviderRegistry, selection: ModelSelection) {
  const selected = selectedModel(registry, selection);
  return {
    schemaVersion: 1 as const,
    mode: selected ? 'provider-suggestions' as const : 'local-only' as const,
    provider: selected ? { id: selected.provider.id, label: selected.provider.label, protocol: selected.provider.protocol } : null,
    model: selected ? { id: selected.model.id, label: selected.model.label } : null,
    inferenceEnabled: Boolean(selected),
    persisted: false as const,
  };
}
