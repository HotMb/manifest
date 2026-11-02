import {
  ModelSuggestionOrchestrator,
  createOpenAICompatibleModelAdapter,
  validateModelProviderRegistry,
  type ModelProviderDescriptor,
  type ProviderFetch,
} from '@design-workbench/m0-contract';
import type { MemoryProjectStore } from './domain.ts';
import { SuggestionJobManager } from './suggestion-jobs.ts';

export type ProviderRuntimeEnvironment = {
  MANIFEST_PROVIDER?: string;
  MANIFEST_MODEL?: string;
  MANIFEST_API_BASE_URL?: string;
  MANIFEST_API_KEY?: string;
};

export class ProviderRuntimeConfigError extends Error {
  constructor(message: string) { super(message); this.name = 'ProviderRuntimeConfigError'; }
}

/** Builds an opt-in compatible provider runtime from host environment secrets. */
export function createSuggestionRuntime(
  projects: MemoryProjectStore,
  environment: ProviderRuntimeEnvironment = process.env,
  fetchImpl?: ProviderFetch,
): SuggestionJobManager | undefined {
  const configured = [environment.MANIFEST_PROVIDER, environment.MANIFEST_MODEL, environment.MANIFEST_API_BASE_URL, environment.MANIFEST_API_KEY]
    .map((value) => Boolean(value?.trim()));
  if (configured.every((value) => !value)) return undefined;
  if (configured.some((value) => !value)) throw new ProviderRuntimeConfigError('Configurer MANIFEST_PROVIDER, MANIFEST_MODEL, MANIFEST_API_BASE_URL et MANIFEST_API_KEY ensemble.');

  const providerId = environment.MANIFEST_PROVIDER!.trim();
  if (!['openai', 'deepseek', 'custom'].includes(providerId)) throw new ProviderRuntimeConfigError('MANIFEST_PROVIDER doit être openai, deepseek ou custom pour le protocole compatible actuellement disponible.');
  const modelId = environment.MANIFEST_MODEL!.trim();
  if (modelId.length > 160) throw new ProviderRuntimeConfigError('MANIFEST_MODEL dépasse 160 caractères.');
  const baseUrl = environment.MANIFEST_API_BASE_URL!.trim();
  const apiKey = environment.MANIFEST_API_KEY!.trim();
  if (!apiKey || /\s/.test(apiKey)) throw new ProviderRuntimeConfigError('MANIFEST_API_KEY est vide ou contient des espaces.');

  const labels: Record<string, string> = { openai: 'OpenAI', deepseek: 'DeepSeek', custom: 'Fournisseur compatible' };
  const id = providerId as 'openai' | 'deepseek' | 'custom';
  const descriptor: ModelProviderDescriptor = {
    id,
    label: labels[providerId]!,
    protocol: 'openai-compatible',
    status: 'configured',
    models: [{ id: modelId, label: modelId, providerId: id, capabilities: ['structured-output'] }],
    supportsBYOK: false,
    secretConfigured: true,
  };
  const registry = { schemaVersion: 1 as const, providers: [descriptor] };
  validateModelProviderRegistry(registry);
  const adapter = createOpenAICompatibleModelAdapter({
    descriptor,
    baseUrl,
    getApiKey: () => apiKey,
    ...(fetchImpl ? { fetchImpl } : {}),
  });
  return new SuggestionJobManager(projects, new ModelSuggestionOrchestrator({ registry, adapters: [adapter] }));
}
