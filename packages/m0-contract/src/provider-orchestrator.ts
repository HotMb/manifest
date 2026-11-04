import { isModelResultCurrent } from './provider-simulator.ts';
import type {
  ManifestModelRequest,
  ManifestModelResult,
  ModelProviderAdapter,
  ModelProviderRegistry,
} from './providers.ts';

export type ModelSuggestionOutcome =
  | { status: 'ready'; result: ManifestModelResult }
  | { status: 'stale'; result: ManifestModelResult };

export type ModelOrchestratorErrorCode =
  | 'PROVIDER_NOT_REGISTERED'
  | 'PROVIDER_UNAVAILABLE'
  | 'MODEL_NOT_REGISTERED'
  | 'ADAPTER_MISMATCH';

export class ModelOrchestratorError extends Error {
  constructor(public readonly code: ModelOrchestratorErrorCode, message: string) {
    super(message);
    this.name = 'ModelOrchestratorError';
  }
}

export type ModelSuggestionOrchestratorOptions = {
  registry: ModelProviderRegistry;
  adapters: readonly ModelProviderAdapter[];
};

type ActiveRequest = { generation: number; controller: AbortController; cleanup: () => void };

/** Coordinates one active suggestion and protects the editor from late results. */
export class ModelSuggestionOrchestrator {
  private readonly adapters = new Map<string, ModelProviderAdapter>();
  private readonly active = new Map<string, ActiveRequest>();
  private generation = 0;

  constructor(private readonly options: ModelSuggestionOrchestratorOptions) {
    for (const adapter of options.adapters) {
      const descriptor = adapter.descriptor;
      const provider = options.registry.providers.find((entry) => entry.id === descriptor.id);
      if (!provider || provider.protocol !== descriptor.protocol) {
        throw new ModelOrchestratorError('ADAPTER_MISMATCH', `L’adaptateur ${descriptor.id} n’est pas aligné sur le registre.`);
      }
      const key = `${descriptor.id}:`;
      if (this.adapters.has(key)) throw new ModelOrchestratorError('ADAPTER_MISMATCH', `Un adaptateur existe déjà pour ${descriptor.id}.`);
      this.adapters.set(key, adapter);
    }
  }

  /** Exposes only the public provider catalogue and connection flags, never adapter secrets. */
  getRegistry(): ModelProviderRegistry {
    return structuredClone(this.options.registry);
  }

  /** Cancel one editor request, or all requests during host shutdown. */
  cancel(requestId?: string): void {
    const requests = requestId === undefined
      ? [...this.active.values()]
      : [this.active.get(requestId)].filter((request): request is ActiveRequest => Boolean(request));
    for (const active of requests) {
      active.cleanup();
      active.controller.abort();
    }
  }

  async suggest(request: ManifestModelRequest): Promise<ModelSuggestionOutcome> {
    this.cancel(request.requestId);
    const provider = this.options.registry.providers.find((entry) => entry.id === request.providerId);
    if (!provider) throw new ModelOrchestratorError('PROVIDER_NOT_REGISTERED', 'Ce fournisseur n’est pas présent dans le registre actif.');
    if (provider.status === 'disconnected' || provider.status === 'error') {
      throw new ModelOrchestratorError('PROVIDER_UNAVAILABLE', 'Ce fournisseur n’est pas disponible dans cette session.');
    }
    const descriptor = provider.models.find((model) => model.id === request.modelId);
    if (!descriptor) throw new ModelOrchestratorError('MODEL_NOT_REGISTERED', 'Ce modèle n’est pas qualifié dans le registre actif.');
    const adapter = this.adapters.get(`${request.providerId}:`);
    if (!adapter || adapter.descriptor.models.every((model) => model.id !== request.modelId)) {
      throw new ModelOrchestratorError('MODEL_NOT_REGISTERED', 'Aucun adaptateur actif ne sait exécuter ce modèle.');
    }
    if (request.signal?.aborted) throw new DOMException('La demande a été annulée.', 'AbortError');

    const generation = ++this.generation;
    const controller = new AbortController();
    let cleaned = false;
    const onCallerAbort = () => {
      if (cleaned) return;
      const active = this.active.get(request.requestId);
      active?.cleanup();
      controller.abort();
    };
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      request.signal?.removeEventListener('abort', onCallerAbort);
      if (this.active.get(request.requestId)?.generation === generation) this.active.delete(request.requestId);
    };
    this.active.set(request.requestId, { generation, controller, cleanup });
    request.signal?.addEventListener('abort', onCallerAbort, { once: true });
    try {
      const result = await adapter.suggest({ ...request, signal: controller.signal });
      const current = this.active.get(request.requestId)?.generation === generation;
      return current && isModelResultCurrent(request, result) ? { status: 'ready', result } : { status: 'stale', result };
    } finally {
      cleanup();
    }
  }
}
