import { App } from '@modelcontextprotocol/ext-apps';
import {
  PROJECT_ID, M0Error, initialProject, applyOperations, hashSnapshot, stableStringify, validateSnapshot, validateCommand,
  validateModelProviderRegistry, validateProposalDecisionResult, validateStartSuggestionInput,
  validateSuggestionEventPage, validateSuggestionJob, validateSuggestionProposal,
  validateEditorLaunchContext, type EditorLaunchContext,
  type ModelProviderRegistry, type ProposalDecisionResult, type StartSuggestionInput, type SuggestionEventPage,
  type SuggestionJob, type SuggestionProposal,
  type M0Project, type ApplyOpsCommand,
} from '@design-workbench/m0-contract';

export type EditorTransport = {
  readonly kind: 'browser-local' | 'browser-memory' | 'mcp';
  read(): Promise<M0Project>;
  /** Replays the last explicit launch and receives later host notifications. Unsubscribe on close. */
  subscribeLaunchContext?(listener: (context: EditorLaunchContext) => void): () => void;
  commit(command: ApplyOpsCommand): Promise<M0Project>;
  readProviderRegistry?(): Promise<ModelProviderRegistry>;
  startSuggestion?(input: StartSuggestionInput): Promise<SuggestionJob>;
  getSuggestionJob?(jobId: string): Promise<SuggestionJob>;
  getSuggestionUpdates?(jobId: string, afterSeq: number, limit?: number): Promise<SuggestionEventPage>;
  cancelSuggestion?(jobId: string): Promise<SuggestionJob>;
  readSuggestionProposal?(proposalId: string): Promise<SuggestionProposal>;
  keepSuggestionProposal?(proposalId: string): Promise<ProposalDecisionResult>;
  rejectSuggestionProposal?(proposalId: string): Promise<SuggestionProposal>;
  markSuggestionProposalStale?(proposalId: string): Promise<SuggestionProposal>;
  recoverExpired?(): Promise<M0Project>;
  close(): Promise<void>;
};

export class TransportError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'TransportError'; }
}

export function launchContextFromToolResult(value: unknown): EditorLaunchContext | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const result = value as { isError?: boolean; _meta?: Record<string, unknown> };
  if (result.isError || result._meta?.launchContext === undefined) return undefined;
  validateEditorLaunchContext(result._meta.launchContext);
  return structuredClone(result._meta.launchContext);
}

export function readProjectValue(value: unknown): M0Project {
  if (!value || typeof value !== 'object') throw new TransportError('INVALID_RESPONSE', 'Le document reçu est incomplet.');
  const project = value as Partial<M0Project>;
  if (project.projectId !== PROJECT_ID || !Number.isSafeInteger(project.draftVersion) || Number(project.draftVersion) < 0 || typeof project.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(project.contentHash)) {
    throw new TransportError('INVALID_RESPONSE', 'Le document reçu ne correspond pas à ce projet.');
  }
  validateSnapshot(project.snapshot);
  return structuredClone(project as M0Project);
}

export function projectFromToolResult(value: unknown): M0Project {
  if (!value || typeof value !== 'object') throw new TransportError('INVALID_RESPONSE', 'Aucun résultat reçu de l’hôte.');
  const result = value as { isError?: boolean; _meta?: Record<string, unknown>; structuredContent?: Record<string, unknown> };
  if (result.isError) {
    const error = result._meta?.error ?? result.structuredContent?.error;
    if (error && typeof error === 'object') {
      const details = error as { code?: unknown; message?: unknown };
      throw new TransportError(typeof details.code === 'string' ? details.code : 'HOST_ERROR', typeof details.message === 'string' ? details.message : 'L’hôte n’a pas pu enregistrer ce document.');
    }
    throw new TransportError('HOST_ERROR', 'L’hôte n’a pas pu effectuer cette action. Réessaye après vérification de la connexion.');
  }
  return readProjectValue(result._meta?.project);
}

