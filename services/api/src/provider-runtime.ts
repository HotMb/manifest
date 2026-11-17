import {
  ModelSuggestionOrchestrator,
  createChatGPTResponsesAdapter,
  createOpenAICompatibleModelAdapter,
  validateModelProviderRegistry,
  type ModelProviderAdapter,
  type ModelProviderDescriptor,
  type ModelProviderRegistry,
  type ProviderFetch,
} from '@design-workbench/m0-contract';
import type { MemoryProjectStore } from './domain.ts';
import { SuggestionJobManager } from './suggestion-jobs.ts';
import type { ChatGPTAuthManager } from './chatgpt-auth/manager.ts';

export type ProviderRuntimeEnvironment = {
  MANIFEST_PROVIDER?: string;
  MANIFEST_MODEL?: string;
  MANIFEST_API_BASE_URL?: string;
  MANIFEST_API_KEY?: string;
};

export class ProviderRuntimeConfigError extends Error {
  constructor(message: string) { super(message); this.name = 'ProviderRuntimeConfigError'; }
}

type ApiKeyProviderConfig = { providerId: 'openai' | 'deepseek' | 'custom'; modelId: string; baseUrl: string; apiKey: string };

function readApiKeyConfig(environment: ProviderRuntimeEnvironment): ApiKeyProviderConfig | undefined {
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
  return { providerId: providerId as ApiKeyProviderConfig['providerId'], modelId, baseUrl, apiKey };
}

function apiKeyDescriptor(config: ApiKeyProviderConfig, explicitOpenAIAlternative = false): ModelProviderDescriptor {
  const providerId = explicitOpenAIAlternative ? 'custom' : config.providerId;
  const labels: Record<string, string> = {
    openai: 'OpenAI API · facturation distincte',
    deepseek: 'DeepSeek',
    custom: 'Fournisseur compatible',
  };
  return {
    id: providerId,
    label: explicitOpenAIAlternative ? labels.openai! : labels[config.providerId]!,
    protocol: 'openai-compatible',
    status: 'configured',
    models: [{ id: config.modelId, label: config.modelId, providerId, capabilities: ['structured-output'] }],
    supportsBYOK: false,
    secretConfigured: true,
  };
}

function disconnectedChatGPTDescriptor(): ModelProviderDescriptor {
  return { id: 'openai', label: 'ChatGPT', protocol: 'openai-responses', status: 'disconnected', models: [], supportsBYOK: false, secretConfigured: false };
}

function genericAdapterErrorCode(code: string | undefined): ModelProviderDescriptor['errorCode'] {
  if (code === 'authorization_expired' || code === 'invalid_token') return 'UNAUTHORIZED';
  if (code === 'insufficient_scope') return 'MISSING_CREDENTIAL';
  if (code === 'network_error') return 'UNAVAILABLE';
  return code ? 'UNKNOWN' : undefined;
}

export type RuntimeSuggestionJobs = SuggestionJobManager & { refreshProviderRegistry: () => Promise<void> };

class RuntimeJobs extends SuggestionJobManager implements RuntimeSuggestionJobs {
  constructor(store: MemoryProjectStore, orchestrator: ModelSuggestionOrchestrator, private readonly refresh: () => Promise<void>) {
    super(store, orchestrator);
  }
  refreshProviderRegistry(): Promise<void> { return this.refresh(); }
}

/**
 * Keeps delegated ChatGPT usage and API-key usage as distinct registry choices.
 * API calls are never selected as a fallback after ChatGPT authorization ends.
 * The registry never contains OAuth credentials or API keys.
 */
