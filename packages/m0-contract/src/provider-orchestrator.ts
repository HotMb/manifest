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

type ActiveRequest = { generation: number; controller: AbortController };

/** Coordinates one active suggestion and protects the editor from late results. */
export class ModelSuggestionOrchestrator {
  private readonly adapters = new Map<string, ModelProviderAdapter>();
  private active: ActiveRequest | undefined;
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

  /** Cancel the current request without changing the Snapshot. */
  cancel(): void {
    this.generation += 1;
    this.active?.controller.abort();
    this.active = undefined;
  }

  async suggest(request: ManifestModelRequest): Promise<ModelSuggestionOutcome> {
    this.cancel();
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

    const generation = ++this.generation;
    const controller = new AbortController();
    this.active = { generation, controller };
    const onCallerAbort = () => controller.abort();
    request.signal?.addEventListener('abort', onCallerAbort, { once: true });
    try {
      const result = await adapter.suggest({ ...request, signal: controller.signal });
      const current = this.active?.generation === generation && this.generation === generation;
      return current && isModelResultCurrent(request, result) ? { status: 'ready', result } : { status: 'stale', result };
    } finally {
      request.signal?.removeEventListener('abort', onCallerAbort);
      if (this.active?.generation === generation) this.active = undefined;
    }
  }
}
