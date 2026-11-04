import { PROJECT_ID, validateCommand } from './index.ts';
import type { M0Operation, M0Project } from './index.ts';
import { validateModelProviderRegistry } from './providers.ts';
import type { ModelProviderId, ModelProviderRegistry } from './providers.ts';

export type SuggestionMode = 'auto' | 'direct' | 'alternatives';
export type StartSuggestionInput = {
  idempotencyKey: string;
  expectedDraftVersion: number;
  editorSessionId: string;
  intentEpoch: number;
  intent: string;
  provider: ModelProviderId;
  model: string;
  mode: SuggestionMode;
  selectedPageId: string;
  selectedBlockId: string | null;
};
export type SuggestionJobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'outcome_unknown';
export type SuggestionJobErrorPayload = {
  code: 'NOT_FOUND' | 'INVALID_INPUT' | 'VERSION_CONFLICT' | 'IDEMPOTENCY_CONFLICT' | 'CAPABILITY_UNSUPPORTED' | 'BUDGET_EXCEEDED' | 'RATE_LIMITED' | 'PROVIDER_REFUSAL' | 'PROVIDER_UNAVAILABLE' | 'CURSOR_EXPIRED' | 'INTERNAL_ERROR';
  message: string;
  requestId: string;
  retryable: boolean;
  details: Record<string, unknown>;
};
export type SuggestionJob = {
  jobId: string;
  projectId: string;
  type: 'suggestion';
  state: SuggestionJobState;
  lastSeq: number;
  proposalIds: string[];
  artifactId: string | null;
  error: SuggestionJobErrorPayload | null;
};
export type SuggestionProposal = {
  id: string;
  jobId: string;
  generationId: string;
  editorSessionId: string;
  intentEpoch: number;
  baseDraftVersion: number;
  mode: 'direct' | 'alternatives';
  operations: M0Operation[];
  explanation: string;
  status: 'ready' | 'kept' | 'rejected' | 'stale';
};
export type SuggestionJobEventType = 'queued' | 'started' | 'progress' | 'proposal_ready' | 'proposal_stale' | 'usage' | 'succeeded' | 'failed' | 'cancelled' | 'outcome_unknown' | 'proposal_kept' | 'proposal_rejected';
export type SuggestionJobEvent = { jobId: string; seq: number; type: SuggestionJobEventType; timestamp: string; data: Record<string, unknown> };
export type SuggestionEventPage = { events: SuggestionJobEvent[]; nextSeq: number; state: SuggestionJobState };
export type ProposalDecisionResult = { proposal: SuggestionProposal; project: M0Project };

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const only = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every((key) => keys.includes(key));
const safeId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const states: SuggestionJobState[] = ['queued', 'running', 'succeeded', 'failed', 'cancelled', 'outcome_unknown'];
const eventTypes: SuggestionJobEventType[] = ['queued', 'started', 'progress', 'proposal_ready', 'proposal_stale', 'usage', 'succeeded', 'failed', 'cancelled', 'outcome_unknown', 'proposal_kept', 'proposal_rejected'];

export function validateStartSuggestionInput(value: unknown): asserts value is StartSuggestionInput {
  if (!record(value) || !only(value, ['idempotencyKey', 'expectedDraftVersion', 'editorSessionId', 'intentEpoch', 'intent', 'provider', 'model', 'mode', 'selectedPageId', 'selectedBlockId'])) throw new Error('Contrat de demande de suggestion invalide.');
  if (!safeId(value.idempotencyKey) || !safeId(value.editorSessionId) || !safeId(value.selectedPageId) || (value.selectedBlockId !== null && !safeId(value.selectedBlockId))) throw new Error('Cible de suggestion invalide.');
  if (!Number.isSafeInteger(value.expectedDraftVersion) || Number(value.expectedDraftVersion) < 0 || !Number.isSafeInteger(value.intentEpoch) || Number(value.intentEpoch) < 0) throw new Error('Version de suggestion invalide.');
  if (typeof value.intent !== 'string' || value.intent.trim().length < 1 || value.intent.length > 12_000 || typeof value.model !== 'string' || value.model.length < 1 || value.model.length > 200) throw new Error('Texte ou modèle de suggestion invalide.');
  if (!['openai', 'anthropic', 'google', 'deepseek', 'custom'].includes(String(value.provider)) || !['auto', 'direct', 'alternatives'].includes(String(value.mode))) throw new Error('Fournisseur ou mode de suggestion invalide.');
}

