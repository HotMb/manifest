/** Shared M0 subset. The Snapshot shape is the canonical page document, never a second tree. */
import fixture from '../../../docs/spec/contracts/examples/snapshot-empty.json' with { type: 'json' };

export const PROJECT_ID = 'project-m0';
export const COLOR_TOKEN_NAMES = ['color.background', 'color.text', 'color.accent'] as const;
export type ColorTokenName = typeof COLOR_TOKEN_NAMES[number];
export type ColorToken = { kind: 'color'; value: string };
export type HeroProps = { id: string; title: string; body: string; backgroundToken: ColorTokenName; animation: 'none' | 'fade' };
export type HeroBlock = { type: 'Hero'; props: HeroProps };
/** Explicit insertion defaults; opening a project never inserts this block implicitly. */
export function createHeroBlock(blockId = 'block-hero'): HeroBlock {
  const props: HeroProps = { id: blockId, title: 'Votre titre', body: '', backgroundToken: 'color.background', animation: 'none' };
  validateHero(props);
  return { type: 'Hero', props };
}
export type Snapshot = {
  schemaVersion: 1;
  projectTitle: string;
  pages: { id: string; title: string; route: string; composition: { content: HeroBlock[]; root: { props: { lang: string } } } }[];
  theme: { tokens: Record<ColorTokenName, ColorToken> };
  assetRefs: unknown[];
  catalogLock: { releaseId: string; sha256: string; target: 'react' };
  designPolicy: { releaseId: string; sha256: string };
  locks: { pageId: string; blockId: string | null; properties: string[] }[];
  designBrief: { product: string; character: string[]; world: string; moments: string[]; signature: string; brandConstraints: string[] };
};
export type M0Project = { projectId: string; draftVersion: number; contentHash: string; snapshot: Snapshot };
export type UpdatePropsOperation = { op: 'update_props'; pageId: string; blockId: string; props: Partial<Omit<HeroProps, 'id'>> };
export type UpdateThemeOperation = { op: 'update_theme'; tokens: Partial<Record<ColorTokenName, ColorToken>> };
export type InsertBlockOperation = { op: 'insert_block'; pageId: string; parentBlockId: null; slot: 'content'; beforeBlockId: null; block: HeroBlock };
export type RemoveBlockOperation = { op: 'remove_block'; pageId: string; blockId: string };
export type M0Operation = UpdatePropsOperation | UpdateThemeOperation | InsertBlockOperation | RemoveBlockOperation;
export type ApplyOpsCommand = { projectId: string; expectedDraftVersion: number; idempotencyKey: string; action: 'apply_ops'; payload: { operations: M0Operation[] } };
export type M0CommandResult = M0Project & { revisionId: null; receiptId: string };
export type M0ErrorCode = 'INVALID_INPUT' | 'CAPABILITY_UNSUPPORTED' | 'VERSION_CONFLICT' | 'IDEMPOTENCY_CONFLICT' | 'LOCKED_TARGET' | 'NOT_FOUND' | 'RATE_LIMITED';

export class M0Error extends Error {
  constructor(public readonly code: M0ErrorCode, message: string) { super(message); this.name = 'M0Error'; }
}
const reject: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new M0Error('INVALID_INPUT', message); };
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const hasOnly = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every((key) => keys.includes(key));
const text = (value: unknown, min: number, max: number): value is string => typeof value === 'string' && value.length >= min && value.length <= max;

function guardJson(value: unknown, depth = 0): void {
  reject(depth <= 12, 'Document trop profond.');
  if (Array.isArray(value)) { for (const item of value) guardJson(item, depth + 1); return; }
  if (isRecord(value)) {
    reject(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, 'Objet non JSON.');
    for (const [key, item] of Object.entries(value)) {
      reject(!['__proto__', 'prototype', 'constructor'].includes(key), 'Propriété réservée interdite.');
      guardJson(item, depth + 1);
    }
  } else reject(value === null || ['string', 'boolean'].includes(typeof value) || (typeof value === 'number' && Number.isFinite(value)), 'Valeur non JSON.');
}

function validateHero(value: unknown): asserts value is HeroProps {
  reject(isRecord(value) && hasOnly(value, ['id', 'title', 'body', 'backgroundToken', 'animation']), 'Propriétés Hero inconnues.');
  reject(id(value.id), 'Identifiant de bloc invalide.');
  reject(text(value.title, 1, 200) && text(value.body, 0, 1200), 'Texte Hero hors limites.');
  reject(COLOR_TOKEN_NAMES.includes(value.backgroundToken as ColorTokenName), 'Token de fond inconnu.');
  reject(['none', 'fade'].includes(value.animation as string), 'Animation non prise en charge.');
}

