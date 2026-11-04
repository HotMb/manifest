import { CATALOG_RELEASE, validateCatalogPage, type CatalogPage, type MotionId } from './index.ts';

export type SalesDashboardRecipeOptions = {
  pageTitle?: string;
  cloudPalette?: 'dawn' | 'day' | 'sunset';
  cloudDensity?: 'low' | 'medium' | 'high';
  cloudSpeed?: number;
  chartType?: 'line' | 'bar' | 'area';
  motion?: {
    id?: MotionId;
    durationMs?: number;
    delayMs?: number;
    distancePx?: number;
    opacityFrom?: number;
    /** Multiplier: 1.5 means 50% faster, 0.5 means half speed. */
    speed?: number;
  };
};

const clampNumber = (value: number | undefined, min: number, max: number, fallback: number, decimals = 2): number => {
  if (!Number.isFinite(value)) return fallback;
  const scale = 10 ** decimals;
  return Math.min(max, Math.max(min, Math.round(value! * scale) / scale));
};
const clampInteger = (value: number | undefined, min: number, max: number, fallback: number): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value!))) : fallback;

function motionPreset(options: SalesDashboardRecipeOptions['motion'], defaults: { id: MotionId; durationMs: number; delayMs: number; distancePx?: number; opacityFrom?: number }) {
  const id = options?.id ?? defaults.id;
  const speed = clampNumber(options?.speed, 0.25, 4, 1);
  const durationMs = clampInteger(options?.durationMs, 0, 3000, defaults.durationMs);
  const config = {
    durationMs: clampInteger(durationMs / speed, 0, 3000, defaults.durationMs),
    delayMs: clampInteger(options?.delayMs, 0, 2000, defaults.delayMs),
    ...(id === 'fade-in' || id.startsWith('fade-slide-')
      ? { opacityFrom: clampNumber(options?.opacityFrom, 0, 1, defaults.opacityFrom ?? 0) }
      : {}),
    ...(id !== 'fade-in'
      ? { distancePx: clampNumber(options?.distancePx, 0, 40, defaults.distancePx ?? 14) }
      : {}),
  };
  return { id, version: CATALOG_RELEASE.motions.find((item) => item.id === id)!.version, config };
}

/**
 * Creates the first local sales-dashboard composition. All blocks, props and
 * motion presets are resolved against the current local catalogue release.
 */
export function createSalesDashboardRecipe(options: SalesDashboardRecipeOptions = {}): CatalogPage {
  const pageTitle = options.pageTitle?.trim().slice(0, 100) || 'Ventes du mois';
  const cloudSpeed = clampNumber(options.cloudSpeed, 0, 1, 0.45);
  const chartType = options.chartType ?? 'line';
  const requestedChartMotion = motionPreset(options.motion, { id: 'fade-slide-down', durationMs: 560, delayMs: 90, distancePx: 14, opacityFrom: 0 });
  const cloudMotion = motionPreset(undefined, { id: 'fade-in', durationMs: 680, delayMs: 0, opacityFrom: 0 });

  const page: CatalogPage = {
    schemaVersion: 1,
    release: { id: CATALOG_RELEASE.id, version: CATALOG_RELEASE.version },
    nodes: [
      {
        id: 'navigation-main',
        component: { id: 'navigation', version: '1.0.0' },
        props: {
          brand: 'Studio',
          links: [{ label: 'Rapport', href: '/rapport' }, { label: 'Tendances', href: '/tendances' }],
          primaryLabel: 'Exporter',
          primaryHref: '/export',
          mobileMenuMotion: 'slide-down',
          mobileMenuDurationMs: 240,
        },
      },
      {
        id: 'cloud-cover',
        component: { id: 'cloud-background', version: '1.1.0' },
        props: { palette: options.cloudPalette ?? 'sunset', density: options.cloudDensity ?? 'medium', speed: cloudSpeed, motionSpeedMultiplier: clampNumber(options.motion?.speed, 0.25, 4, 1) },
        motion: cloudMotion,
        slots: {
          content: [
            { id: 'headline', component: { id: 'heading', version: '1.0.0' }, props: { text: pageTitle, level: 1 } },
            { id: 'intro', component: { id: 'text', version: '1.0.0' }, props: { text: 'Un aperçu synthétique des commandes et des revenus.', tone: 'body' } },
          ],
        },
      },
      {
        id: 'sales-chart-revenue',
        component: { id: 'sales-chart', version: '1.0.0' },
        props: {
          title: 'Chiffre d’affaires',
          dataMode: 'synthetic',
          chartType,
          series: [{ name: 'Ventes', points: [{ label: 'Jan', value: 14 }, { label: 'Fév', value: 21 }, { label: 'Mar', value: 18 }, { label: 'Avr', value: 32 }, { label: 'Mai', value: 37 }, { label: 'Juin', value: 42 }] }],
        },
        motion: structuredClone(requestedChartMotion),
      },
      {
        id: 'sales-chart-orders',
        component: { id: 'sales-chart', version: '1.0.0' },
        props: {
          title: 'Commandes',
          dataMode: 'synthetic',
          chartType,
          series: [{ name: 'Commandes', points: [{ label: 'Jan', value: 34 }, { label: 'Fév', value: 46 }, { label: 'Mar', value: 41 }, { label: 'Avr', value: 59 }, { label: 'Mai', value: 63 }, { label: 'Juin', value: 71 }] }],
        },
        motion: { ...structuredClone(requestedChartMotion), config: { ...requestedChartMotion.config, delayMs: clampInteger(requestedChartMotion.config.delayMs + 100, 0, 2000, 190) } },
      },
    ],
  };
  validateCatalogPage(page);
  return page;
}
