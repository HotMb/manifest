import { applyOperations, stableStringify, validateSnapshot, type M0Operation, type Snapshot } from './index.ts';
import type { ManifestModelRequest, ManifestModelResult, ModelProviderAdapter, ModelProviderDescriptor } from './providers.ts';

/** A deterministic local adapter used to exercise the provider boundary without network access. */
export const DETERMINISTIC_SIMULATOR_DESCRIPTOR: ModelProviderDescriptor = {
  id: 'custom',
  label: 'Manifest simulator',
  protocol: 'openai-compatible',
  status: 'disabled',
  models: [{ id: 'manifest-simulator-v1', label: 'Manifest simulator v1', providerId: 'custom', capabilities: ['structured-output'] }],
  supportsBYOK: false,
  secretConfigured: false,
};

const wait = (milliseconds: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) { reject(new DOMException('La demande a été annulée.', 'AbortError')); return; }
  let settled = false;
  const cleanup = () => signal?.removeEventListener('abort', onAbort);
  const onAbort = () => { if (settled) return; settled = true; clearTimeout(timer); cleanup(); reject(new DOMException('La demande a été annulée.', 'AbortError')); };
  const timer = setTimeout(() => { if (settled) return; settled = true; cleanup(); resolve(); }, milliseconds);
  signal?.addEventListener('abort', onAbort, { once: true });
});

function colorOperations(description: string, snapshot: Snapshot): M0Operation[] {
  const normalized = description.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const page = snapshot.pages[0]!;
  const hero = page.composition.content[0]!;
  const tokens = snapshot.theme.tokens;
  const next: Partial<typeof tokens> = {};
  if (/\b(fond sombre|fond noir|theme sombre|page sombre)\b/.test(normalized)) {
    next['color.background'] = { kind: 'color', value: '#172026' };
    next['color.text'] = { kind: 'color', value: '#f3f1eb' };
  } else if (/\b(fond clair|fond blanc|theme clair|page claire)\b/.test(normalized)) {
    next['color.background'] = { kind: 'color', value: '#ffffff' };
    next['color.text'] = { kind: 'color', value: '#1c2533' };
  }
  if (/\b(accent vert|couleur verte)\b/.test(normalized)) next['color.accent'] = { kind: 'color', value: '#33715b' };
  if (/\b(accent bleu|couleur bleue)\b/.test(normalized)) next['color.accent'] = { kind: 'color', value: '#2454c6' };
  if (/\b(accent violet|couleur violette)\b/.test(normalized)) next['color.accent'] = { kind: 'color', value: '#7955c3' };
  const changed = Object.fromEntries(Object.entries(next).filter(([key, value]) => stableStringify(tokens[key as keyof typeof tokens]) !== stableStringify(value))) as typeof next;
  const operations: M0Operation[] = Object.keys(changed).length ? [{ op: 'update_theme', tokens: changed }] : [];
  const props: { title?: string; body?: string; animation?: 'none' | 'fade' } = {};
  const title = description.match(/^titre\s*[:=]\s*(.+)$/im)?.[1]?.trim();
  const body = description.match(/^(?:texte|presentation)\s*[:=]\s*(.+)$/im)?.[1]?.trim();
  if (title && title !== hero.props.title && title.length <= 200) props.title = title;
  if (body && body !== hero.props.body && body.length <= 1200) props.body = body;
  if (/\b(sans animation|aucune animation|sans mouvement)\b/.test(normalized) && hero.props.animation !== 'none') props.animation = 'none';
  if (/\b(fondu|animation douce|entree douce)\b/.test(normalized) && hero.props.animation !== 'fade') props.animation = 'fade';
  if (Object.keys(props).length) operations.push({ op: 'update_props', pageId: page.id, blockId: hero.props.id, props });
  return operations;
}

export function isModelResultCurrent(request: ManifestModelRequest, result: ManifestModelResult): boolean {
  return request.requestId === result.requestId && request.providerId === result.providerId && request.modelId === result.modelId && request.baseSignature === result.baseSignature;
}

export function createDeterministicModelAdapter(delayMs = 0): ModelProviderAdapter {
  return {
    descriptor: DETERMINISTIC_SIMULATOR_DESCRIPTOR,
    async suggest(request) {
      validateSnapshot(request.snapshot);
      if (request.providerId !== 'custom' || request.modelId !== 'manifest-simulator-v1') throw new Error('Le simulateur Manifest attend son modèle déterministe.');
      if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 30_000) throw new Error('Délai du simulateur invalide.');
      await wait(delayMs, request.signal);
      const operations = colorOperations(request.description, request.snapshot);
      if (operations.length) applyOperations(request.snapshot, operations);
      return { requestId: request.requestId, providerId: request.providerId, modelId: request.modelId, source: 'provider', baseSignature: request.baseSignature, operations, rationale: operations.length ? 'Suggestion déterministe locale pour exercer le contrat fournisseur.' : 'Aucune opération structurée pour cette intention.' };
    },
  };
}
