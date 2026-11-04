import { createElement, type CSSProperties, type ReactNode } from 'react';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

export const CATALOG_COMPONENT_SCHEMAS = deepFreeze({
  section: { variant: { type: 'string', required: true, enum: ['default', 'quiet', 'accent'] } },
  hero: { title: { type: 'string', required: true, minLength: 1, maxLength: 180 }, body: { type: 'string', required: true, maxLength: 1000 } },
  stack: { direction: { type: 'string', required: true, enum: ['vertical', 'horizontal'] }, gap: { type: 'number', required: true, minimum: 0, maximum: 64 }, align: { type: 'string', required: true, enum: ['start', 'center', 'end', 'stretch'] } },
  grid: { columns: { type: 'integer', required: true, minimum: 1, maximum: 4 }, gap: { type: 'number', required: true, minimum: 0, maximum: 64 } },
  heading: { text: { type: 'string', required: true, minLength: 1, maxLength: 180 }, level: { type: 'integer', required: true, minimum: 1, maximum: 6 } },
  text: { text: { type: 'string', required: true, maxLength: 1600 }, tone: { type: 'string', required: true, enum: ['body', 'muted', 'eyebrow'] } },
  button: { label: { type: 'string', required: true, minLength: 1, maxLength: 80 }, href: { type: 'internal-path', required: true }, tone: { type: 'string', required: true, enum: ['primary', 'secondary', 'quiet'] } },
  navigation: { brand: { type: 'string', required: true, minLength: 1, maxLength: 60 }, links: { type: 'array', required: true, maxItems: 8, items: { type: 'object', additionalProperties: false, properties: { label: { type: 'string', required: true, minLength: 1, maxLength: 60 }, href: { type: 'internal-path', required: true } } } }, primaryLabel: { type: 'string', maxLength: 80 }, primaryHref: { type: 'internal-path' }, mobileMenuMotion: { type: 'string', enum: ['fade', 'slide-down', 'none'] }, mobileMenuDurationMs: { type: 'integer', minimum: 100, maximum: 500 } },
  'cloud-background': { palette: { type: 'string', required: true, enum: ['dawn', 'day', 'sunset'] }, density: { type: 'string', required: true, enum: ['low', 'medium', 'high'] }, speed: { type: 'number', required: true, minimum: 0, maximum: 1 }, motionSpeedMultiplier: { type: 'number', minimum: 0.25, maximum: 4 } },
  'sales-chart': {
    title: { type: 'string', required: true, minLength: 1, maxLength: 100 },
    dataMode: { type: 'string', required: true, const: 'synthetic' },
    chartType: { type: 'string', required: true, enum: ['line', 'bar', 'area'] },
    series: {
      type: 'array', required: true, minItems: 1, maxItems: 4,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          name: { type: 'string', required: true, minLength: 1, maxLength: 50 },
          points: {
            type: 'array', required: true, minItems: 2, maxItems: 12,
            items: { type: 'object', additionalProperties: false, properties: {
              label: { type: 'string', required: true, minLength: 1, maxLength: 30 },
              value: { type: 'number', required: true, minimum: 0, maximum: 1_000_000 },
            } },
          },
        },
      },
    },
  },
});

export const CATALOG_MOTION_SCHEMAS = deepFreeze({
  'fade-in': { durationMs: { type: 'integer', required: true, minimum: 0, maximum: 3000 }, delayMs: { type: 'integer', required: true, minimum: 0, maximum: 2000 }, opacityFrom: { type: 'number', minimum: 0, maximum: 1 } },
  'slide-up': { durationMs: { type: 'integer', required: true, minimum: 0, maximum: 3000 }, delayMs: { type: 'integer', required: true, minimum: 0, maximum: 2000 }, distancePx: { type: 'number', minimum: 0, maximum: 40 } },
  'slide-down': { durationMs: { type: 'integer', required: true, minimum: 0, maximum: 3000 }, delayMs: { type: 'integer', required: true, minimum: 0, maximum: 2000 }, distancePx: { type: 'number', minimum: 0, maximum: 40 } },
  'fade-slide-down': { durationMs: { type: 'integer', required: true, minimum: 0, maximum: 3000 }, delayMs: { type: 'integer', required: true, minimum: 0, maximum: 2000 }, distancePx: { type: 'number', required: true, minimum: 0, maximum: 40 }, opacityFrom: { type: 'number', required: true, minimum: 0, maximum: 1 } },
  'fade-slide-up': { durationMs: { type: 'integer', required: true, minimum: 0, maximum: 3000 }, delayMs: { type: 'integer', required: true, minimum: 0, maximum: 2000 }, distancePx: { type: 'number', required: true, minimum: 0, maximum: 40 }, opacityFrom: { type: 'number', required: true, minimum: 0, maximum: 1 } },
  composed: {
    durationMs: { type: 'integer', required: true, minimum: 0, maximum: 3000 },
    delayMs: { type: 'integer', required: true, minimum: 0, maximum: 2000 },
    easing: { type: 'string', required: true, enum: ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'] },
    repeatCount: { type: 'integer', required: true, minimum: 1, maximum: 4 },
    primitives: {
      type: 'array', required: true, minItems: 1, maxItems: 6,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          property: { type: 'string', required: true, enum: ['opacity', 'translateX', 'translateY', 'scale', 'rotate', 'blur'] },
          amplitude: { type: 'number', required: true },
        },
      },
    },
  },
});

