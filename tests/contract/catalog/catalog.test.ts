import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { CATALOG_RELEASE, catalogLibraryInventory, catalogMetadataDigest, renderCatalogPage, resolveMotion, UNSLOP_PROFILE, validateCatalogPage, type CatalogPage } from '../../../packages/catalog/src/index.ts';
import { createSalesDashboardRecipe } from '../../../packages/catalog/src/recipes.ts';

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL('../../fixtures/catalog/sales-dashboard.json', import.meta.url)), 'utf8')) as CatalogPage;
const clone = () => structuredClone(fixture);

test('valide et rend le dashboard synthétique, le menu et le fond nuageux', () => {
  assert.doesNotThrow(() => validateCatalogPage(fixture));
  const html = renderToStaticMarkup(renderCatalogPage(fixture));
  assert.match(html, /Navigation principale/);
  assert.match(html, /<summary[^>]*class="manifest-navigation__toggle"/);
  assert.match(html, /data-motion="slide-down"/);
  assert.match(html, /Nuages stylisés/);
  assert.match(html, /Données de démonstration/);
  assert.match(html, /Ventes du mois/);
  assert.match(html, /manifest-motion--fade-in/);
});

test('rejette une référence de composant ou une release inconnue', () => {
  const unknownComponent = clone();
  unknownComponent.nodes[0]!.component.id = 'foreign-code';
  assert.throws(() => validateCatalogPage(unknownComponent), /absent du catalogue/);
  const unknownVersion = clone();
  unknownVersion.nodes[0]!.component.version = '99.0.0';
  assert.throws(() => validateCatalogPage(unknownVersion), /Version de composant inconnue/);
  const unknownRelease = clone();
  unknownRelease.release.version = '9.0.0';
  assert.throws(() => validateCatalogPage(unknownRelease), /Release catalogue absente/);
});

test('rejette les propriétés, URLs, graphes et animations hors limites', () => {
  const extraProp = clone();
  (extraProp.nodes[0]!.props as Record<string, unknown>).componentCode = '<script />';
  assert.throws(() => validateCatalogPage(extraProp), /Propriétés inconnues/);
  const externalLink = clone();
  ((externalLink.nodes[0]!.props.links as { href: string }[])[0]!).href = 'javascript:alert(1)';
  assert.throws(() => validateCatalogPage(externalLink), /Lien Navigation invalide/);
  const remoteData = clone();
  (remoteData.nodes[2]!.props as Record<string, unknown>).dataMode = 'connected';
  assert.throws(() => validateCatalogPage(remoteData), /uniquement des séries de démonstration/);
  const tooMuchMotion = clone();
  tooMuchMotion.nodes[1]!.motion!.config.durationMs = 10000;
  assert.throws(() => validateCatalogPage(tooMuchMotion), /hors limites/);
  const tooFastClouds = clone();
  (tooFastClouds.nodes[1]!.props as Record<string, unknown>).motionSpeedMultiplier = 4.1;
  assert.throws(() => validateCatalogPage(tooFastClouds), /Réglages CloudBackground invalides/);
  const unknownMotion = clone();
  (unknownMotion.nodes[1]!.motion as { id: string }).id = 'bounce-arbitrary';
  assert.throws(() => validateCatalogPage(unknownMotion), /mouvement absent/);
  const wrongChild = clone();
  wrongChild.nodes[1]!.slots!.content!.push({ id: 'nested-cloud', component: { id: 'cloud-background', version: '1.1.0' }, props: { palette: 'day', density: 'low', speed: 0 } });
  assert.throws(() => validateCatalogPage(wrongChild), /Type enfant non admis/);
});

test('le mouvement réduit neutralise animation, délai et translation', () => {
  const motion = fixture.nodes[2]!.motion!;
  assert.deepEqual(resolveMotion(motion, true), { name: 'none', durationMs: 0, delayMs: 0, distancePx: 0, opacityFrom: 1 });
  assert.equal(resolveMotion(motion, false).name, 'manifest-fade-slide-down');
});

