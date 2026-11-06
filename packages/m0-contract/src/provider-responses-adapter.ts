import { applyOperations, stableStringify, validateSnapshot, type Snapshot } from './index.ts';
import type { ManifestModelRequest, ManifestModelResult, ModelProviderAdapter, ModelProviderDescriptor } from './providers.ts';
import { LOCAL_CATALOG_CAPABILITIES, M0_INSTRUCTIONS, ProviderHttpAdapterError, parseProviderContent, parseProviderOperations, type ProviderHttpAdapterErrorCode } from './provider-http-adapter.ts';

export type ResponsesFetch = (url: string, init: RequestInit) => Promise<Response>;
export type ResponsesAdapterOptions = {
  descriptor: ModelProviderDescriptor;
  getAccessToken: () => Promise<string>;
  fetchImpl?: ResponsesFetch;
  timeoutMs?: number;
};

const RESPONSES_URL = 'https://api.openai.com/v1/responses';
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const abortError = () => new DOMException('La demande a été annulée.', 'AbortError');

function errorForStatus(status: number): ProviderHttpAdapterError {
  if (status === 401 || status === 403) return new ProviderHttpAdapterError('UNAUTHORIZED', 'La connexion ChatGPT doit être renouvelée.');
  if (status === 429) return new ProviderHttpAdapterError('RATE_LIMITED', 'Le fournisseur a atteint sa limite de requêtes.');
  if (status >= 500) return new ProviderHttpAdapterError('UNAVAILABLE', 'Le fournisseur est momentanément indisponible.');
  return new ProviderHttpAdapterError('HTTP_ERROR', 'Le fournisseur a refusé la requête.');
}

function outputTextFromResponse(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value.output)) return '';
  const chunks: string[] = [];
  for (const item of value.output) {
    if (!isRecord(item) || item.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) if (isRecord(part) && part.type === 'output_text' && typeof part.text === 'string') chunks.push(part.text);
  }
  return chunks.join('');
}

async function streamCompletedText(response: Response, signal: AbortSignal): Promise<{ text: string; response: unknown }> {
  if (!response.body) throw new ProviderHttpAdapterError('INVALID_OUTPUT', 'Le fournisseur n’a pas retourné de flux.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let completedResponse: unknown;
  let completed = false;
  let terminalError: ProviderHttpAdapterError | undefined;

  const processFrame = (frame: string) => {
    let data = '';
    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith('data:')) data += `${data ? '\n' : ''}${line.slice(5).trimStart()}`;
    }
    if (!data || data === '[DONE]') return;
    let event: unknown;
    try { event = JSON.parse(data); } catch { terminalError = new ProviderHttpAdapterError('INVALID_OUTPUT', 'Le flux du fournisseur est invalide.'); return; }
    if (!isRecord(event) || typeof event.type !== 'string') return;
    if (event.type === 'response.output_text.delta') {
      if (typeof event.delta === 'string') text += event.delta;
    } else if (event.type === 'response.completed') {
      completed = true;
      completedResponse = event.response;
      const finalText = outputTextFromResponse(event.response);
      if (finalText) text = finalText;
    } else if (event.type === 'response.failed') {
      terminalError = new ProviderHttpAdapterError('UNAVAILABLE', 'La génération n’a pas abouti.');
    } else if (event.type === 'response.incomplete' || event.type === 'error') {
      terminalError = new ProviderHttpAdapterError('UNAVAILABLE', 'La génération a été interrompue.');
    }
  };

  try {
    while (true) {
      if (signal.aborted) throw abortError();
      const result = await reader.read();
      if (result.done) break;
      buffer += decoder.decode(result.value, { stream: true });
      let delimiter = buffer.match(/\r?\n\r?\n/);
      while (delimiter?.index !== undefined) {
        const frame = buffer.slice(0, delimiter.index);
        buffer = buffer.slice(delimiter.index + delimiter[0].length);
        processFrame(frame);
        delimiter = buffer.match(/\r?\n\r?\n/);
      }
      if (terminalError) throw terminalError;
    }
    buffer += decoder.decode();
    if (buffer.trim()) processFrame(buffer);
    if (terminalError) throw terminalError;
    if (!completed) throw new ProviderHttpAdapterError('UNAVAILABLE', 'Le flux s’est terminé avant response.completed.');
    if (!text.trim()) throw new ProviderHttpAdapterError('INVALID_OUTPUT', 'La réponse complétée est vide.');
    return { text, response: completedResponse };
  } finally {
    try { await reader.cancel(); } catch { /* stream may already be closed */ }
  }
}