function validateHeroBlock(value: unknown): asserts value is HeroBlock {
  reject(isRecord(value) && hasOnly(value, ['type', 'props']) && value.type === 'Hero', 'Seul le bloc Hero est disponible en M0.');
  validateHero(value.props);
}

function validateColor(value: unknown): asserts value is ColorToken {
  reject(isRecord(value) && hasOnly(value, ['kind', 'value']) && value.kind === 'color' && typeof value.value === 'string' && /^#[a-fA-F0-9]{6}$/.test(value.value), 'Couleur attendue au format #RRGGBB.');
}

/** Semantic validation of the one-page, zero-or-one-Hero M0 catalogue. */
export function validateSnapshot(value: unknown): asserts value is Snapshot {
  guardJson(value);
  reject(isRecord(value) && hasOnly(value, ['schemaVersion', 'projectTitle', 'pages', 'theme', 'assetRefs', 'catalogLock', 'designPolicy', 'locks', 'designBrief']), 'Document inconnu.');
  reject(value.schemaVersion === 1 && text(value.projectTitle, 1, 200), 'Version ou titre de projet invalide.');
  reject(Array.isArray(value.pages) && value.pages.length === 1, 'M0 prend en charge une page.');
  const page = value.pages[0];
  reject(isRecord(page) && hasOnly(page, ['id', 'title', 'route', 'composition']) && id(page.id) && text(page.title, 1, 200) && page.route === '/', 'Page M0 invalide.');
  reject(isRecord(page.composition) && hasOnly(page.composition, ['content', 'root']), 'Composition invalide.');
  reject(Array.isArray(page.composition.content) && page.composition.content.length <= 1, 'M0 prend en charge zéro ou un bloc.');
  const block = page.composition.content[0];
  if (block !== undefined) {
    validateHeroBlock(block);
    reject(block.props.id !== page.id, 'Identifiant de bloc déjà utilisé par la page.');
  }
  reject(isRecord(page.composition.root) && hasOnly(page.composition.root, ['props']) && isRecord(page.composition.root.props) && hasOnly(page.composition.root.props, ['lang']) && page.composition.root.props.lang === 'fr', 'Racine M0 invalide.');
  reject(isRecord(value.theme) && hasOnly(value.theme, ['tokens']) && isRecord(value.theme.tokens) && Object.keys(value.theme.tokens).length === 3 && hasOnly(value.theme.tokens, COLOR_TOKEN_NAMES), 'Thème M0 invalide.');
  for (const key of COLOR_TOKEN_NAMES) validateColor(value.theme.tokens[key]);
  reject(Array.isArray(value.assetRefs) && value.assetRefs.length === 0, 'Aucun asset externe en M0.');
  for (const key of ['catalogLock', 'designPolicy']) {
    const ref = value[key];
    reject(isRecord(ref) && id(ref.releaseId) && typeof ref.sha256 === 'string' && /^[a-f0-9]{64}$/.test(ref.sha256), 'Référence de release invalide.');
    reject(hasOnly(ref, key === 'catalogLock' ? ['releaseId', 'sha256', 'target'] : ['releaseId', 'sha256']), 'Métadonnées de release inconnues.');
    if (key === 'catalogLock') reject(ref.target === 'react', 'Cible M0 invalide.');
  }
  reject(isRecord(value.designBrief) && hasOnly(value.designBrief, ['product', 'character', 'world', 'moments', 'signature', 'brandConstraints']), 'Brief invalide.');
  const brief = value.designBrief;
  reject(text(brief.product, 1, 1000) && text(brief.world, 1, 500) && text(brief.signature, 0, 500), 'Texte de brief invalide.');
  reject(Array.isArray(brief.character) && brief.character.length >= 1 && brief.character.length <= 3 && brief.character.every((s) => text(s, 1, 100)), 'Caractères du brief invalides.');
  reject(Array.isArray(brief.moments) && brief.moments.length <= 2 && brief.moments.every((s) => text(s, 1, 500)), 'Moments du brief invalides.');
  reject(Array.isArray(brief.brandConstraints) && brief.brandConstraints.length <= 30 && brief.brandConstraints.every((s) => text(s, 1, 500)), 'Contraintes de marque invalides.');
  reject(Array.isArray(value.locks) && value.locks.length <= 200, 'Verrouillages invalides.');
  const lockProperties = ['content', 'title', 'body', 'backgroundToken', 'animation', 'theme', 'theme.tokens', ...COLOR_TOKEN_NAMES, ...COLOR_TOKEN_NAMES.map((s) => `theme.tokens.${s}`)];
  for (const lock of value.locks) reject(isRecord(lock) && hasOnly(lock, ['pageId', 'blockId', 'properties']) && lock.pageId === page.id && (lock.blockId === null || (block !== undefined && lock.blockId === block.props.id)) && Array.isArray(lock.properties) && lock.properties.every((p) => typeof p === 'string' && lockProperties.includes(p)), 'Cible de verrouillage invalide.');
  reject(JSON.stringify(value).length <= 32_768, 'Document M0 trop volumineux.');
}

export function validateCommand(value: unknown): asserts value is ApplyOpsCommand {
  guardJson(value);
  reject(isRecord(value) && hasOnly(value, ['projectId', 'expectedDraftVersion', 'idempotencyKey', 'action', 'payload']), 'Commande inconnue.');
  reject(id(value.projectId) && id(value.idempotencyKey) && Number.isSafeInteger(value.expectedDraftVersion) && Number(value.expectedDraftVersion) >= 0, 'Enveloppe de commande invalide.');
  if (value.action !== 'apply_ops') throw new M0Error('CAPABILITY_UNSUPPORTED', 'Seule la modification manuelle est disponible en M0.');
  reject(isRecord(value.payload) && hasOnly(value.payload, ['operations']) && Array.isArray(value.payload.operations) && value.payload.operations.length >= 1 && value.payload.operations.length <= 100, 'Lot invalide.');
  for (const op of value.payload.operations) {
    reject(isRecord(op), 'Opération invalide.');
    if (op.op === 'update_props') {
      reject(hasOnly(op, ['op', 'pageId', 'blockId', 'props']) && id(op.pageId) && id(op.blockId) && isRecord(op.props) && Object.keys(op.props).length >= 1 && hasOnly(op.props, ['title', 'body', 'backgroundToken', 'animation']), 'Modification Hero invalide.');
    } else if (op.op === 'update_theme') {
      reject(hasOnly(op, ['op', 'tokens']) && isRecord(op.tokens) && Object.keys(op.tokens).length >= 1 && hasOnly(op.tokens, COLOR_TOKEN_NAMES), 'Modification de thème invalide.');
      for (const token of Object.values(op.tokens)) validateColor(token);
    } else if (op.op === 'insert_block') {
      reject(hasOnly(op, ['op', 'pageId', 'parentBlockId', 'slot', 'beforeBlockId', 'block']) && id(op.pageId), 'Insertion Hero invalide.');
      if (op.parentBlockId !== null || op.slot !== 'content' || op.beforeBlockId !== null) throw new M0Error('CAPABILITY_UNSUPPORTED', 'M0 insère uniquement dans la composition racine vide.');
      validateHeroBlock(op.block);
    } else if (op.op === 'remove_block') {
      reject(hasOnly(op, ['op', 'pageId', 'blockId']) && id(op.pageId) && id(op.blockId), 'Suppression Hero invalide.');
    } else throw new M0Error('CAPABILITY_UNSUPPORTED', 'Cette opération n’est pas disponible en M0.');
  }
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export async function hashSnapshot(snapshot: Snapshot): Promise<string> {
  validateSnapshot(snapshot);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableStringify(snapshot)));
  return [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, '0')).join('');
}

