import { randomUUID } from 'node:crypto';
import {
  ModelOrchestratorError,
  ModelSuggestionOrchestrator,
  ProviderHttpAdapterError,
  stableStringify,
  type ManifestModelRequest,
  type M0Operation,
  type ModelProviderId,
} from '@design-workbench/m0-contract';
import type { MemoryProjectStore } from './domain.ts';

export type SuggestionMode = 'auto' | 'direct' | 'alternatives';
export type SuggestionRequest = {
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
export type SuggestionJobErrorPayload = { code: 'NOT_FOUND' | 'INVALID_INPUT' | 'VERSION_CONFLICT' | 'IDEMPOTENCY_CONFLICT' | 'CAPABILITY_UNSUPPORTED' | 'BUDGET_EXCEEDED' | 'RATE_LIMITED' | 'PROVIDER_REFUSAL' | 'PROVIDER_UNAVAILABLE' | 'CURSOR_EXPIRED' | 'INTERNAL_ERROR'; message: string; requestId: string; retryable: boolean; details: Record<string, unknown> };
export type SuggestionJob = { jobId: string; projectId: string; type: 'suggestion'; state: SuggestionJobState; lastSeq: number; proposalIds: string[]; artifactId: null; error: SuggestionJobErrorPayload | null };
export type SuggestionProposal = { id: string; jobId: string; generationId: string; editorSessionId: string; intentEpoch: number; baseDraftVersion: number; mode: 'direct' | 'alternatives'; operations: M0Operation[]; explanation: string; status: 'ready' | 'kept' | 'rejected' | 'stale' };
export type SuggestionJobEventType = 'queued' | 'started' | 'progress' | 'proposal_ready' | 'usage' | 'succeeded' | 'failed' | 'cancelled' | 'outcome_unknown';
export type SuggestionJobEvent = { jobId: string; seq: number; type: SuggestionJobEventType; timestamp: string; data: Record<string, unknown> };
export type SuggestionEventPage = { events: SuggestionJobEvent[]; nextSeq: number; state: SuggestionJobState };
export type SuggestionProjectReader = Pick<MemoryProjectStore, 'read'>;

export class SuggestionJobException extends Error {
  constructor(public readonly code: SuggestionJobErrorPayload['code'], message: string, public readonly retryable = false) { super(message); this.name = 'SuggestionJobException'; }
}

type JobRecord = {
  summary: SuggestionJob;
  requestHash: string;
  request: SuggestionRequest;
  controller: AbortController;
  events: SuggestionJobEvent[];
  proposal?: SuggestionProposal;
  runner?: Promise<void>;
};

const MAX_JOBS = 1_000;
const MAX_EVENTS = 300;
const safeId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const clone = <T>(value: T): T => structuredClone(value);
const terminal = (state: SuggestionJobState) => ['succeeded', 'failed', 'cancelled', 'outcome_unknown'].includes(state);

function toJobError(code: SuggestionJobErrorPayload['code'], message: string, retryable = false): SuggestionJobErrorPayload {
  return { code, message, requestId: `request-${randomUUID()}`, retryable, details: {} };
}

function safeProviderError(error: unknown): SuggestionJobErrorPayload {
  if (error instanceof ProviderHttpAdapterError) {
    if (error.code === 'RATE_LIMITED') return toJobError('BUDGET_EXCEEDED', 'Le fournisseur limite les requêtes. Réessaie plus tard.', true);
    if (error.code === 'INVALID_OUTPUT') return toJobError('PROVIDER_REFUSAL', 'Le modèle n’a pas retourné une proposition M0 valide.');
    return toJobError('PROVIDER_UNAVAILABLE', 'Le fournisseur ne peut pas traiter cette suggestion.', error.code === 'UNAVAILABLE' || error.code === 'TIMEOUT');
  }
  if (error instanceof ModelOrchestratorError) return toJobError('PROVIDER_UNAVAILABLE', 'Le fournisseur ou le modèle n’est pas disponible dans cette session.');
  return toJobError('INTERNAL_ERROR', 'La suggestion n’a pas pu être terminée.');
}

/** In-memory M0 job adapter following the durable job/event contract without claiming persistence. */
export class SuggestionJobManager {
  private readonly jobs = new Map<string, JobRecord>();
  private readonly idempotency = new Map<string, string>();

  constructor(private readonly projects: SuggestionProjectReader, private readonly orchestrator: ModelSuggestionOrchestrator) {}

  start(projectId: string, input: SuggestionRequest): SuggestionJob {
    if (!safeId.test(projectId) || !safeId.test(input.idempotencyKey) || !safeId.test(input.editorSessionId) || !safeId.test(input.selectedPageId) || (input.selectedBlockId !== null && !safeId.test(input.selectedBlockId)) || !Number.isSafeInteger(input.expectedDraftVersion) || input.expectedDraftVersion < 0 || !Number.isSafeInteger(input.intentEpoch) || input.intentEpoch < 0 || typeof input.intent !== 'string' || input.intent.trim().length < 1 || input.intent.length > 12_000 || typeof input.model !== 'string' || input.model.length < 1 || input.model.length > 200) {
      throw new SuggestionJobException('INVALID_INPUT', 'La demande de suggestion ne respecte pas le contrat.');
    }
    if (input.mode === 'alternatives') throw new SuggestionJobException('CAPABILITY_UNSUPPORTED', 'Le mode alternatives sera disponible dans une étape ultérieure.');
    const idemKey = JSON.stringify([projectId, input.idempotencyKey]);
    const requestHash = stableStringify({ projectId, input });
    // M0 has one authenticated principal. A multi-user caller must authorize project access before calling this method.
    const existingId = this.idempotency.get(idemKey);
    if (existingId) {
      const existing = this.jobs.get(existingId)!;
      if (existing.requestHash !== requestHash) throw new SuggestionJobException('IDEMPOTENCY_CONFLICT', 'Cette clé a déjà démarré une autre suggestion.');
      return clone(existing.summary);
    }
    const project = this.projects.read(projectId);
    if (project.draftVersion !== input.expectedDraftVersion) throw new SuggestionJobException('VERSION_CONFLICT', 'Le brouillon a changé. Recharge-le avant de demander une suggestion.');
    const page = project.snapshot.pages.find((candidate) => candidate.id === input.selectedPageId);
    if (!page || (input.selectedBlockId !== null && !page.composition.content.some((block) => block.props.id === input.selectedBlockId))) throw new SuggestionJobException('INVALID_INPUT', 'La sélection ne correspond pas au brouillon courant.');
    if (this.jobs.size >= MAX_JOBS) throw new SuggestionJobException('RATE_LIMITED', 'La limite de jobs du prototype est atteinte.');

    const jobId = `job-${randomUUID()}`;
    const record: JobRecord = {
      summary: { jobId, projectId, type: 'suggestion', state: 'queued', lastSeq: 0, proposalIds: [], artifactId: null, error: null },
      requestHash,
      request: clone(input),
      controller: new AbortController(),
      events: [],
    };
    this.jobs.set(jobId, record);
    this.idempotency.set(idemKey, jobId);
    this.append(record, 'queued', { expectedDraftVersion: input.expectedDraftVersion, intentEpoch: input.intentEpoch });
    record.runner = Promise.resolve().then(() => this.run(record));
    return clone(record.summary);
  }

  get(jobId: string): SuggestionJob {
    const record = this.requireJob(jobId);
    return clone(record.summary);
  }

  getUpdates(jobId: string, afterSeq = 0, limit = 50): SuggestionEventPage {
    const record = this.requireJob(jobId);
    if (!Number.isSafeInteger(afterSeq) || afterSeq < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new SuggestionJobException('INVALID_INPUT', 'Curseur ou limite d’événements invalide.');
    const oldest = record.events[0]?.seq ?? record.summary.lastSeq + 1;
    if (afterSeq < oldest - 1) throw new SuggestionJobException('CURSOR_EXPIRED', 'Le curseur a expiré. Relis le job avant de reprendre le suivi.');
    const events = clone(record.events.filter((event) => event.seq > afterSeq).slice(0, limit));
    return { events, nextSeq: events.at(-1)?.seq ?? Math.min(afterSeq, record.summary.lastSeq), state: record.summary.state };
  }

  cancel(jobId: string): SuggestionJob {
    const record = this.requireJob(jobId);
    if (terminal(record.summary.state)) return clone(record.summary);
    record.controller.abort();
    record.summary.state = 'cancelled';
    record.summary.error = null;
    this.append(record, 'cancelled', { requested: true });
    return clone(record.summary);
  }

  readProposal(proposalId: string): SuggestionProposal {
    const record = [...this.jobs.values()].find((candidate) => candidate.proposal?.id === proposalId);
    if (!record?.proposal) throw new SuggestionJobException('NOT_FOUND', 'Proposition inaccessible.');
    return clone(record.proposal);
  }

  async waitForCompletion(jobId: string): Promise<SuggestionJob> {
    const record = this.requireJob(jobId);
    await record.runner;
    return clone(record.summary);
  }

  private requireJob(jobId: string): JobRecord {
    if (!safeId.test(jobId)) throw new SuggestionJobException('INVALID_INPUT', 'Identifiant de job invalide.');
    const record = this.jobs.get(jobId);
    if (!record) throw new SuggestionJobException('NOT_FOUND', 'Job inaccessible.');
    return record;
  }

  private append(record: JobRecord, type: SuggestionJobEventType, data: Record<string, unknown>): void {
    record.summary.lastSeq += 1;
    record.events.push({ jobId: record.summary.jobId, seq: record.summary.lastSeq, type, timestamp: new Date().toISOString(), data: clone(data) });
    if (record.events.length > MAX_EVENTS) record.events.shift();
  }

  private fail(record: JobRecord, error: SuggestionJobErrorPayload): void {
    if (terminal(record.summary.state)) return;
    record.summary.state = 'failed';
    record.summary.error = error;
    this.append(record, 'failed', { error });
  }

  private async run(record: JobRecord): Promise<void> {
    if (record.summary.state !== 'queued') return;
    record.summary.state = 'running';
    this.append(record, 'started', { intentEpoch: record.request.intentEpoch });
    try {
      const project = this.projects.read(record.summary.projectId);
      if (project.draftVersion !== record.request.expectedDraftVersion) throw new SuggestionJobException('VERSION_CONFLICT', 'Le brouillon a changé avant le départ du job.');
      const request: ManifestModelRequest = {
        requestId: record.summary.jobId,
        providerId: record.request.provider,
        modelId: record.request.model,
        description: record.request.intent,
        snapshot: project.snapshot,
        baseSignature: stableStringify(project.snapshot),
        signal: record.controller.signal,
      };
      const outcome = await this.orchestrator.suggest(request);
      if ((record.summary.state as SuggestionJobState) === 'cancelled') return;
      if (!outcome.result.operations.length) throw new SuggestionJobException('PROVIDER_REFUSAL', 'Le modèle n’a pas proposé de changement applicable.');
      const latest = this.projects.read(record.summary.projectId);
      const stale = outcome.status === 'stale' || latest.draftVersion !== record.request.expectedDraftVersion;
      const proposal: SuggestionProposal = {
        id: `proposal-${randomUUID()}`,
        jobId: record.summary.jobId,
        generationId: `generation-${randomUUID()}`,
        editorSessionId: record.request.editorSessionId,
        intentEpoch: record.request.intentEpoch,
        baseDraftVersion: record.request.expectedDraftVersion,
        mode: 'direct',
        operations: outcome.result.operations,
        explanation: outcome.result.rationale?.trim() || 'Proposition structurée générée pour la description fournie.',
        status: stale ? 'stale' : 'ready',
      };
      record.proposal = proposal;
      record.summary.proposalIds = [proposal.id];
      this.append(record, 'proposal_ready', proposal as unknown as Record<string, unknown>);
      if (outcome.result.usage) this.append(record, 'usage', outcome.result.usage as Record<string, unknown>);
      record.summary.state = 'succeeded';
      this.append(record, 'succeeded', { proposalId: proposal.id, stale });
    } catch (error) {
      if ((record.summary.state as SuggestionJobState) === 'cancelled' || (error instanceof DOMException && error.name === 'AbortError')) {
        if ((record.summary.state as SuggestionJobState) !== 'cancelled') {
          record.summary.state = 'cancelled';
          record.summary.error = null;
          this.append(record, 'cancelled', { requested: false });
        }
        return;
      }
      this.fail(record, error instanceof SuggestionJobException ? toJobError(error.code, error.message, error.retryable) : safeProviderError(error));
    }
  }
}