export function validateSuggestionJob(value: unknown): asserts value is SuggestionJob {
  if (!record(value) || !only(value, ['jobId', 'projectId', 'type', 'state', 'lastSeq', 'proposalIds', 'artifactId', 'error'])) throw new Error('Réponse de job invalide.');
  if (!safeId(value.jobId) || !safeId(value.projectId) || value.type !== 'suggestion' || !states.includes(value.state as SuggestionJobState) || !Number.isSafeInteger(value.lastSeq) || Number(value.lastSeq) < 0) throw new Error('Identité ou état du job invalide.');
  if (!Array.isArray(value.proposalIds) || value.proposalIds.length > 3 || value.proposalIds.some((id) => !safeId(id)) || (value.artifactId !== null && !safeId(value.artifactId))) throw new Error('Résultat du job invalide.');
  if (value.state === 'succeeded' && value.proposalIds.length === 0) throw new Error('Un job réussi doit référencer au moins une proposition.');
  if (value.error !== null && (!record(value.error) || !only(value.error, ['code', 'message', 'requestId', 'retryable', 'details']) || typeof value.error.code !== 'string' || typeof value.error.message !== 'string' || !safeId(value.error.requestId) || typeof value.error.retryable !== 'boolean' || !record(value.error.details))) throw new Error('Erreur du job invalide.');
}

export function validateSuggestionProposal(value: unknown): asserts value is SuggestionProposal {
  if (!record(value) || !only(value, ['id', 'jobId', 'generationId', 'editorSessionId', 'intentEpoch', 'baseDraftVersion', 'mode', 'operations', 'explanation', 'status'])) throw new Error('Proposition invalide.');
  if (!safeId(value.id) || !safeId(value.jobId) || !safeId(value.generationId) || !safeId(value.editorSessionId) || !Number.isSafeInteger(value.intentEpoch) || Number(value.intentEpoch) < 0 || !Number.isSafeInteger(value.baseDraftVersion) || Number(value.baseDraftVersion) < 0 || !['direct', 'alternatives'].includes(String(value.mode)) || !['ready', 'kept', 'rejected', 'stale'].includes(String(value.status))) throw new Error('Métadonnées de proposition invalides.');
  if (!Array.isArray(value.operations) || value.operations.length < 1 || value.operations.length > 100 || typeof value.explanation !== 'string' || value.explanation.length < 1 || value.explanation.length > 1000) throw new Error('Contenu de proposition invalide.');
  validateCommand({ projectId: PROJECT_ID, expectedDraftVersion: 0, idempotencyKey: 'proposal-validation', action: 'apply_ops', payload: { operations: value.operations } });
}

export function validateSuggestionEventPage(value: unknown): asserts value is SuggestionEventPage {
  if (!record(value) || !only(value, ['events', 'nextSeq', 'state']) || !Array.isArray(value.events) || value.events.length > 100 || !Number.isSafeInteger(value.nextSeq) || Number(value.nextSeq) < 0 || !states.includes(value.state as SuggestionJobState)) throw new Error('Page d’événements invalide.');
  for (const event of value.events) {
    if (!record(event) || !only(event, ['jobId', 'seq', 'type', 'timestamp', 'data']) || !safeId(event.jobId) || !Number.isSafeInteger(event.seq) || Number(event.seq) < 1 || !eventTypes.includes(event.type as SuggestionJobEventType) || typeof event.timestamp !== 'string' || !record(event.data)) throw new Error('Événement de job invalide.');
  }
}

export function validateProviderRegistryForSuggestions(value: unknown): asserts value is ModelProviderRegistry {
  validateModelProviderRegistry(value);
}

export function validateProposalDecisionResult(value: unknown): asserts value is ProposalDecisionResult {
  if (!record(value) || !only(value, ['proposal', 'project']) || !record(value.project)) throw new Error('Décision de proposition invalide.');
  validateSuggestionProposal(value.proposal);
  if (value.project.projectId !== PROJECT_ID || !Number.isSafeInteger(value.project.draftVersion) || typeof value.project.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.project.contentHash)) throw new Error('Brouillon de décision invalide.');
}