function usageFromResponse(value: unknown): { inputTokens?: number; outputTokens?: number } | undefined {
  if (!isRecord(value) || !isRecord(value.usage)) return undefined;
  const inputTokens = typeof value.usage.input_tokens === 'number' && Number.isFinite(value.usage.input_tokens) && value.usage.input_tokens >= 0 ? value.usage.input_tokens : undefined;
  const outputTokens = typeof value.usage.output_tokens === 'number' && Number.isFinite(value.usage.output_tokens) && value.usage.output_tokens >= 0 ? value.usage.output_tokens : undefined;
  return inputTokens === undefined && outputTokens === undefined ? undefined : { ...(inputTokens !== undefined ? { inputTokens } : {}), ...(outputTokens !== undefined ? { outputTokens } : {}) };
}

function safeAuthError(error: unknown): ProviderHttpAdapterError {
  if (error instanceof ProviderHttpAdapterError) return error;
  const code = isRecord(error) && typeof error.code === 'string' ? error.code : '';
  const mapped: Record<string, ProviderHttpAdapterErrorCode> = {
    insufficient_scope: 'MISSING_CREDENTIAL',
    authorization_expired: 'UNAUTHORIZED',
    network_error: 'UNAVAILABLE',
    storage_error: 'UNAVAILABLE',
    unsupported_platform: 'UNAVAILABLE',
  };
  const mappedCode = mapped[code] ?? 'UNAVAILABLE';
  return new ProviderHttpAdapterError(mappedCode, mappedCode === 'UNAUTHORIZED'
    ? 'La connexion ChatGPT doit être renouvelée.'
    : mappedCode === 'MISSING_CREDENTIAL' ? 'L’usage du forfait ChatGPT n’est pas autorisé.' : 'La connexion au fournisseur a échoué.');
}

/** Sends a non-stored Responses stream using a delegated ChatGPT plan token, then validates only M0 operations. */
export function createChatGPTResponsesAdapter(options: ResponsesAdapterOptions): ModelProviderAdapter {
  if (options.descriptor.id !== 'openai' || options.descriptor.protocol !== 'openai-responses') {
    throw new ProviderHttpAdapterError('HTTP_ERROR', 'Cet adaptateur attend le mode openai-responses.');
  }
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 60_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new ProviderHttpAdapterError('HTTP_ERROR', 'Le délai fournisseur est invalide.');

  return {
    descriptor: options.descriptor,
    async suggest(request: ManifestModelRequest): Promise<ManifestModelResult> {
      validateSnapshot(request.snapshot);
      if (request.providerId !== 'openai' || !options.descriptor.models.some((model) => model.id === request.modelId)) throw new ProviderHttpAdapterError('HTTP_ERROR', 'Le modèle demandé ne correspond pas à cet adaptateur.');
      if (request.signal?.aborted) throw abortError();
      let token: string;
      try { token = await options.getAccessToken(); }
      catch (error) { throw safeAuthError(error); }
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
      const onAbort = () => controller.abort();
      request.signal?.addEventListener('abort', onAbort, { once: true });
      const modelSnapshot = structuredClone(request.snapshot);
      delete modelSnapshot.designPolicy;
      try {
        const response = await fetchImpl(RESPONSES_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, accept: 'text/event-stream' },
          body: JSON.stringify({
            model: request.modelId,
            instructions: `${M0_INSTRUCTIONS}\n\nRelease et capacités catalogue locales autorisées (source de vérité ; n’invente rien hors de cette liste) :\n${JSON.stringify(LOCAL_CATALOG_CAPABILITIES)}`,
            input: [{ role: 'user', content: [{ type: 'input_text', text: `Description:\n${request.description}\nSnapshot:\n${stableStringify(modelSnapshot)}` }] }],
            text: { format: { type: 'json_object' } },
            max_output_tokens: 4_000,
            store: false,
            stream: true,
          }),
          redirect: 'error',
          signal: controller.signal,
        });
        if (!response.ok) throw errorForStatus(response.status);
        const streamed = await streamCompletedText(response, controller.signal);
        const parsed = parseProviderOperations(parseProviderContent(streamed.text), request.snapshot);
        if (parsed.operations.length) {
          try { applyOperations(request.snapshot, parsed.operations); }
          catch { throw new ProviderHttpAdapterError('INVALID_OUTPUT', 'La réponse fournisseur contient une opération refusée par le contrat M0.'); }
        }
        const usage = usageFromResponse(streamed.response);
        return { requestId: request.requestId, providerId: 'openai', modelId: request.modelId, source: 'provider', baseSignature: request.baseSignature, operations: parsed.operations, rationale: parsed.rationale, usage };
      } catch (error) {
        if (error instanceof ProviderHttpAdapterError) throw error;
        if (request.signal?.aborted) throw abortError();
        if (timedOut) throw new ProviderHttpAdapterError('TIMEOUT', 'Le délai du fournisseur a été dépassé.');
        throw new ProviderHttpAdapterError('UNAVAILABLE', 'La connexion au fournisseur a échoué.');
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}