test('le rendu peut neutraliser le mouvement pour une préférence système réduite', () => {
  const html = renderToStaticMarkup(renderCatalogPage(fixture, { prefersReducedMotion: true }));
  assert.doesNotMatch(html, /manifest-motion--fade-in/);
  assert.doesNotMatch(html, /manifest-motion--slide-up/);
  assert.doesNotMatch(html, /manifest-motion--fade-slide-down/);
  assert.match(html, /manifest-clouds--reduced/);
  assert.match(html, /data-motion="none"/);
});

test('le preset composé anime les charts dans les deux directions, borne ses paramètres et suit la vitesse des nuages', () => {
  const fast = createSalesDashboardRecipe({ motion: { id: 'fade-slide-down', speed: 1.5 } });
  const chart = fast.nodes.find((node) => node.component.id === 'sales-chart')!;
  assert.equal(chart.motion?.id, 'fade-slide-down');
  assert.deepEqual(chart.motion?.config, { durationMs: 373, delayMs: 90, distancePx: 14, opacityFrom: 0 });
  assert.equal((fast.nodes.find((node) => node.id === 'cloud-cover')!.props as Record<string, unknown>).motionSpeedMultiplier, 1.5);
  const renderedFast = renderToStaticMarkup(renderCatalogPage(fast));
  assert.match(renderedFast, /manifest-motion--fade-slide-down/);
  assert.match(renderedFast, /--manifest-cloud-speed:15\.33s/);

  const slow = createSalesDashboardRecipe({ motion: { id: 'fade-slide-up', speed: 0.5, opacityFrom: 0.3, distancePx: 20 } });
  const slowChart = slow.nodes.find((node) => node.component.id === 'sales-chart')!;
  assert.equal(resolveMotion(slowChart.motion, false).name, 'manifest-fade-slide-up');
  assert.equal(slowChart.motion?.config.durationMs, 1120);
  assert.equal(slowChart.motion?.config.opacityFrom, 0.3);
  assert.equal(slowChart.motion?.config.distancePx, 20);
  assert.equal(resolveMotion(slowChart.motion, true).name, 'none');

  const outOfRange = clone();
  outOfRange.nodes[2]!.motion = { ...outOfRange.nodes[2]!.motion!, id: 'fade-slide-down', config: { durationMs: 560, delayMs: 90, distancePx: 41, opacityFrom: 0 } };
  assert.throws(() => validateCatalogPage(outOfRange), /translation invalide/);
  const missingOpacity = clone();
  missingOpacity.nodes[2]!.motion = { ...missingOpacity.nodes[2]!.motion!, id: 'fade-slide-up', config: { durationMs: 560, delayMs: 90, distancePx: 14 } };
  assert.throws(() => validateCatalogPage(missingOpacity), /fondu invalide/);
});

test('les presets de translation seuls ne font pas varier l’opacité', () => {
  for (const id of ['slide-up', 'slide-down'] as const) {
    const page = createSalesDashboardRecipe({ motion: { id } });
    const chart = page.nodes.find((node) => node.component.id === 'sales-chart')!;
    const resolved = resolveMotion(chart.motion, false);
    assert.equal(chart.motion?.id, id);
    assert.equal(resolved.opacityFrom, 1);
    const html = renderToStaticMarkup(renderCatalogPage(page));
    const slideTag = html.match(new RegExp(`<figure class="manifest-chart manifest-motion manifest-motion--${id}"[^>]*>`))?.[0];
    assert.ok(slideTag);
    assert.match(slideTag, /--manifest-motion-opacity:1/);
  }
});

test('le type de graphique choisit un rendu SVG distinct', () => {
  const bar = clone();
  (bar.nodes[2]!.props as Record<string, unknown>).chartType = 'bar';
  assert.match(renderToStaticMarkup(renderCatalogPage(bar)), /<rect/);
  const area = clone();
  (area.nodes[2]!.props as Record<string, unknown>).chartType = 'area';
  assert.match(renderToStaticMarkup(renderCatalogPage(area)), /<polygon/);
});