const localSource = { type: 'authored-in-repository', reference: 'packages/catalog/src', status: 'license-pending' } as const;
const localDependencies = [{ name: 'react', version: '19.3.1', kind: 'peer', license: 'MIT' }] as const;
const costProfile = { measurement: 'pending', budget: 'low-motion-no-webgl' } as const;
const contentChildren = ['hero', 'section', 'stack', 'grid', 'heading', 'text', 'button', 'navigation', 'sales-chart'];
const cloudChildren = ['section', 'stack', 'grid', 'heading', 'text', 'button', 'sales-chart'];
const contentSlot = (accepts: string[]) => [{ id: 'content', required: true, accepts }];

export const UNSLOP_PROFILE = deepFreeze({
  id: 'unslop-informed',
  version: '1.1.0',
  attribution: 'Unslop by Damir Sokolovsky (@heydamir), licensed CC BY 4.0.',
  passes: ['spacing', 'color', 'icons', 'copy', 'type', 'layout', 'visuals', 'motion', 'check'] as const,
  rules: [
    { pass: 'spacing', severity: 'prefer', guidance: 'Use a repeatable spacing scale and a consistent rhythm between sections.' },
    { pass: 'color', severity: 'block', guidance: 'Keep text contrast readable and preserve colors explicitly locked by the user or brand.' },
    { pass: 'icons', severity: 'prefer', guidance: 'Use one coherent icon style; do not use emoji as interface icons.' },
    { pass: 'copy', severity: 'prefer', guidance: 'Use concise, specific labels and content that fits the described product.' },
    { pass: 'type', severity: 'prefer', guidance: 'Create a clear type hierarchy with readable line lengths.' },
    { pass: 'layout', severity: 'prefer', guidance: 'Give the main task a clear hierarchy and align repeated elements.' },
    { pass: 'visuals', severity: 'prefer', guidance: 'Use visuals that explain the product; avoid decorative filler.' },
    { pass: 'motion', severity: 'review', guidance: 'Use motion to explain state or hierarchy and respect reduced-motion preferences.' },
    { pass: 'check', severity: 'block', guidance: 'Review responsive layout, keyboard access, contrast, and empty/loading/error states.' },
  ],
  constraints: ['Adapt to the product and brand brief.', 'Respect explicit brand locks and reduced-motion preferences.', 'Prefer one specific, useful visual moment over decorative effects throughout.'],
  exceptions: ['Explicit user and brand choices take precedence over aesthetic preferences, unless they make the page inaccessible or unsafe.', 'Reduced-motion preferences disable nonessential movement.'],
  adaptable: true,
});