export function initialProject(): M0Project {
  const snapshot: unknown = structuredClone(fixture);
  validateSnapshot(snapshot);
  return { projectId: PROJECT_ID, draftVersion: 0, contentHash: 'bdd82ee1cea669f41c7b184abbbd891f44388b3f84f38ffee0e7c335c53c102f', snapshot };
}

export function applyOperations(snapshot: Snapshot, operations: M0Operation[]): Snapshot {
  validateSnapshot(snapshot);
  validateCommand({ projectId: PROJECT_ID, expectedDraftVersion: 0, idempotencyKey: 'validate-batch', action: 'apply_ops', payload: { operations } });
  const next = structuredClone(snapshot), page = next.pages[0]!;
  const compositionLocked = (blockId?: string) => next.locks.some((lock) => lock.pageId === page.id && (
    (blockId !== undefined && lock.blockId === blockId)
    || (lock.blockId === null && (lock.properties.length === 0 || lock.properties.some((key) => ['content', 'title', 'body', 'backgroundToken', 'animation'].includes(key))))
  ));
  for (const op of operations) {
    // Resolve after each operation: an earlier insert/remove may have changed the target.
    const block = page.composition.content[0];
    if (op.op === 'update_props') {
      if (op.pageId !== page.id || !block || op.blockId !== block.props.id) throw new M0Error('NOT_FOUND', 'Bloc inaccessible dans ce projet.');
      const changed = Object.keys(op.props).filter((key) => stableStringify(block.props[key as keyof HeroProps]) !== stableStringify(op.props[key as keyof typeof op.props]));
      for (const lock of next.locks) {
        if (lock.pageId === page.id && (lock.blockId === null || lock.blockId === block.props.id) && changed.some((key) => lock.properties.length === 0 || lock.properties.includes(key))) throw new M0Error('LOCKED_TARGET', 'Ce réglage est verrouillé.');
      }
      block.props = { ...block.props, ...op.props };
    } else if (op.op === 'update_theme') {
      for (const key of Object.keys(op.tokens) as ColorTokenName[]) {
        if (stableStringify(next.theme.tokens[key]) === stableStringify(op.tokens[key])) continue;
        if (next.locks.some((lock) => lock.blockId === null && (lock.properties.length === 0 || lock.properties.some((p) => ['theme', 'theme.tokens', key, `theme.tokens.${key}`].includes(p))))) throw new M0Error('LOCKED_TARGET', 'Ce token est verrouillé.');
        next.theme.tokens[key] = structuredClone(op.tokens[key]!);
      }
    } else if (op.op === 'insert_block') {
      if (op.pageId !== page.id) throw new M0Error('NOT_FOUND', 'Page inaccessible dans ce projet.');
      reject(!block && op.block.props.id !== page.id, 'La composition doit être vide et les identifiants uniques.');
      if (compositionLocked()) throw new M0Error('LOCKED_TARGET', 'Cette composition est verrouillée.');
      page.composition.content.push(structuredClone(op.block));
    } else {
      if (op.pageId !== page.id || !block || op.blockId !== block.props.id) throw new M0Error('NOT_FOUND', 'Bloc inaccessible dans ce projet.');
      if (compositionLocked(block.props.id)) throw new M0Error('LOCKED_TARGET', 'Ce bloc est verrouillé.');
      page.composition.content = [];
    }
  }
  validateSnapshot(next);
  return next;
}