test('les séries partagent les catégories, ont une couleur distincte et exposent leurs valeurs', () => {
  const multi = clone();
  const chart = multi.nodes[2]!;
  const props = chart.props as Record<string, unknown>;
  const base = props.series as { name: string; points: { label: string; value: number }[] }[];
  props.series = [base[0], ...['Objectif', 'Marge', 'Retours'].map((name, seriesIndex) => ({ name, points: base[0]!.points.map((point, index) => ({ ...point, value: point.value + (seriesIndex + 1) * (index + 2) })) }))];
  const html = renderToStaticMarkup(renderCatalogPage(multi));
  assert.match(html, /#d98563/);
  assert.match(html, /#4774c7/);
  assert.match(html, /Jan, 14/);
  assert.match(html, /manifest-chart__legend-marker/);

  (props.series as { name: string; points: { label: string; value: number }[] }[])[1]!.points[0]!.label = 'Autre période';
  assert.throws(() => validateCatalogPage(multi), /mêmes catégories/);
});

test('la limite du document mesure les octets UTF-8', () => {
  const largeUnicode = clone();
  largeUnicode.nodes = Array.from({ length: 25 }, (_, sectionIndex) => ({
    id: `section-${sectionIndex}`,
    component: { id: 'section', version: '1.0.0' },
    props: { variant: 'default' },
    slots: { content: Array.from({ length: 3 }, (_, textIndex) => ({
      id: `text-${sectionIndex}-${textIndex}`,
      component: { id: 'text', version: '1.0.0' },
      props: { text: 'é'.repeat(1000), tone: 'body' },
    })) },
  }));
  assert.ok(JSON.stringify(largeUnicode).length < 128 * 1024);
  assert.ok(new TextEncoder().encode(JSON.stringify(largeUnicode)).byteLength > 128 * 1024);
  assert.throws(() => validateCatalogPage(largeUnicode), /128 Ko UTF-8/);
});

test('les bibliothèques de référence sont inventoriées sans être prétendues installées', () => {
  assert.equal(catalogLibraryInventory.length, 39);
  assert.ok(catalogLibraryInventory.every((entry) => entry.admitted === false && entry.installedVersion === null && entry.license === 'unverified' && entry.versionStatus === 'not-installed' && entry.discoveredIn === 'user-supplied-reference-images'));
  assert.deepEqual(CATALOG_RELEASE.dependencies, [{ name: 'react', version: '19.3.1', kind: 'peer', license: 'MIT' }]);
  assert.equal(UNSLOP_PROFILE.attribution, 'Unslop by Damir Sokolovsky (@heydamir), licensed CC BY 4.0.');
  assert.equal(UNSLOP_PROFILE.passes.length, 9);
  assert.equal(UNSLOP_PROFILE.rules.length, 9);
  assert.ok(UNSLOP_PROFILE.rules.some((rule) => rule.pass === 'motion' && rule.guidance.includes('reduced-motion')));
  assert.ok(Object.isFrozen(CATALOG_RELEASE.components) && Object.isFrozen(CATALOG_RELEASE.components[0]!.schema));
});

test('l’empreinte du manifeste est stable et distincte du hash complet de sources', async () => {
  const first = await catalogMetadataDigest();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(await catalogMetadataDigest(), first);
  assert.equal(CATALOG_RELEASE.integrity.digest, null);
  assert.equal(CATALOG_RELEASE.integrity.status, 'source-hash-pending');
  assert.equal(CATALOG_RELEASE.version, '0.3.0');
  assert.deepEqual(CATALOG_RELEASE.motions.map((motion) => motion.id), ['fade-in', 'slide-up', 'slide-down', 'fade-slide-down', 'fade-slide-up']);
});