export const CATALOG_RELEASE = deepFreeze({
  id: 'manifest-core',
  version: '0.3.0',
  target: 'react',
  status: 'internal-preview',
  source: { id: 'manifest-repository', name: 'Manifest local catalog', status: 'local-code-source-pending-license' },
  license: 'NOASSERTION',
  licenseStatus: 'repository-license-not-set',
  integrity: { algorithm: 'sha256', digest: null, status: 'source-hash-pending' },
  costProfile,
  dependencies: localDependencies,
  components: [
    { id: 'section', version: '1.0.0', category: 'layout', target: 'react', slots: contentSlot(contentChildren), schema: CATALOG_COMPONENT_SCHEMAS.section, capabilities: ['responsive', 'editor-preview'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile },
    { id: 'hero', version: '1.0.0', category: 'content', target: 'react', slots: contentSlot(['button', 'heading', 'text']), schema: CATALOG_COMPONENT_SCHEMAS.hero, capabilities: ['responsive', 'editor-preview'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile },
    { id: 'stack', version: '1.0.0', category: 'layout', target: 'react', slots: contentSlot(contentChildren), schema: CATALOG_COMPONENT_SCHEMAS.stack, capabilities: ['responsive', 'editor-preview'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile },
    { id: 'grid', version: '1.0.0', category: 'layout', target: 'react', slots: contentSlot(contentChildren), schema: CATALOG_COMPONENT_SCHEMAS.grid, capabilities: ['responsive', 'editor-preview'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile },
    { id: 'heading', version: '1.0.0', category: 'content', target: 'react', slots: [], schema: CATALOG_COMPONENT_SCHEMAS.heading, capabilities: ['responsive', 'editor-preview'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile },
    { id: 'text', version: '1.0.0', category: 'content', target: 'react', slots: [], schema: CATALOG_COMPONENT_SCHEMAS.text, capabilities: ['responsive', 'editor-preview'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile },
    { id: 'button', version: '1.0.0', category: 'action', target: 'react', slots: [], schema: CATALOG_COMPONENT_SCHEMAS.button, capabilities: ['keyboard', 'touch', 'editor-preview'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile },
    { id: 'navigation', version: '1.0.0', category: 'navigation', target: 'react', slots: [], schema: CATALOG_COMPONENT_SCHEMAS.navigation, capabilities: ['keyboard', 'touch', 'responsive', 'editor-preview'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile },
    { id: 'cloud-background', version: '1.1.0', category: 'visual', target: 'react', slots: contentSlot(cloudChildren), schema: CATALOG_COMPONENT_SCHEMAS['cloud-background'], capabilities: ['svg', 'motion', 'reduced-motion', 'editor-preview'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile },
    { id: 'sales-chart', version: '1.0.0', category: 'data-visualization', target: 'react', slots: [], schema: CATALOG_COMPONENT_SCHEMAS['sales-chart'], capabilities: ['svg', 'synthetic-data', 'responsive', 'editor-preview'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile },
  ],
  motions: [
    { id: 'fade-in', version: '1.0.0', category: 'entrance', target: 'react', configSchema: CATALOG_MOTION_SCHEMAS['fade-in'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile, reducedMotion: 'disabled' },
    { id: 'slide-up', version: '1.0.0', category: 'entrance', target: 'react', configSchema: CATALOG_MOTION_SCHEMAS['slide-up'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile, reducedMotion: 'disabled' },
    { id: 'slide-down', version: '1.0.0', category: 'entrance', target: 'react', configSchema: CATALOG_MOTION_SCHEMAS['slide-down'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile, reducedMotion: 'disabled' },
    { id: 'fade-slide-down', version: '1.0.0', category: 'entrance', target: 'react', configSchema: CATALOG_MOTION_SCHEMAS['fade-slide-down'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile, reducedMotion: 'disabled' },
    { id: 'fade-slide-up', version: '1.0.0', category: 'entrance', target: 'react', configSchema: CATALOG_MOTION_SCHEMAS['fade-slide-up'], source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile, reducedMotion: 'disabled' },
    { id: 'composed', version: '2.0.0', category: 'composed', target: 'react', configSchema: CATALOG_MOTION_SCHEMAS.composed, source: localSource, license: 'NOASSERTION', dependencies: localDependencies, costProfile, reducedMotion: 'disabled' },
  ],
  designProfile: UNSLOP_PROFILE,
} as const);

export type CatalogComponentId = typeof CATALOG_RELEASE.components[number]['id'];
export type MotionId = typeof CATALOG_RELEASE.motions[number]['id'];
export type MotionPrimitiveProperty = 'opacity' | 'translateX' | 'translateY' | 'scale' | 'rotate' | 'blur';
export type MotionPrimitive = { property: MotionPrimitiveProperty; amplitude: number };
export type CatalogMotion = {
  id: MotionId;
  version: string;
  config: {
    durationMs: number;
    delayMs: number;
    distancePx?: number;
    opacityFrom?: number;
    easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
    repeatCount?: number;
    primitives?: MotionPrimitive[];
  };
};
export type CatalogNode = {
  id: string;
  component: { id: CatalogComponentId; version: string };
  props: Record<string, unknown>;
  slots?: Record<string, CatalogNode[]>;
  motion?: CatalogMotion;
};
export type CatalogPage = { schemaVersion: 1; release: { id: string; version: string }; nodes: CatalogNode[] };
export type ResolvedMotion = { name: 'manifest-fade-in' | 'manifest-slide-up' | 'manifest-slide-down' | 'manifest-fade-slide-up' | 'manifest-fade-slide-down' | 'manifest-composed' | 'none'; durationMs: number; delayMs: number; distancePx: number; opacityFrom: number; easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'; repeatCount?: number; primitives?: MotionPrimitive[] };

const componentIds = new Set<string>(CATALOG_RELEASE.components.map((item) => item.id));
const motionIds = new Set<string>(CATALOG_RELEASE.motions.map((item) => item.id));
const opacityMotionIds = new Set<string>(['fade-in', 'fade-slide-down', 'fade-slide-up']);
const translationMotionIds = new Set<string>(['slide-up', 'slide-down', 'fade-slide-down', 'fade-slide-up']);
const idPattern = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasOnly = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every((key) => keys.includes(key));
function fail(message: string): never { throw new Error(message); }
const text = (value: unknown, min = 1, max = 160): value is string => typeof value === 'string' && value.trim().length >= min && value.length <= max;
const numeric = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

function validateMotionConfig(motionId: string, value: unknown): asserts value is Record<string, unknown> {
  if (motionId === 'composed') {
    if (!isRecord(value) || !hasOnly(value, ['durationMs', 'delayMs', 'easing', 'repeatCount', 'primitives']) ||
      !numeric(value.durationMs, 0, 3000) || !Number.isInteger(value.durationMs) ||
      !numeric(value.delayMs, 0, 2000) || !Number.isInteger(value.delayMs) ||
      !['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].includes(String(value.easing)) ||
      !numeric(value.repeatCount, 1, 4) || !Number.isInteger(value.repeatCount) ||
      !Array.isArray(value.primitives) || value.primitives.length < 1 || value.primitives.length > 6) fail('Configuration de mouvement composé hors limites.');
    const seenProperties = new Set<string>();
    const bounds: Record<MotionPrimitiveProperty, readonly [number, number]> = {
      opacity: [0, 1], translateX: [-40, 40], translateY: [-40, 40], scale: [0.5, 1.5], rotate: [-180, 180], blur: [0, 12],
    };
    for (const primitive of value.primitives) {
      if (!isRecord(primitive) || !hasOnly(primitive, ['property', 'amplitude']) || typeof primitive.property !== 'string' || !Object.hasOwn(bounds, primitive.property) || seenProperties.has(primitive.property)) fail('Primitive de mouvement inconnue ou dupliquée.');
      const [minimum, maximum] = bounds[primitive.property as MotionPrimitiveProperty];
      if (!numeric(primitive.amplitude, minimum, maximum)) fail(`Amplitude hors limites pour ${primitive.property}.`);
      seenProperties.add(primitive.property);
    }
    return;
  }
  if (!isRecord(value) || !hasOnly(value, ['durationMs', 'delayMs', 'distancePx', 'opacityFrom']) || !numeric(value.durationMs, 0, 3000) || !Number.isInteger(value.durationMs) || !numeric(value.delayMs, 0, 2000) || !Number.isInteger(value.delayMs)) fail('Paramètres de mouvement hors limites.');
  const composite = motionId === 'fade-slide-down' || motionId === 'fade-slide-up';
  if (opacityMotionIds.has(motionId)) {
    if ((composite && !numeric(value.opacityFrom, 0, 1)) || (!composite && value.opacityFrom !== undefined && !numeric(value.opacityFrom, 0, 1))) fail('Configuration de fondu invalide.');
  } else if (value.opacityFrom !== undefined) fail('Configuration de translation invalide.');
  if (translationMotionIds.has(motionId)) {
    if ((composite && !numeric(value.distancePx, 0, 40)) || (!composite && value.distancePx !== undefined && !numeric(value.distancePx, 0, 40))) fail('Configuration de translation invalide.');
  } else if (value.distancePx !== undefined) fail('Configuration de fondu invalide.');
}

function validateProps(componentId: string, props: unknown): asserts props is Record<string, unknown> {
  const schema = CATALOG_COMPONENT_SCHEMAS[componentId as keyof typeof CATALOG_COMPONENT_SCHEMAS];
  if (!isRecord(props) || !schema || !hasOnly(props, Object.keys(schema))) fail(`Propriétés inconnues pour ${componentId}.`);
  switch (componentId) {
    case 'section': if (!['default', 'quiet', 'accent'].includes(String(props.variant))) fail('Variante Section invalide.'); break;
    case 'hero': if (!text(props.title, 1, 180) || !text(props.body, 0, 1000)) fail('Réglages Hero invalides.'); break;
    case 'stack':
      if (!['vertical', 'horizontal'].includes(String(props.direction)) || !numeric(props.gap, 0, 64) || !['start', 'center', 'end', 'stretch'].includes(String(props.align))) fail('Réglages Stack invalides.'); break;
    case 'grid': if (!numeric(props.columns, 1, 4) || !Number.isInteger(props.columns) || !numeric(props.gap, 0, 64)) fail('Réglages Grid invalides.'); break;
    case 'heading': if (!text(props.text, 1, 180) || !numeric(props.level, 1, 6) || !Number.isInteger(props.level)) fail('Réglages Heading invalides.'); break;
    case 'text': if (!text(props.text, 0, 1600) || !['body', 'muted', 'eyebrow'].includes(String(props.tone))) fail('Réglages Text invalides.'); break;
    case 'button': if (!text(props.label, 1, 80) || !safeHref(props.href) || !['primary', 'secondary', 'quiet'].includes(String(props.tone))) fail('Réglages Button invalides.'); break;
    case 'navigation': {
      if (!text(props.brand, 1, 60) || !Array.isArray(props.links) || props.links.length > 8) fail('Réglages Navigation invalides.');
      for (const link of props.links) if (!isRecord(link) || !hasOnly(link, ['label', 'href']) || !text(link.label, 1, 60) || !safeHref(link.href)) fail('Lien Navigation invalide.');
      if ((props.primaryLabel !== undefined || props.primaryHref !== undefined) && (!text(props.primaryLabel, 1, 80) || !safeHref(props.primaryHref))) fail('Action Navigation invalide.');
      if (props.mobileMenuMotion !== undefined && !['fade', 'slide-down', 'none'].includes(String(props.mobileMenuMotion))) fail('Animation de menu inconnue.');
      if (props.mobileMenuDurationMs !== undefined && (!numeric(props.mobileMenuDurationMs, 100, 500) || !Number.isInteger(props.mobileMenuDurationMs))) fail('Durée de menu hors limites.');
      break;
    }
    case 'cloud-background':
      if (!['dawn', 'day', 'sunset'].includes(String(props.palette)) || !['low', 'medium', 'high'].includes(String(props.density)) || !numeric(props.speed, 0, 1) || (props.motionSpeedMultiplier !== undefined && !numeric(props.motionSpeedMultiplier, 0.25, 4))) fail('Réglages CloudBackground invalides.'); break;
    case 'sales-chart': {
      if (!text(props.title, 1, 100) || props.dataMode !== 'synthetic' || !['line', 'bar', 'area'].includes(String(props.chartType)) || !Array.isArray(props.series) || props.series.length < 1 || props.series.length > 4) fail('SalesChart accepte uniquement des séries de démonstration synthétiques.');
      let sharedLabels: string[] | undefined;
      for (const series of props.series) {
        if (!isRecord(series) || !hasOnly(series, ['name', 'points']) || !text(series.name, 1, 50) || !Array.isArray(series.points) || series.points.length < 2 || series.points.length > 12) fail('Série de graphique invalide.');
        for (const point of series.points) if (!isRecord(point) || !hasOnly(point, ['label', 'value']) || !text(point.label, 1, 30) || !numeric(point.value, 0, 1_000_000)) fail('Point de graphique invalide.');
        const labels = (series.points as { label: string }[]).map((point) => point.label);
        if (sharedLabels && (labels.length !== sharedLabels.length || labels.some((label, index) => label !== sharedLabels![index]))) fail('Les séries du graphique doivent partager les mêmes catégories dans le même ordre.');
        sharedLabels = labels;
      }
      break;
    }
  }
}

const safeHref = (value: unknown): value is string => typeof value === 'string' && /^\/(?!\/)[A-Za-z0-9/_?#=&.-]*$/.test(value) && !value.includes('..');

function validateNode(value: unknown, depth: number, seen: Set<string>, count: { value: number }): asserts value is CatalogNode {
  if (depth > 8) fail('La composition dépasse huit niveaux.');
  if (!isRecord(value) || !hasOnly(value, ['id', 'component', 'props', 'slots', 'motion']) || !idPattern.test(String(value.id))) fail('Bloc de catalogue invalide.');
  count.value++;
  if (count.value > 100) fail('La composition dépasse 100 blocs.');
  if (seen.has(String(value.id))) fail('Identifiant de bloc dupliqué.');
  seen.add(String(value.id));
  const component = value.component;
  if (!isRecord(component) || !hasOnly(component, ['id', 'version'])) fail('Composant absent du catalogue local.');
  if (typeof component.id !== 'string' || !componentIds.has(component.id)) fail('Composant absent du catalogue local.');
  const definition = CATALOG_RELEASE.components.find((item) => item.id === component.id);
  if (!definition || component.version !== definition.version) fail('Version de composant inconnue ou non installée.');
  validateProps(definition.id, value.props);
  const slots = value.slots ?? {};
  const allowedSlotIds = definition.slots.map((slot) => slot.id);
  if (!isRecord(slots) || !hasOnly(slots, allowedSlotIds) || definition.slots.some((slot) => slot.required && !Array.isArray(slots[slot.id]))) fail(`Slot invalide pour ${definition.id}.`);
  for (const [slotId, children] of Object.entries(slots)) {
    if (!Array.isArray(children)) fail('Le slot doit contenir une liste.');
    const slot = definition.slots.find((candidate) => candidate.id === slotId);
    for (const child of children) {
      const childComponentId = isRecord(child) && isRecord(child.component) ? child.component.id : undefined;
      if (typeof childComponentId === 'string' && slot && !slot.accepts.includes(childComponentId) && !slot.accepts.includes('*')) fail(`Type enfant non admis dans ${definition.id}.${slotId}.`);
      validateNode(child, depth + 1, seen, count);
    }
  }
  const motionValue = value.motion;
  if (motionValue !== undefined) {
    if (!isRecord(motionValue) || !hasOnly(motionValue, ['id', 'version', 'config'])) fail('Préréglage de mouvement absent du catalogue.');
    if (typeof motionValue.id !== 'string' || !motionIds.has(motionValue.id)) fail('Préréglage de mouvement absent du catalogue.');
    const motion = CATALOG_RELEASE.motions.find((item) => item.id === motionValue.id);
    if (!motion || motion.version !== motionValue.version) fail('Version de mouvement inconnue.');
    validateMotionConfig(motionValue.id, motionValue.config);
  }
}

export function validateCatalogPage(value: unknown): asserts value is CatalogPage {
  if (!isRecord(value) || !hasOnly(value, ['schemaVersion', 'release', 'nodes']) || value.schemaVersion !== 1) fail('Version de page catalogue invalide.');
  if (!isRecord(value.release) || !hasOnly(value.release, ['id', 'version']) || value.release.id !== CATALOG_RELEASE.id || value.release.version !== CATALOG_RELEASE.version) fail('Release catalogue absente ou incompatible.');
  if (!Array.isArray(value.nodes) || value.nodes.length > 30) fail('Liste de blocs invalide.');
  const seen = new Set<string>(), count = { value: 0 };
  for (const node of value.nodes) validateNode(node, 1, seen, count);
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > 128 * 1024) fail('Page catalogue trop volumineuse (128 Ko UTF-8 maximum).');
}

export function resolveMotion(motion: CatalogMotion | undefined, prefersReducedMotion: boolean): ResolvedMotion {
  if (!motion || prefersReducedMotion) return { name: 'none', durationMs: 0, delayMs: 0, distancePx: 0, opacityFrom: 1 };
  if (!motionIds.has(motion.id)) fail('Préréglage de mouvement absent du catalogue.');
  const definition = CATALOG_RELEASE.motions.find((item) => item.id === motion.id);
  if (!definition || definition.version !== motion.version) fail('Version de mouvement inconnue.');
  const config = motion.config;
  validateMotionConfig(motion.id, config);
  if (motion.id === 'composed') {
    return {
      name: 'manifest-composed', durationMs: config.durationMs, delayMs: config.delayMs, distancePx: 0, opacityFrom: 1,
      easing: config.easing as ResolvedMotion['easing'], repeatCount: config.repeatCount as number,
      primitives: config.primitives as MotionPrimitive[],
    };
  }
  const names: Record<MotionId, ResolvedMotion['name']> = {
    'fade-in': 'manifest-fade-in', 'slide-up': 'manifest-slide-up', 'slide-down': 'manifest-slide-down',
    'fade-slide-down': 'manifest-fade-slide-down', 'fade-slide-up': 'manifest-fade-slide-up', composed: 'manifest-composed',
  };
  const name = names[motion.id];
  return {
    name,
    durationMs: config.durationMs,
    delayMs: config.delayMs,
    distancePx: numeric(config.distancePx, 0, 40) ? config.distancePx : 12,
    opacityFrom: opacityMotionIds.has(motion.id) && numeric(config.opacityFrom, 0, 1) ? config.opacityFrom : 1,
  };
}

type NodeProps = Record<string, unknown>;
export type CatalogRenderOptions = { prefersReducedMotion?: boolean };

function animationStyle(motion: CatalogMotion | undefined, reduced: boolean): { className: string; style?: CSSProperties } {
  const resolved = resolveMotion(motion, reduced);
  if (resolved.name === 'none') return { className: '' };
  if (resolved.name === 'manifest-composed') {
    const amplitudes = Object.fromEntries((resolved.primitives ?? []).map(({ property, amplitude }) => [property, amplitude]));
    return {
      className: 'manifest-motion manifest-motion--composed',
      style: {
        '--manifest-motion-duration': `${resolved.durationMs}ms`,
        '--manifest-motion-delay': `${resolved.delayMs}ms`,
        '--manifest-motion-easing': resolved.easing,
        '--manifest-motion-repeat': resolved.repeatCount,
        '--manifest-motion-opacity-from': amplitudes.opacity ?? 1,
        '--manifest-motion-x-from': `${amplitudes.translateX ?? 0}px`,
        '--manifest-motion-y-from': `${amplitudes.translateY ?? 0}px`,
        '--manifest-motion-scale-from': amplitudes.scale ?? 1,
        '--manifest-motion-rotate-from': `${amplitudes.rotate ?? 0}deg`,
        '--manifest-motion-blur-from': `${amplitudes.blur ?? 0}px`,
      } as CSSProperties,
    };
  }
  return {
    className: `manifest-motion manifest-motion--${resolved.name.slice('manifest-'.length)}`,
    style: { '--manifest-motion-duration': `${resolved.durationMs}ms`, '--manifest-motion-delay': `${resolved.delayMs}ms`, '--manifest-motion-distance': `${resolved.distancePx}px`, '--manifest-motion-opacity': resolved.opacityFrom } as CSSProperties,
  };
}

function renderComponent(node: CatalogNode, options: CatalogRenderOptions, children: Record<string, ReactNode[]>): ReactNode {
  const p = node.props as NodeProps, content = children.content ?? [], anim = animationStyle(node.motion, Boolean(options.prefersReducedMotion));
  const common = { key: node.id, className: anim.className || undefined, style: anim.style };
  switch (node.component.id) {
    case 'section': return createElement('section', { ...common, className: `manifest-section manifest-section--${p.variant} ${anim.className}`.trim() }, ...content);
    case 'hero': return createElement('section', { ...common, className: `manifest-hero ${anim.className}`.trim() }, createElement('h1', null, p.title as string), createElement('p', null, p.body as string), ...content);
    case 'stack': return createElement('div', { ...common, className: `manifest-stack manifest-stack--${p.direction} ${anim.className}`.trim(), style: { ...anim.style, '--manifest-gap': `${p.gap}px`, '--manifest-align': p.align } as CSSProperties }, ...content);
    case 'grid': return createElement('div', { ...common, className: `manifest-grid ${anim.className}`.trim(), style: { ...anim.style, '--manifest-columns': p.columns, '--manifest-gap': `${p.gap}px` } as CSSProperties }, ...content);
    case 'heading': return createElement(`h${p.level}`, common, p.text as string);
    case 'text': return createElement('p', { ...common, className: `manifest-text manifest-text--${p.tone} ${anim.className}`.trim() }, p.text as string);
    case 'button': return createElement('a', { ...common, className: `manifest-button manifest-button--${p.tone} ${anim.className}`.trim(), href: p.href as string }, p.label as string);
    case 'navigation': return createElement('nav', { ...common, className: `manifest-navigation ${anim.className}`.trim(), 'aria-label': 'Navigation principale' },
      createElement('a', { href: '/', className: 'manifest-navigation__brand' }, p.brand as string),
      createElement('details', { className: 'manifest-navigation__menu', 'data-motion': options.prefersReducedMotion ? 'none' : p.mobileMenuMotion ?? 'slide-down', style: { '--manifest-menu-duration': `${p.mobileMenuDurationMs ?? 240}ms` } as CSSProperties },
        createElement('summary', { className: 'manifest-navigation__toggle' }, createElement('span', null, 'Menu'), createElement('span', { className: 'manifest-navigation__chevron', 'aria-hidden': true })),
        createElement('ul', null, ...(p.links as { label: string; href: string }[]).map((link, i) => createElement('li', { key: `${node.id}-link-${i}` }, createElement('a', { href: link.href }, link.label))))),
      p.primaryLabel ? createElement('a', { href: p.primaryHref as string, className: 'manifest-button manifest-button--primary' }, p.primaryLabel as string) : null);
    case 'cloud-background': {
      const speedMultiplier = Number(p.motionSpeedMultiplier ?? 1);
      const baseDuration = Math.max(5, 32 - Number(p.speed) * 20);
      const cloudDuration = Math.max(5, Math.round((baseDuration / speedMultiplier) * 100) / 100);
      const slowCloudDuration = Math.max(5, Math.round((cloudDuration * 1.26) * 100) / 100);
      return createElement('section', { ...common, className: `manifest-clouds manifest-clouds--${p.palette} manifest-clouds--${p.density} ${options.prefersReducedMotion ? 'manifest-clouds--reduced' : ''} ${anim.className}`.trim(), style: { ...anim.style, '--manifest-cloud-speed': `${cloudDuration}s`, '--manifest-cloud-speed-slow': `${slowCloudDuration}s` } as CSSProperties },
      createElement('svg', { className: 'manifest-clouds__art', viewBox: '0 0 1200 340', preserveAspectRatio: 'xMidYMid slice', role: 'img', 'aria-label': 'Nuages stylisés au-dessus de l’horizon' },
        createElement('circle', { cx: '950', cy: '125', r: '64', className: 'manifest-clouds__sun' }),
        createElement('g', { className: 'manifest-clouds__cloud manifest-clouds__cloud--one' }, createElement('ellipse', { cx: '240', cy: '100', rx: '90', ry: '24' }), createElement('circle', { cx: '205', cy: '89', r: '30' }), createElement('circle', { cx: '244', cy: '76', r: '39' }), createElement('circle', { cx: '280', cy: '91', r: '28' })),
        createElement('g', { className: 'manifest-clouds__cloud manifest-clouds__cloud--two' }, createElement('ellipse', { cx: '720', cy: '145', rx: '72', ry: '20' }), createElement('circle', { cx: '694', cy: '135', r: '25' }), createElement('circle', { cx: '727', cy: '125', r: '32' }), createElement('circle', { cx: '755', cy: '138', r: '23' })),
        createElement('path', { d: 'M0 250 Q120 215 250 248 T520 238 T790 252 T1050 226 T1200 246 V340 H0Z', className: 'manifest-clouds__horizon' })),
      createElement('div', { className: 'manifest-clouds__content' }, ...content));
    }
    case 'sales-chart': return renderSalesChart(node, p, anim);
  }
}

function renderSalesChart(node: CatalogNode, p: NodeProps, anim: { className: string; style?: CSSProperties }): ReactNode {
  const series = p.series as { name: string; points: { label: string; value: number }[] }[];
  const colors = ['#31a7a0', '#8a78dd', '#d98563', '#4774c7'];
  const maxValue = Math.max(1, ...series.flatMap((item) => item.points.map((point) => point.value)));
  const marks = series.map((item, seriesIndex) => {
    const points = item.points.map((point, index) => {
      const x = item.points.length < 2 ? 0 : index * (600 / (item.points.length - 1));
      const y = 180 - (point.value / maxValue) * 150;
      return { x, y, value: point.value };
    });
    const stroke = colors[seriesIndex]!;
    if (p.chartType === 'bar') {
      const cell = 600 / item.points.length, barWidth = Math.max(4, Math.min(28, cell / (series.length + 1)));
      return createElement('g', { key: `${node.id}-series-${seriesIndex}`, fill: stroke }, ...points.map((point, index) => createElement('rect', { key: `${node.id}-${seriesIndex}-${index}`, x: index * cell + (seriesIndex * barWidth) + (cell - (barWidth * series.length)) / 2, y: point.y, width: barWidth - 3, height: 180 - point.y, rx: 3 })));
    }
    const line = points.map((point) => `${point.x},${point.y}`).join(' ');
    if (p.chartType === 'area') return createElement('polygon', { key: `${node.id}-series-${seriesIndex}`, points: `0,180 ${line} 600,180`, fill: stroke, fillOpacity: '.16', stroke, strokeWidth: '3', strokeLinejoin: 'round' });
    return createElement('polyline', { key: `${node.id}-series-${seriesIndex}`, points: line, fill: 'none', stroke, strokeWidth: '4', strokeLinecap: 'round', strokeLinejoin: 'round' });
  });
  const first = series[0]!.points;
  const labelNodes = first.map((point, index) => createElement('text', { key: `${node.id}-label-${index}`, x: first.length < 2 ? 0 : index * (600 / (first.length - 1)), y: 215, textAnchor: 'middle', className: 'manifest-chart__axis-label' }, point.label));
  return createElement('figure', { className: `manifest-chart ${anim.className}`.trim(), style: anim.style },
    createElement('figcaption', { className: 'manifest-chart__heading' }, createElement('span', null, p.title as string), createElement('small', null, 'Données de démonstration')),
    createElement('svg', { viewBox: '0 0 600 230', role: 'img', 'aria-labelledby': `${node.id}-title ${node.id}-desc` },
      createElement('title', { id: `${node.id}-title` }, p.title as string),
      createElement('desc', { id: `${node.id}-desc` }, `Graphique ${p.chartType}; données de démonstration synthétiques. ${series.map((item) => `${item.name} : ${item.points.map((point) => `${point.label}, ${point.value}`).join('; ')}.`).join(' ')}`),
      createElement('path', { d: 'M0 180 H600 M0 130 H600 M0 80 H600 M0 30 H600', className: 'manifest-chart__grid' }),
      ...marks,
      ...labelNodes),
    createElement('ul', { className: 'manifest-chart__legend' }, ...series.map((item, index) => createElement('li', { key: `${node.id}-legend-${index}` }, createElement('span', { className: 'manifest-chart__legend-marker', style: { backgroundColor: colors[index] }, 'aria-hidden': true }), item.name))));
}

export function renderCatalogNode(node: CatalogNode, options: CatalogRenderOptions = {}): ReactNode {
  return renderCatalogNodeWithOptions(node, options);
}

export function renderCatalogPage(page: CatalogPage, options: CatalogRenderOptions = {}): ReactNode {
  validateCatalogPage(page);
  return createElement('div', { className: 'manifest-page' }, ...page.nodes.map((node) => renderCatalogNodeWithOptions(node, options)));
}

function renderCatalogNodeWithOptions(node: CatalogNode, options: CatalogRenderOptions): ReactNode {
  validateCatalogPage({ schemaVersion: 1, release: { id: CATALOG_RELEASE.id, version: CATALOG_RELEASE.version }, nodes: [node] });
  const children = Object.fromEntries(Object.entries(node.slots ?? {}).map(([slot, value]) => [slot, value.map((child) => renderCatalogNodeWithOptions(child, options))]));
  return renderComponent(node, options, children);
}

export const catalogLibraryInventory = [
  ['Three.js', '3D runtime', 'three'], ['React Three Fiber', 'React 3D renderer', '@react-three/fiber'], ['React Three Drei', '3D helpers', '@react-three/drei'], ['React Three Postprocessing', '3D postprocessing', '@react-three/postprocessing'], ['React Three Rapier', 'physics engine', '@react-three/rapier'], ['React Three XR', 'XR runtime', '@react-three/xr'], ['Babylon.js', '3D runtime', '@babylonjs/core'], ['react-babylonjs', 'React 3D adapter', 'react-babylonjs'], ['Spline', 'scene authoring/runtime service', 'Spline'], ['@splinetool/react-spline', '3D runtime adapter', '@splinetool/react-spline'], ['OGL', 'WebGL runtime', 'ogl'],
  ['GSAP', 'animation engine', 'gsap'], ['GSAP ScrollTrigger', 'scroll animation plugin', 'gsap/ScrollTrigger'], ['Motion (Framer Motion)', 'React animation engine', 'motion'], ['React Spring', 'React animation engine', '@react-spring/web'], ['@react-spring/three', '3D animation adapter', '@react-spring/three'], ['Lenis', 'smooth scroll engine', 'lenis'], ['Theatre.js', 'animation authoring/runtime', '@theatre/core'], ['Anime.js', 'animation engine', 'animejs'], ['Motion One', 'legacy animation family', '@motionone/dom'],
  ['React Bits', 'component source collection', 'React Bits'], ['Aceternity UI', 'component source collection', 'Aceternity UI'], ['Magic UI', 'component source collection', 'magicui'], ['shadcn/ui', 'component source distribution', 'shadcn'], ['Motion Primitives', 'component source collection', 'motion-primitives'], ['React Parallax Tilt', 'React tilt effect', 'react-parallax-tilt'], ['Vanilla Tilt', 'DOM tilt effect', 'vanilla-tilt'], ['tsParticles', 'particle effect runtime', '@tsparticles/react'], ['Vanta.js', 'WebGL background effects', 'vanta'], ['Curtains.js', 'WebGL media effects', 'curtainsjs'], ['Atropos', 'parallax effect', 'atropos'],
  ['GLTFJSX', 'asset conversion pipeline', 'gltfjsx'], ['gltf-transform', 'asset optimization pipeline', '@gltf-transform/core'], ['gltfpack', 'asset optimization tool', 'gltfpack'], ['Draco', 'geometry compression library', 'draco3d'], ['Meshopt', 'mesh optimization library', 'meshoptimizer'], ['Blender', 'desktop asset authoring tool', 'Blender'], ['Spline Editor', 'scene authoring tool', 'Spline Editor'], ['Sketchfab', 'asset discovery/service', 'Sketchfab'],
].map(([name, role, packageName]) => deepFreeze({
  name,
  role,
  packageIdentifierCandidate: packageName,
  packageIdentifierStatus: 'unverified',
  discoveredIn: 'user-supplied-reference-images',
  installedVersion: null,
  versionStatus: 'not-installed',
  license: 'unverified',
  sourceStatus: 'candidate-not-audited',
  admitted: false as const,
}));

export async function catalogMetadataDigest(): Promise<string> {
  const serializable = JSON.stringify(CATALOG_RELEASE);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(serializable));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
