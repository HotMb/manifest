import type { M0Operation, Snapshot } from './index.ts';

/** Stable identifiers understood by the Manifest provider registry. */
export type ModelProviderId = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'custom';
export type ProviderProtocol = 'openai-responses' | 'anthropic-messages' | 'google-generate-content' | 'openai-compatible';
export type ProviderConnectionStatus = 'disconnected' | 'configured' | 'disabled' | 'error';
export type ModelCapability = 'structured-output' | 'streaming' | 'vision' | 'tool-calling' | 'code-generation';

export type ModelPricing = {
  currency: 'USD' | 'EUR';
  inputPerMillionTokens?: number;
  outputPerMillionTokens?: number;
  /** Prices are informational until a provider usage receipt is available. */
  estimatedOnly: true;
};

export type ModelLimits = {
  requestsPerMinute?: number;
  inputTokensPerMinute?: number;
  contextWindowTokens?: number;
  maxOutputTokens?: number;
};

export type ModelDescriptor = {
  id: string;
  label: string;
  providerId: ModelProviderId;
  capabilities: ModelCapability[];
  limits?: ModelLimits;
  pricing?: ModelPricing;
};

export type ModelProviderDescriptor = {
  id: ModelProviderId;
  label: string;
  protocol: ProviderProtocol;
  status: ProviderConnectionStatus;
  models: ModelDescriptor[];
  supportsBYOK: boolean;
  /** Coarse host state only; never include secret material or credential-derived values. */
  secretConfigured: boolean;
  errorCode?: 'MISSING_CREDENTIAL' | 'UNAUTHORIZED' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'UNKNOWN';
};

export type ModelProviderRegistry = {
  schemaVersion: 1;
  providers: ModelProviderDescriptor[];
};

export type ManifestModelRequest = {
  requestId: string;
  providerId: ModelProviderId;
  modelId: string;
  description: string;
  snapshot: Snapshot;
  /** Prevents a late provider response from being applied to a newer description. */
  baseSignature: string;
  signal?: AbortSignal;
};

export type ManifestModelResult = {
  requestId: string;
  providerId: ModelProviderId;
  modelId: string;
  source: 'provider';
  baseSignature: string;
  operations: M0Operation[];
  rationale?: string;
  usage?: { inputTokens?: number; outputTokens?: number; estimatedCostUsd?: number };
};

export interface ModelProviderAdapter {
  readonly descriptor: ModelProviderDescriptor;
  suggest(request: ManifestModelRequest): Promise<ManifestModelResult>;
}

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const protocols: ProviderProtocol[] = ['openai-responses', 'anthropic-messages', 'google-generate-content', 'openai-compatible'];
const statuses: ProviderConnectionStatus[] = ['disconnected', 'configured', 'disabled', 'error'];
const capabilities: ModelCapability[] = ['structured-output', 'streaming', 'vision', 'tool-calling', 'code-generation'];
const providerIds: ModelProviderId[] = ['openai', 'anthropic', 'google', 'deepseek', 'custom'];
const fail = (message: string): never => { throw new Error(`Provider contract: ${message}`); };
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const only = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every((key) => keys.includes(key));
const finitePositive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function validateLimits(value: unknown): asserts value is ModelLimits {
  if (!record(value)) fail('limites invalides');
  const obj = value as Record<string, unknown>;
  if (!only(obj, ['requestsPerMinute', 'inputTokensPerMinute', 'contextWindowTokens', 'maxOutputTokens'])) fail('limites invalides');
  for (const key of Object.keys(obj)) if (!finitePositive(obj[key])) fail(`limite ${key} invalide`);
}

function validatePricing(value: unknown): asserts value is ModelPricing {
  if (!record(value)) fail('tarification invalide');
  const obj = value as Record<string, unknown>;
  if (!only(obj, ['currency', 'inputPerMillionTokens', 'outputPerMillionTokens', 'estimatedOnly']) || !['USD', 'EUR'].includes(String(obj.currency)) || obj.estimatedOnly !== true) fail('tarification invalide');
  for (const key of ['inputPerMillionTokens', 'outputPerMillionTokens']) if (key in obj && !finitePositive(obj[key])) fail(`prix ${key} invalide`);
}