/** Shape validation alone cannot establish that a version actually names this content. */
export async function verifiedProject(value: unknown): Promise<M0Project> {
  const project = readProjectValue(value);
  if (await hashSnapshot(project.snapshot) !== project.contentHash) {
    throw new TransportError('CONTENT_HASH_MISMATCH', 'L’empreinte du brouillon ne correspond pas à son contenu. Aucun document n’a été remplacé.');
  }
  return project;
}

const STORAGE_KEY = 'design-workbench:m0:project-m0:v1';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export type BrowserTransportOptions = {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  runExclusive?: <T>(task: () => Promise<T>) => Promise<T>;
  now?: () => number;
};

/** Browser-only diagnostic. Persistent writes require a cross-tab Web Lock. */
export function createBrowserTransport(options: BrowserTransportOptions = {}): EditorTransport {
  let storage = options.storage;
  let runExclusive = options.runExclusive;
  if (storage === undefined) {
    try { storage = typeof window !== 'undefined' ? window.localStorage : null; } catch { storage = null; }
  }
  if (!runExclusive && typeof navigator !== 'undefined' && navigator.locks) {
    runExclusive = (task) => navigator.locks.request(`${STORAGE_KEY}:lock`, { mode: 'exclusive' }, task);
  }
  // Without an atomic cross-tab lock, remain honestly session-local.
  const persistent = Boolean(storage && runExclusive);
  const now = options.now ?? Date.now;
  let memory = initialProject();
  let queue: Promise<unknown> = Promise.resolve();
  const receipts = new Map<string, { request: string; result: M0Project }>();

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = queue.then(() => persistent ? runExclusive!(task) : task());
    queue = next.catch(() => undefined);
    return next;
  }

  async function storedRecord(): Promise<{ expiresAt: number; project: M0Project } | null> {
    let raw: string | null;
    try { raw = storage!.getItem(STORAGE_KEY); }
    catch { throw new TransportError('LOCAL_STORAGE_UNAVAILABLE', 'Le navigateur ne permet plus l’accès au brouillon local. Tes réglages restent ouverts dans cette page.'); }
    if (!raw) return null;
    try {
      const record = JSON.parse(raw) as { expiresAt?: unknown; project?: unknown };
      if (typeof record.expiresAt !== 'number' || !Number.isFinite(record.expiresAt)) throw new Error('Invalid expiration');
      return { expiresAt: record.expiresAt, project: await verifiedProject(record.project) };
    } catch {
      throw new TransportError('LOCAL_RECOVERY_INVALID', 'Le brouillon local ne peut pas être lu. Il reste conservé dans le navigateur ; aucune copie ne l’a remplacé.');
    }
  }

  async function readStored(): Promise<M0Project> {
    if (!persistent) return verifiedProject(memory);
    const record = await storedRecord();
    if (!record) return verifiedProject(initialProject());
    if (record.expiresAt <= now()) throw new TransportError('LOCAL_RECOVERY_EXPIRED', 'Ce brouillon local a dépassé ses sept jours de conservation. Son contenu est préservé ; reprends-le explicitement pour continuer.');
    return record.project;
  }

  const transport: EditorTransport = {
    kind: persistent ? 'browser-local' : 'browser-memory',
    async read() { return enqueue(readStored); },
    async commit(command) {
      validateCommand(command);
      const execute = async () => {
        const request = stableStringify(command), receipt = receipts.get(command.idempotencyKey);
        if (receipt) {
          if (receipt.request !== request) throw new M0Error('IDEMPOTENCY_CONFLICT', 'Cette sauvegarde possède déjà un autre contenu.');
          if (persistent) {
            const record = await storedRecord();
            if (!record) throw new TransportError('LOCAL_RECOVERY_INVALID', 'Le brouillon local enregistré n’est plus disponible. Aucun ancien reçu ne confirme son état actuel.');
            if (record.expiresAt <= now()) throw new TransportError('LOCAL_RECOVERY_EXPIRED', 'Ce brouillon local a dépassé ses sept jours de conservation. Son contenu est préservé ; reprends-le explicitement pour continuer.');
            if (record.project.draftVersion < receipt.result.draftVersion || (record.project.draftVersion === receipt.result.draftVersion && record.project.contentHash !== receipt.result.contentHash)) {
              throw new TransportError('LOCAL_RECOVERY_INVALID', 'Le brouillon local ne correspond plus à la version de cette sauvegarde. Aucun accusé ancien n’a été réutilisé.');
            }
          }
          return structuredClone(receipt.result);
        }
        if (receipts.size >= 1000) throw new M0Error('RATE_LIMITED', 'La limite de sauvegardes de cette session de qualification est atteinte.');
        const before = await readStored();
        if (command.projectId !== before.projectId) throw new M0Error('NOT_FOUND', 'Ce projet n’est pas disponible.');
        if (command.expectedDraftVersion !== before.draftVersion) throw new M0Error('VERSION_CONFLICT', 'Une autre fenêtre a enregistré une version plus récente. Tes réglages sont conservés ici.');
        const snapshot = applyOperations(before.snapshot, command.payload.operations);
        const contentHash = await hashSnapshot(snapshot);
        const result: M0Project = { ...before, snapshot, contentHash, draftVersion: before.draftVersion + (contentHash === before.contentHash ? 0 : 1) };
        if (persistent) {
          try { storage!.setItem(STORAGE_KEY, JSON.stringify({ expiresAt: now() + MAX_AGE, project: result })); }
          catch { throw new TransportError('LOCAL_STORAGE_UNAVAILABLE', 'Le brouillon n’a pas été enregistré dans le navigateur. Garde cette page ouverte et réessaie.'); }
        } else memory = structuredClone(result);
        receipts.set(command.idempotencyKey, { request, result: structuredClone(result) });
        return structuredClone(result);
      };
      return enqueue(execute);
    },
    async close() {},
  };
  if (persistent) {
    transport.recoverExpired = () => enqueue(async () => {
      const record = await storedRecord();
      if (!record) throw new TransportError('LOCAL_RECOVERY_INVALID', 'Aucun brouillon local à reprendre n’a été trouvé.');
      if (record.expiresAt <= now()) {
        try { storage!.setItem(STORAGE_KEY, JSON.stringify({ expiresAt: now() + MAX_AGE, project: record.project })); }
        catch { throw new TransportError('LOCAL_STORAGE_UNAVAILABLE', 'La reprise du brouillon n’a pas été enregistrée. Le contenu d’origine est conservé.'); }
      }
      return structuredClone(record.project);
    });
  }
  return transport;
}

