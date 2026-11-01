import { App } from '@modelcontextprotocol/ext-apps';
import {
  PROJECT_ID, M0Error, initialProject, applyOperations, hashSnapshot, stableStringify, validateSnapshot, validateCommand,
  type M0Project, type ApplyOpsCommand,
} from '@design-workbench/m0-contract';

export type EditorTransport = {
  readonly kind: 'browser-local' | 'browser-memory' | 'mcp';
  read(): Promise<M0Project>;
  commit(command: ApplyOpsCommand): Promise<M0Project>;
  recoverExpired?(): Promise<M0Project>;
  close(): Promise<void>;
};

export class TransportError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'TransportError'; }
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
  const app = new App({ name: 'Design Workbench', version: '0.0.0' }, {});
  // Set handlers before connect so the initial tool notification cannot be missed.
  app.ontoolresult = () => {};
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
  return {
    kind: 'mcp',
    async read() { return call('read_project', { projectId: PROJECT_ID }); },
    async commit(command) { validateCommand(command); return call('commit_commands', { ...command }); },
    async close() { await app.close(); },
  };
}