export function createSuggestionRuntime(
  projects: MemoryProjectStore,
  environment: ProviderRuntimeEnvironment = process.env,
  fetchImpl?: ProviderFetch,
  chatgptAuth?: ChatGPTAuthManager,
): RuntimeSuggestionJobs | undefined {
  const authStatus = chatgptAuth?.getStatus();
  const oauthSelected = authStatus?.usageMode === 'chatgpt-plan';
  let apiKeyConfig: ApiKeyProviderConfig | undefined;
  try { apiKeyConfig = readApiKeyConfig(environment); }
  catch (error) { if (!chatgptAuth) throw error; }
  if (!chatgptAuth && !apiKeyConfig) return undefined;

  const activeOpenAI = chatgptAuth
    ? disconnectedChatGPTDescriptor()
    : apiKeyConfig?.providerId === 'openai'
      ? apiKeyDescriptor(apiKeyConfig)
      : disconnectedChatGPTDescriptor();
  if (chatgptAuth && oauthSelected) {
    activeOpenAI.status = 'configured';
    activeOpenAI.secretConfigured = true;
  }

  // When the host supports delegated sign-in, a separately configured OpenAI
  // API key remains available under its own explicit, billable choice. `custom`
  // is the existing contract ID used for compatible endpoints, avoiding two
  // descriptors with the same `openai` identity.
  const explicitOpenAIAlternative = chatgptAuth && apiKeyConfig?.providerId === 'openai'
    ? apiKeyDescriptor(apiKeyConfig, true)
    : undefined;
  const otherApiKeyProvider = apiKeyConfig && apiKeyConfig.providerId !== 'openai'
    ? apiKeyDescriptor(apiKeyConfig)
    : undefined;
  const registry: ModelProviderRegistry = {
    schemaVersion: 1,
    providers: [activeOpenAI, ...(explicitOpenAIAlternative ? [explicitOpenAIAlternative] : []), ...(otherApiKeyProvider && otherApiKeyProvider.id !== activeOpenAI.id ? [otherApiKeyProvider] : [])],
  };

  const adapters: ModelProviderAdapter[] = [];
  if (chatgptAuth) {
    adapters.push(createChatGPTResponsesAdapter({ descriptor: activeOpenAI, getAccessToken: () => chatgptAuth.getAccessToken() }));
    if (explicitOpenAIAlternative && apiKeyConfig) {
      adapters.push(createOpenAICompatibleModelAdapter({ descriptor: explicitOpenAIAlternative, baseUrl: apiKeyConfig.baseUrl, getApiKey: () => apiKeyConfig!.apiKey, ...(fetchImpl ? { fetchImpl } : {}) }));
    }
  } else if (apiKeyConfig?.providerId === 'openai') {
    adapters.push(createOpenAICompatibleModelAdapter({ descriptor: activeOpenAI, baseUrl: apiKeyConfig.baseUrl, getApiKey: () => apiKeyConfig.apiKey, ...(fetchImpl ? { fetchImpl } : {}) }));
  }
  if (otherApiKeyProvider && apiKeyConfig) {
    adapters.push(createOpenAICompatibleModelAdapter({ descriptor: otherApiKeyProvider, baseUrl: apiKeyConfig.baseUrl, getApiKey: () => apiKeyConfig.apiKey, ...(fetchImpl ? { fetchImpl } : {}) }));
  }

  const syncProvider = async () => {
    if (!chatgptAuth) return;
    const status = await chatgptAuth.getStatusAndRefresh();
    if (status.usageMode === 'chatgpt-plan') {
      activeOpenAI.protocol = 'openai-responses';
      activeOpenAI.label = 'ChatGPT';
      activeOpenAI.status = 'configured';
      activeOpenAI.secretConfigured = true;
      activeOpenAI.supportsBYOK = false;
      activeOpenAI.errorCode = undefined;
      // The app-visible list is sourced from the currently consented connection.
      try {
        const models = await chatgptAuth.getVisibleModels();
        activeOpenAI.models = models.map((model) => ({ id: model.id, label: model.label, providerId: 'openai' as const, capabilities: ['structured-output', 'streaming'] }));
        activeOpenAI.status = 'configured';
      } catch (error) {
        activeOpenAI.models = [];
        activeOpenAI.status = 'error';
        activeOpenAI.errorCode = genericAdapterErrorCode(error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : undefined);
      }
    } else {
      activeOpenAI.protocol = 'openai-responses';
      activeOpenAI.label = 'ChatGPT';
      activeOpenAI.status = status.status === 'error' || (status.status === 'connected' && status.errorCode)
        ? 'error'
        : 'disconnected';
      activeOpenAI.models = [];
      activeOpenAI.secretConfigured = false;
      activeOpenAI.errorCode = status.errorCode ? genericAdapterErrorCode(status.errorCode) : undefined;
    }
    validateModelProviderRegistry(registry);
  };

  validateModelProviderRegistry(registry);
  const orchestrator = new ModelSuggestionOrchestrator({ registry, adapters });
  const jobs = new RuntimeJobs(projects, orchestrator, syncProvider);
  return jobs;
}