export function makeEditCommand(project: M0Project, nextSnapshot: Snapshot, key: string): ApplyOpsCommand {
  validateSnapshot(project.snapshot); validateSnapshot(nextSnapshot);
  const before = project.snapshot.pages[0]!, after = nextSnapshot.pages[0]!;
  const beforeBlock = before.composition.content[0], afterBlock = after.composition.content[0];
  const operations: M0Operation[] = [];
  if (beforeBlock && (!afterBlock || beforeBlock.props.id !== afterBlock.props.id)) operations.push({ op: 'remove_block', pageId: before.id, blockId: beforeBlock.props.id });
  if (afterBlock && (!beforeBlock || beforeBlock.props.id !== afterBlock.props.id)) {
    operations.push({ op: 'insert_block', pageId: before.id, parentBlockId: null, slot: 'content', beforeBlockId: null, block: structuredClone(afterBlock) });
  } else if (beforeBlock && afterBlock) {
    const props: Partial<Omit<HeroProps, 'id'>> = {};
    for (const name of ['title', 'body', 'backgroundToken', 'animation'] as const) {
      if (beforeBlock.props[name] !== afterBlock.props[name]) Object.assign(props, { [name]: afterBlock.props[name] });
    }
    if (Object.keys(props).length) operations.push({ op: 'update_props', pageId: before.id, blockId: beforeBlock.props.id, props });
  }
  const tokens: Partial<Record<ColorTokenName, ColorToken>> = {};
  for (const name of COLOR_TOKEN_NAMES) if (stableStringify(project.snapshot.theme.tokens[name]) !== stableStringify(nextSnapshot.theme.tokens[name])) tokens[name] = structuredClone(nextSnapshot.theme.tokens[name]);
  if (Object.keys(tokens).length) operations.push({ op: 'update_theme', tokens });
  // The canonical command requires at least one operation, including on an empty page.
  if (!operations.length) operations.push({ op: 'update_theme', tokens: { 'color.background': structuredClone(project.snapshot.theme.tokens['color.background']) } });
  const command: ApplyOpsCommand = { projectId: project.projectId, expectedDraftVersion: project.draftVersion, idempotencyKey: key, action: 'apply_ops', payload: { operations } };
  const projected = applyOperations(project.snapshot, operations);
  if (stableStringify(projected) !== stableStringify(nextSnapshot)) throw new M0Error('CAPABILITY_UNSUPPORTED', 'Une modification en dehors du périmètre M0 a été demandée.');
  validateCommand(command);
  return command;
}

export * from './providers.ts';
export * from './provider-simulator.ts';
export * from './provider-orchestrator.ts';
export * from './provider-http-adapter.ts';
export * from './suggestions.ts';
export * from './launch-context.ts';
