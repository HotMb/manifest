import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderCatalogPage, validateCatalogPage, type CatalogPage } from '../../packages/catalog/src/index.ts';

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL('../fixtures/catalog/sales-dashboard.json', import.meta.url)), 'utf8')) as CatalogPage;
const catalogStyles = readFileSync(fileURLToPath(new URL('../../packages/catalog/src/styles.css', import.meta.url)), 'utf8');

function composedCatalogMarkup() {
  const page = structuredClone(fixture);
  const chart = page.nodes.find((node) => node.component.id === 'sales-chart');
  if (!chart) throw new Error('La fixture doit contenir un graphique de ventes.');
  chart.motion = {
    id: 'composed',
    version: '2.0.0',
    config: {
      durationMs: 1000,
      delayMs: 50,
      easing: 'ease-in-out',
      repeatCount: 3,
      primitives: [
        { property: 'opacity', amplitude: 0 },
        { property: 'translateX', amplitude: -24 },
        { property: 'translateY', amplitude: 16 },
        { property: 'scale', amplitude: 0.9 },
        { property: 'rotate', amplitude: 5 },
        { property: 'blur', amplitude: 4 },
      ],
    },
  };
  validateCatalogPage(page);
  return renderToStaticMarkup(renderCatalogPage(page));
}

test('Chromium rend une animation catalogue composée et réduit son mouvement hors aperçu', async ({ page }) => {
  const rendered = composedCatalogMarkup();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${catalogStyles}</style></head><body>
    <main id="outside-preview">${rendered}</main>
    <main id="preview" class="catalog-canvas">${rendered}</main>
  </body></html>`);

  const animatedChart = page.locator('#outside-preview .manifest-motion--composed').first();
  await expect(animatedChart).toHaveCSS('animation-name', 'manifest-composed');
  await expect(animatedChart).toHaveCSS('animation-duration', '1s');
  await expect(animatedChart).toHaveCSS('animation-delay', '0.05s');
  await expect(animatedChart).toHaveCSS('animation-timing-function', 'ease-in-out');
  await expect(animatedChart).toHaveCSS('animation-iteration-count', '3');

  const keyframeStates = await animatedChart.evaluate((element) => {
    const animation = element.getAnimations()[0];
    if (!animation) throw new Error('L’animation CSS composée doit être active dans Chromium.');
    animation.pause();
    animation.currentTime = 0;
    const read = () => {
      const style = getComputedStyle(element);
      const matrix = new DOMMatrixReadOnly(style.transform);
      return {
        opacity: Number(style.opacity),
        x: matrix.m41,
        y: matrix.m42,
        scale: Math.hypot(matrix.m11, matrix.m12),
        rotationDegrees: Math.atan2(matrix.m12, matrix.m11) * (180 / Math.PI),
        filter: style.filter,
      };
    };
    const initial = read();
    animation.currentTime = 3050;
    const final = read();
    animation.cancel();
    return { initial, final };
  });
  expect(keyframeStates.initial.opacity).toBeCloseTo(0, 4);
  expect(keyframeStates.initial.x).toBeCloseTo(-24, 2);
  expect(keyframeStates.initial.y).toBeCloseTo(16, 2);
  expect(keyframeStates.initial.scale).toBeCloseTo(0.9, 2);
  expect(keyframeStates.initial.rotationDegrees).toBeCloseTo(5, 1);
  expect(keyframeStates.initial.filter).toMatch(/blur\(4px\)/);
  expect(keyframeStates.final.opacity).toBeCloseTo(1, 4);
  expect(keyframeStates.final.x).toBeCloseTo(0, 2);
  expect(keyframeStates.final.y).toBeCloseTo(0, 2);
  expect(keyframeStates.final.scale).toBeCloseTo(1, 2);
  expect(keyframeStates.final.rotationDegrees).toBeCloseTo(0, 1);
  expect(keyframeStates.final.filter).toMatch(/blur\(0(?:px)?\)/);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedOutside = page.locator('#outside-preview .manifest-motion--composed').first();
  const reducedPreview = page.locator('#preview .manifest-motion--composed').first();
  await expect(reducedOutside).toHaveCSS('animation-name', 'none');
  await expect(reducedPreview).toHaveCSS('animation-name', 'none');

  await page.locator('#preview').evaluate((element) => element.setAttribute('data-motion-preview', 'enabled'));
  await expect(reducedPreview).toHaveCSS('animation-name', 'manifest-composed');
  await expect(reducedOutside).toHaveCSS('animation-name', 'none');
});