export function validateModelDescriptor(value: unknown): asserts value is ModelDescriptor {
  if (!record(value)) fail('modèle invalide');
  const obj = value as Record<string, unknown>;
  if (!only(obj, ['id', 'label', 'providerId', 'capabilities', 'limits', 'pricing'])) fail('modèle invalide');
  if (typeof obj.id !== 'string' || !idPattern.test(obj.id) || typeof obj.label !== 'string' || obj.label.length < 1 || obj.label.length > 160) fail('identité de modèle invalide');
  if (!providerIds.includes(obj.providerId as ModelProviderId)) fail('fournisseur du modèle invalide');
  if (!Array.isArray(obj.capabilities) || obj.capabilities.some((item: unknown) => !capabilities.includes(item as ModelCapability)) || new Set(obj.capabilities).size !== obj.capabilities.length) fail('capacités de modèle invalides');
  if ('limits' in obj && obj.limits !== undefined) validateLimits(obj.limits);
  if ('pricing' in obj && obj.pricing !== undefined) validatePricing(obj.pricing);
}

export function validateModelProviderDescriptor(value: unknown): asserts value is ModelProviderDescriptor {
  if (!record(value)) fail('fournisseur invalide');
  const obj = value as Record<string, unknown>;
  if (!only(obj, ['id', 'label', 'protocol', 'status', 'models', 'supportsBYOK', 'secretConfigured', 'errorCode'])) fail('fournisseur invalide');
  if (!providerIds.includes(obj.id as ModelProviderId) || typeof obj.label !== 'string' || obj.label.length < 1 || obj.label.length > 120) fail('identité de fournisseur invalide');
  if (!protocols.includes(obj.protocol as ProviderProtocol) || !statuses.includes(obj.status as ProviderConnectionStatus)) fail('protocole ou statut invalide');
  if (!Array.isArray(obj.models) || obj.models.length > 100) fail('catalogue de modèles invalide');
  const models = obj.models as unknown[];
  for (const model of models) validateModelDescriptor(model);
  if (models.some((model: unknown) => (model as ModelDescriptor).providerId !== obj.id)) fail('un modèle appartient à un autre fournisseur');
  if (typeof obj.supportsBYOK !== 'boolean' || typeof obj.secretConfigured !== 'boolean') fail('configuration de secret invalide');
  if ('errorCode' in obj && obj.errorCode !== undefined && !['MISSING_CREDENTIAL', 'UNAUTHORIZED', 'RATE_LIMITED', 'UNAVAILABLE', 'UNKNOWN'].includes(String(obj.errorCode))) fail('code d’erreur fournisseur invalide');
  if (obj.status === 'configured' && !obj.secretConfigured && obj.id !== 'custom') fail('un fournisseur configuré doit déclarer son secret configuré');
}

export function validateModelProviderRegistry(value: unknown): asserts value is ModelProviderRegistry {
  if (!record(value)) fail('registre fournisseur invalide');
  const obj = value as Record<string, unknown>;
  if (!only(obj, ['schemaVersion', 'providers']) || obj.schemaVersion !== 1 || !Array.isArray(obj.providers) || obj.providers.length > providerIds.length) fail('registre fournisseur invalide');
  const providers = obj.providers as unknown[];
  for (const provider of providers) validateModelProviderDescriptor(provider);
  if (new Set(providers.map((provider: unknown) => (provider as ModelProviderDescriptor).id)).size !== providers.length) fail('fournisseur dupliqué');
}

/** A safe empty registry used until credentials are configured by the host. */
export function disconnectedProviderRegistry(): ModelProviderRegistry {
  return { schemaVersion: 1, providers: [] };
}