/** The SDK owns ui/initialize and the postMessage protocol. No credential is sent to the view. */
export async function createMcpTransport(): Promise<EditorTransport> {
  const app = new App({ name: 'Manifest', version: '0.0.0' }, {});
  let launchContext: EditorLaunchContext | undefined;
  const launchListeners = new Set<(context: EditorLaunchContext) => void>();
  // Set handlers before connect so the initial tool notification cannot be missed.
  app.ontoolresult = (result) => {
    // A malformed host notification must never replace the current draft or valid launch.
    let received: EditorLaunchContext | undefined;
    try { received = launchContextFromToolResult(result); } catch { return; }
    if (!received || received.id === launchContext?.id) return;
    launchContext = received;
    for (const listener of launchListeners) listener(structuredClone(received));
  };
  app.onhostcontextchanged = () => {};
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      app.connect(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new TransportError('HOST_UNAVAILABLE', 'La connexion à l’hôte n’a pas abouti. Réessaie depuis l’outil ouvert dans le chat.')), 12000); }),
    ]);
  } catch (error) {
    await app.close().catch(() => {});
    if (error instanceof TransportError) throw error;
    throw new TransportError('HOST_UNAVAILABLE', 'La connexion à l’hôte n’a pas abouti. Réessaie depuis l’outil ouvert dans le chat.');
  } finally { if (timeout) clearTimeout(timeout); }
  async function call(name: string, args: Record<string, unknown>): Promise<M0Project> {
    try { return await verifiedProject(projectFromToolResult(await app.callServerTool({ name, arguments: args }))); }
    catch (error) {
      if (error instanceof TransportError) throw error;
      throw new TransportError('HOST_UNAVAILABLE', 'La connexion à l’hôte est interrompue. Tes réglages restent ouverts ; vérifie la connexion avant de réessayer.');
    }
  }
  async function callData(name: string, args: Record<string, unknown>, metaKey: string | null): Promise<unknown> {
    try {
      const result = await app.callServerTool({ name, arguments: args }) as { isError?: boolean; _meta?: Record<string, unknown>; structuredContent?: unknown };
      if (result.isError) {
        const rawError = result._meta?.error;
        if (rawError && typeof rawError === 'object') {
          const details = rawError as { code?: unknown; message?: unknown };
          throw new TransportError(typeof details.code === 'string' ? details.code : 'HOST_ERROR', typeof details.message === 'string' ? details.message : 'L’hôte n’a pas pu effectuer cette action.');
        }
        throw new TransportError('HOST_ERROR', 'L’hôte n’a pas pu effectuer cette action. Réessaie après vérification de la connexion.');
      }
      const value = result.structuredContent ?? (metaKey ? result._meta?.[metaKey] : result._meta);
      if (value === undefined) throw new TransportError('INVALID_RESPONSE', 'La réponse de l’hôte est incomplète.');
      return value;
    } catch (error) {
      if (error instanceof TransportError) throw error;
      throw new TransportError('HOST_UNAVAILABLE', 'La connexion à l’hôte est interrompue. Tes réglages restent ouverts ; vérifie la connexion avant de réessayer.');
    }
  }
  async function readRegistry(): Promise<ModelProviderRegistry> {
    const value = await callData('get_provider_registry', {}, 'registry');
    validateModelProviderRegistry(value);
    return structuredClone(value);
  }
  async function readJob(name: 'start_suggestion' | 'get_job' | 'cancel_job', args: Record<string, unknown>): Promise<SuggestionJob> {
    const value = await callData(name, args, 'job');
    validateSuggestionJob(value);
    return structuredClone(value);
  }
  async function readProposal(name: 'read_proposal' | 'reject_proposal' | 'mark_proposal_stale', args: Record<string, unknown>): Promise<SuggestionProposal> {
    const value = await callData(name, args, 'proposal');
    validateSuggestionProposal(value);
    return structuredClone(value);
  }
  return {
    kind: 'mcp',
    subscribeLaunchContext(listener) {
      launchListeners.add(listener);
      if (launchContext) listener(structuredClone(launchContext));
      return () => { launchListeners.delete(listener); };
    },
    async read() { return call('read_project', { projectId: PROJECT_ID }); },
    async commit(command) { validateCommand(command); return call('commit_commands', { ...command }); },
    async readProviderRegistry() { return readRegistry(); },
    async startSuggestion(input) {
      validateStartSuggestionInput(input);
      return readJob('start_suggestion', { projectId: PROJECT_ID, ...input });
    },
    async getSuggestionJob(jobId) { return readJob('get_job', { jobId }); },
    async getSuggestionUpdates(jobId, afterSeq, limit = 50) {
      const value = await callData('get_job_updates', { jobId, afterSeq, limit }, 'page');
      validateSuggestionEventPage(value);
      return structuredClone(value);
    },
    async cancelSuggestion(jobId) { return readJob('cancel_job', { jobId }); },
    async readSuggestionProposal(proposalId) { return readProposal('read_proposal', { proposalId }); },
    async keepSuggestionProposal(proposalId) {
      const value = await callData('keep_proposal', { proposalId }, null);
      validateProposalDecisionResult(value);
      const result = value as ProposalDecisionResult;
      return { proposal: structuredClone(result.proposal), project: await verifiedProject(result.project) };
    },
    async rejectSuggestionProposal(proposalId) { return readProposal('reject_proposal', { proposalId }); },
    async markSuggestionProposalStale(proposalId) { return readProposal('mark_proposal_stale', { proposalId }); },
    async close() { launchListeners.clear(); await app.close(); },
  };
}
