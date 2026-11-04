import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STORAGE_KEY = 'design-workbench:m0:project-m0:v1';
const screenshots = fileURLToPath(new URL('../../.team/screenshots/empty-start/', import.meta.url));

async function capture(page: Page, name: string) {
  mkdirSync(screenshots, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${screenshots}${name}.png`, fullPage: true, animations: 'disabled' });
}

async function openEmpty(page: Page) {
  const resetToken = `manifest:e2e:empty-project-reset:${Date.now()}:${Math.random()}`;
  await page.addInitScript(({ key, marker }) => {
    if (sessionStorage.getItem(marker) === 'done') return;
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem(marker, 'done');
  }, { key: STORAGE_KEY, marker: resetToken });
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ajouter une section d’accueil', exact: true })).toBeVisible();
}

test('un nouveau projet affiche un canevas blanc réellement vide, sans Hero ni champs de bloc', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEmpty(page);
  await expect(page.locator('.site-hero')).toHaveCount(0);
  await expect(page.locator('.component-summary')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveCount(0);
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(await page.locator('.empty-canvas').textContent()).toBe('');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await capture(page, '01-empty-desktop');

  await page.setViewportSize({ width: 375, height: 844 });
  await capture(page, '02-empty-mobile');
  await expect(page.locator('.canvas-region')).toBeVisible();
  await expect(page.locator('.inspector')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('l’ajout manuel du premier Hero est annulable, sauvegardable et conservé au rechargement', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEmpty(page);
  await page.getByRole('button', { name: 'Ajouter une section d’accueil', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveValue('Votre titre');
  await expect(page.locator('.site-hero')).toHaveCount(1);
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Rétablir', exact: true }).click();
  await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Notre premier espace');
  await expect(page.getByRole('button', { name: 'Voir la version 1', exact: true })).toBeVisible();
  await capture(page, '03-manual-hero');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Notre premier espace', exact: true })).toBeVisible();
  await expect(page.locator('.site-hero')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Ajouter une section d’accueil', exact: true })).toHaveCount(0);
});

test('une ouverture à 375 px présente toutes les zones dans la même page', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/');
  const description = page.getByRole('textbox', { name: 'Description de la page', exact: true });
  await expect(description).toBeVisible();
  await expect(page.locator('.mobile-tabs, .workflow-bar')).toHaveCount(0);
  await expect(page.getByRole('main', { name: 'Aperçu modifiable de la page', exact: true })).toBeVisible();
  await capture(page, '06-direct-mobile-description');
  await description.fill('Une intention à saisir sur mobile');
  await expect(description).toHaveValue('Une intention à saisir sur mobile');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('les règles locales prévisualisent les opérations reconnues après 1,5 s, puis recalculent sans sauvegarde implicite', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEmpty(page);
  const input = page.getByRole('textbox', { name: 'Description de la page', exact: true });
  await expect(page.getByRole('checkbox', { name: /Analyse automatique/ })).toHaveCount(0);
  await input.fill('Fond sombre avec un accent bleu et une section d’accueil avec un fondu.\nTitre : Première version');
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible({ timeout: 4000 });
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(23, 32, 38)');
  await expect(page.getByRole('heading', { name: 'Première version', exact: true })).toBeVisible();
  await expect(page.locator('.site-hero--fade')).toHaveCount(1);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await page.getByRole('button', { name: 'Ignorer la proposition locale', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();

  await input.fill('Fond clair avec un accent vert et sans animation.\nTitre : Deuxième version');
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible({ timeout: 4000 });
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('heading', { name: 'Deuxième version', exact: true })).toBeVisible();
  await expect(page.locator('.site-hero--none')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Conserver la proposition locale', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Ignorer la proposition locale', exact: true })).toBeEnabled();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();

  await input.fill('Je veux une scène 3D avec des particules qui suivent le curseur.');
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toHaveCount(0);
  await expect(page.getByText('Précisons la direction.', { exact: true })).toBeVisible({ timeout: 4000 });
  await expect(page.getByText(/Le catalogue reconnaît actuellement le Hero, la navigation, les nuages, les graphiques, le fondu et le glissement/)).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('les labels Puck et le choix radio sélectionné gardent un contraste de texte lisible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEmpty(page);
  await page.getByRole('button', { name: 'Ajouter une section d’accueil', exact: true }).click();
  const none = page.getByRole('radio', { name: 'Aucune', exact: true });
  await expect(none).toBeChecked();
  const contrast = async () => none.evaluate((input) => {
    const visibleOption = input.nextElementSibling!;
    const style = getComputedStyle(visibleOption);
    const rgb = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const luminance = (color: string) => rgb(color).map((value) => value / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const light = luminance(style.color), dark = luminance(style.backgroundColor);
    return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
  });
  await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
  for (const name of ['Titre', 'Texte de présentation', 'Animation d’entrée']) {
    const label = page.locator('.puck-fields').getByText(name, { exact: true });
    await expect(label).toBeVisible();
    const ratio = await label.evaluate((element) => {
      const rgb = (color: string) => color.match(/[\d.]+/g)!.map(Number);
      const luminance = (color: string) => rgb(color).slice(0, 3).map((value) => value / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
      let ancestor: Element | null = element;
      let background = '';
      while (ancestor) {
        const candidate = getComputedStyle(ancestor).backgroundColor;
        const channels = rgb(candidate);
        if (channels.length === 3 || channels[3] === 1) { background = candidate; break; }
        ancestor = ancestor.parentElement;
      }
      if (!background) throw new Error('Le fond réel du libellé est introuvable.');
      const text = luminance(getComputedStyle(element).color), surface = luminance(background);
      return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05);
    });
    expect(ratio, `Contraste du libellé ${name}`).toBeGreaterThanOrEqual(4.5);
  }
  await capture(page, '07-selected-animation-contrast');
});

test('un candidat local est prévisualisé avant conservation ou abandon explicites', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEmpty(page);
  await page.getByRole('textbox', { name: 'Description de la page', exact: true }).fill('Une section d’accueil avec un fondu.\nTitre : Une idée à examiner');
  const hint = page.locator('.hint-card--component');
  await expect(hint).toContainText('Règle locale');
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible({ timeout: 4000 });
  await expect(page.getByRole('heading', { name: 'Une idée à examiner', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enregistrer le brouillon', exact: true })).toBeDisabled();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await capture(page, '04-local-insertion-preview');
  await page.getByRole('button', { name: 'Ignorer la proposition locale', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Description de la page', exact: true }).fill('Un Hero\nTitre : Une idée à examiner');
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible({ timeout: 4000 });
  await page.getByRole('button', { name: 'Conserver la proposition locale', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Aperçu modifiable de la page', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voir la version 1', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Une idée à examiner', exact: true })).toBeVisible();
});

test('le debounce local attend exactement 1 500 ms, repart à la frappe et respecte la composition IME', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00.000Z') });
  await openEmpty(page);
  await page.clock.pauseAt(new Date('2026-11-04T12:01:00.000Z'));
  const input = page.getByRole('textbox', { name: 'Description de la page', exact: true });
  await input.fill('Fond noir\nHero\nTitre : Première direction');
  await page.clock.runFor(1499);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toHaveCount(0);
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.clock.runFor(1);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Première direction', exact: true })).toBeVisible();
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');

  await input.fill('Fond clair\nHero\nTitre : Deuxième direction');
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();
  await page.clock.runFor(1499);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Deuxième direction', exact: true })).toBeVisible();
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');

  await page.evaluate(() => document.querySelector('#page-description')!.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
  await input.fill('Fond noir\nHero\nTitre : Composition en cours');
  await page.clock.runFor(2000);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toHaveCount(0);
  await page.evaluate(() => document.querySelector('#page-description')!.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
  await page.clock.runFor(1499);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Composition en cours', exact: true })).toBeVisible();
});

test('la recette locale ventes + nuages apparaît sans fournisseur et son mouvement suit la nouvelle vitesse', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00.000Z') });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEmpty(page);
  await page.clock.pauseAt(new Date('2026-11-04T12:01:00.000Z'));
  const input = page.getByRole('textbox', { name: 'Description de la page', exact: true });
  await input.fill('Construis un tableau de bord de ventes avec des nuages au coucher du soleil et deux graphiques.\nTitre : Ventes du mois.\nFais apparaître les graphiques en fondu et en descente vers le bas.');
  await page.clock.runFor(1500);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible();
  await expect(page.locator('.manifest-navigation')).toBeVisible();
  await expect(page.locator('.manifest-clouds--sunset')).toBeVisible();
  await expect(page.locator('.manifest-chart')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Une première section d’accueil', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Ventes du mois.', exact: true })).toBeVisible();
  await capture(page, '08-sales-dashboard-preview');
  const firstChart = page.locator('.manifest-chart').first();
  await expect(firstChart).toHaveClass(/manifest-motion--fade-slide-down/);
  await expect(firstChart).toHaveCSS('animation-name', 'manifest-fade-slide-down');
  const firstDuration = await page.locator('.manifest-chart').first().evaluate((element) => getComputedStyle(element).getPropertyValue('--manifest-motion-duration').trim());
  const firstOpacity = await page.locator('.manifest-chart').first().evaluate((element) => getComputedStyle(element).getPropertyValue('--manifest-motion-opacity').trim());
  const firstDistance = await page.locator('.manifest-chart').first().evaluate((element) => getComputedStyle(element).getPropertyValue('--manifest-motion-distance').trim());
  expect(firstDuration).toBe('560ms');
  expect(firstOpacity).toBe('0');
  expect(firstDistance).toBe('14px');
  await expect(page.locator('.manifest-clouds__art')).toHaveCSS('animation-duration', '23s');
  await expect(page.locator('.manifest-clouds__cloud--two')).toHaveCSS('animation-duration', '28.98s');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();

  await input.fill('Construis un tableau de bord de ventes avec des nuages au coucher du soleil et deux graphiques.\nTitre : Ventes du mois.\nFais apparaître les graphiques en fondu et en descente vers le bas. Accélère l’animation x2.');
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toHaveCount(0);
  await page.clock.runFor(1499);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible();
  const secondChart = page.locator('.manifest-chart').first();
  await expect(secondChart).toHaveClass(/manifest-motion--fade-slide-down/);
  await expect(secondChart).toHaveCSS('animation-name', 'manifest-fade-slide-down');
  const secondDuration = await secondChart.evaluate((element) => getComputedStyle(element).getPropertyValue('--manifest-motion-duration').trim());
  const secondOpacity = await secondChart.evaluate((element) => getComputedStyle(element).getPropertyValue('--manifest-motion-opacity').trim());
  expect(secondDuration).toBe('280ms');
  expect(secondOpacity).toBe('0');
  await expect(page.locator('.manifest-clouds__art')).toHaveCSS('animation-duration', '11.5s');
  await expect(page.locator('.manifest-clouds__cloud--two')).toHaveCSS('animation-duration', '14.49s');
  await expect(page.locator('.manifest-clouds--sunset')).toBeVisible();
  await page.getByRole('button', { name: 'Conserver la proposition locale', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.getByRole('button', { name: 'Voir la version 1', exact: true })).toBeVisible();
  const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).project.snapshot.pages[0].catalogPage.nodes, STORAGE_KEY);
  expect(persisted).toHaveLength(4);
  expect(await page.evaluate((key) => localStorage.getItem(key) !== null, STORAGE_KEY)).toBe(true);
});

test('le mouvement réduit est expliqué et l’utilisateur peut activer les animations dans le seul aperçu', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00.000Z') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await openEmpty(page);
  await page.clock.pauseAt(new Date('2026-11-04T12:01:00.000Z'));
  const input = page.getByRole('textbox', { name: 'Description de la page', exact: true });
  await input.fill('Un tableau de bord de ventes avec des nuages. Fais apparaître les graphiques en fondu et vers le haut.');
  await page.clock.runFor(1499);
  await expect(page.locator('.manifest-chart')).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.locator('.manifest-chart')).toHaveCount(2);
  const chart = page.locator('.manifest-chart').first();
  const clouds = page.locator('.manifest-clouds__art');
  const toggle = page.getByRole('button', { name: 'Lire les animations dans l’aperçu', exact: true });
  await expect(page.getByRole('status').filter({ hasText: 'Mouvement réduit' })).toBeVisible();
  await expect(toggle).toBeVisible();
  await expect(chart).toHaveCSS('animation-name', 'none');
  await expect(clouds).toHaveCSS('animation-name', 'none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

  await toggle.click();
  await expect(page.getByRole('button', { name: 'Réduire les animations dans l’aperçu', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.catalog-canvas')).toHaveAttribute('data-motion-preview', 'enabled');
  await expect(chart).toHaveCSS('animation-name', 'manifest-fade-slide-up');
  await expect(clouds).toHaveCSS('animation-duration', '23s');
  await page.screenshot({ path: `${screenshots}09-reduced-motion-toggle-active.png` });

  await page.getByRole('button', { name: 'Réduire les animations dans l’aperçu', exact: true }).click();
  await expect(chart).toHaveCSS('animation-name', 'none');
  await expect(clouds).toHaveCSS('animation-name', 'none');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('un déplacement seul conserve une opacité pleine dans le rendu du navigateur', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00.000Z') });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await openEmpty(page);
  await page.clock.pauseAt(new Date('2026-11-04T12:01:00.000Z'));
  await page.getByRole('textbox', { name: 'Description de la page', exact: true }).fill('Un tableau de bord de ventes avec des nuages. Les graphiques glissent vers le haut.');
  await page.clock.runFor(1499);
  await expect(page.locator('.manifest-chart')).toHaveCount(0);
  await page.clock.runFor(1);
  const chart = page.locator('.manifest-chart').first();
  await expect(chart).toHaveClass(/manifest-motion--slide-up/);
  await expect(chart).toHaveCSS('animation-name', 'manifest-slide-up');
  await expect(chart).toHaveCSS('opacity', '1');
});

test('une nouvelle intention retire immédiatement le candidat local sans insérer son Hero', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEmpty(page);
  await page.getByRole('textbox', { name: 'Description de la page', exact: true }).fill('Un Hero\nTitre : Premier candidat');
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible({ timeout: 4000 });
  await page.getByRole('textbox', { name: 'Description de la page', exact: true }).fill('Une autre idée');
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Conserver la proposition locale', exact: true })).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('une proposition modèle simulée prévisualise puis conserve une insertion sur la page vide', async ({ page }) => {
  // Test-only transport boundary. No provider or host is contacted by this scenario.
  await page.route('**/packages/host-adapters/src/index.ts*', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    import { initialProject, createHeroBlock, applyOperations, hashSnapshot } from ${JSON.stringify(route.request().url().replace(/host-adapters\/src\/index\.ts.*$/, 'm0-contract/src/index.ts'))};
    let project = initialProject(), proposal;
    window.__emptyModelProject = project;
    export function createBrowserTransport() { return {
      kind: 'mcp', read: async () => structuredClone(project), close: async () => {},
      readProviderRegistry: async () => ({ schemaVersion: 1, providers: [{ id:'openai', label:'Fournisseur simulé de test', protocol:'openai-responses', status:'configured', supportsBYOK:false, secretConfigured:true, models:[{id:'test-hero',label:'Modèle simulé de test',providerId:'openai',capabilities:['structured-output']}]}] }),
      startSuggestion: async (request) => {
        const block = createHeroBlock(); block.props.title = 'Une insertion du simulateur';
        proposal = { id:'proposal-test',jobId:'job-test',generationId:'generation-test',status:'ready',editorSessionId:request.editorSessionId,intentEpoch:request.intentEpoch,baseDraftVersion:project.draftVersion,explanation:'Insertion déterministe du transport de test, sans appel de modèle.',operations:[{op:'insert_block',pageId:project.snapshot.pages[0].id,parentBlockId:null,slot:'content',beforeBlockId:null,block}] };
        return {jobId:'job-test',state:'succeeded',proposalIds:[proposal.id]};
      },
      getSuggestionJob: async () => ({jobId:'job-test',state:'succeeded',proposalIds:[proposal.id]}),
      getSuggestionUpdates: async () => ({events:[],nextSeq:0}),
      readSuggestionProposal: async () => structuredClone(proposal),
      markSuggestionProposalStale: async () => {},
      rejectSuggestionProposal: async () => {},
      keepSuggestionProposal: async () => {
        const snapshot = applyOperations(project.snapshot,proposal.operations);
        project = {...project,draftVersion:project.draftVersion+1,contentHash:await hashSnapshot(snapshot),snapshot};
        window.__emptyModelProject = project;
        return {project:structuredClone(project)};
      }
    }; }
    export const createMcpTransport = createBrowserTransport;
  ` }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEmpty(page);
  const providerDetails = page.locator('.model-provider-disclosure');
  const openProviderControls = async () => {
    if (!(await providerDetails.evaluate((element) => (element as HTMLDetailsElement).open))) {
      await providerDetails.locator('summary').click();
    }
  };
  await openProviderControls();
  await page.getByLabel('Fournisseur', { exact: true }).selectOption('openai');
  await page.getByRole('textbox', { name: 'Description de la page', exact: true }).fill('Crée une section de présentation.');
  await expect(page.getByRole('main', { name: 'Aperçu de la proposition', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Une insertion du simulateur', exact: true })).toBeVisible();
  await expect(page.locator('.suggestions-empty')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Précisons la direction.', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __emptyModelProject: { snapshot: { pages: { composition: { content: unknown[] } }[] } } }).__emptyModelProject.snapshot.pages[0].composition.content.length)).toBe(0);
  await capture(page, '05-simulated-model-preview');
  await page.getByRole('button', { name: 'Conserver', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Voir la version 1', exact: true })).toBeVisible();
  await expect(page.getByRole('main', { name: 'Aperçu modifiable de la page', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __emptyModelProject: { snapshot: { pages: { composition: { content: unknown[] } }[] } } }).__emptyModelProject.snapshot.pages[0].composition.content.length)).toBe(1);
});

test('le modèle attend exactement 1 500 ms et un résultat ancien ne remplace pas l’intention récente', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00.000Z') });
  await page.route('**/packages/host-adapters/src/index.ts*', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    import { initialProject, createHeroBlock } from ${JSON.stringify(route.request().url().replace(/host-adapters\/src\/index\.ts.*$/, 'm0-contract/src/index.ts'))};
    const project = initialProject(), proposals = new Map(), jobs = new Map(), stale = [];
    let starts = 0, reads = 0, releaseFirstRead;
    window.__manifestProviderProbe = { state: () => ({ starts, reads, stale: [...stale] }), releaseFirst: () => releaseFirstRead?.() };
    export function createBrowserTransport() { return {
      kind:'mcp', read:async()=>structuredClone(project), close:async()=>{},
      readProviderRegistry:async()=>({schemaVersion:1,providers:[{id:'openai',label:'Fournisseur simulé',protocol:'openai-responses',status:'configured',supportsBYOK:false,secretConfigured:true,models:[{id:'test-model',label:'Modèle simulé',providerId:'openai',capabilities:['structured-output']}]}]}),
      startSuggestion:async(request)=>{
        const sequence = ++starts, jobId = 'job-' + sequence, proposalId = 'proposal-' + sequence;
        const block = createHeroBlock(); block.props.title = sequence === 1 ? 'Résultat périmé' : 'Résultat actuel';
        proposals.set(proposalId,{id:proposalId,jobId,generationId:'generation-' + sequence,status:'ready',editorSessionId:request.editorSessionId,intentEpoch:request.intentEpoch,baseDraftVersion:project.draftVersion,explanation:'Résultat simulé, sans appel fournisseur.',operations:[{op:'insert_block',pageId:project.snapshot.pages[0].id,parentBlockId:null,slot:'content',beforeBlockId:null,block}]});
        jobs.set(jobId,proposalId);
        return {jobId,state:'succeeded',proposalIds:[proposalId]};
      },
      getSuggestionJob:async(jobId)=>({jobId,state:'succeeded',proposalIds:[jobs.get(jobId)]}),
      getSuggestionUpdates:async()=>({events:[],nextSeq:0}),
      readSuggestionProposal:async(id)=>{reads++; if(id==='proposal-1') await new Promise(resolve=>{releaseFirstRead=resolve}); return structuredClone(proposals.get(id));},
      markSuggestionProposalStale:async(id)=>{stale.push(id);}, rejectSuggestionProposal:async()=>{}
    }; }
    export const createMcpTransport=createBrowserTransport;
  ` }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEmpty(page);
  await page.clock.pauseAt(new Date('2026-11-04T12:01:00.000Z'));
  const providerDetails = page.locator('.model-provider-disclosure');
  if (!(await providerDetails.evaluate((element) => (element as HTMLDetailsElement).open))) await providerDetails.locator('summary').click();
  await page.getByLabel('Fournisseur', { exact: true }).selectOption('openai');
  const input = page.getByRole('textbox', { name: 'Description de la page', exact: true });
  await input.fill('Première intention à générer');
  await page.clock.runFor(1499);
  expect(await page.evaluate(() => (window as unknown as { __manifestProviderProbe: { state(): { starts: number } } }).__manifestProviderProbe.state().starts)).toBe(0);
  await page.clock.runFor(1);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __manifestProviderProbe: { state(): { reads: number } } }).__manifestProviderProbe.state().reads)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { __manifestProviderProbe: { state(): { starts: number } } }).__manifestProviderProbe.state().starts)).toBe(1);

  await input.fill('Deuxième intention plus récente');
  await page.clock.runFor(1499);
  expect(await page.evaluate(() => (window as unknown as { __manifestProviderProbe: { state(): { starts: number } } }).__manifestProviderProbe.state().starts)).toBe(1);
  await page.clock.runFor(1);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __manifestProviderProbe: { state(): { reads: number } } }).__manifestProviderProbe.state().reads)).toBe(2);
  await expect(page.getByRole('heading', { name: 'Résultat actuel', exact: true })).toBeVisible();
  await page.evaluate(() => (window as unknown as { __manifestProviderProbe: { releaseFirst(): void } }).__manifestProviderProbe.releaseFirst());
  await expect.poll(() => page.evaluate(() => (window as unknown as { __manifestProviderProbe: { state(): { stale: string[] } } }).__manifestProviderProbe.state().stale)).toContain('proposal-1');
  await expect(page.getByRole('heading', { name: 'Résultat actuel', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Résultat périmé', exact: true })).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('le passage local→modèle puis modèle→local remplace chaque ancien aperçu', async ({ page }) => {
  await page.route('**/packages/host-adapters/src/index.ts*', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    import { initialProject, applyOperations, hashSnapshot } from ${JSON.stringify(route.request().url().replace(/host-adapters\/src\/index\.ts.*$/, 'm0-contract/src/index.ts'))};
    const project = initialProject(); let proposal;
    export function createBrowserTransport() { return {
      kind:'mcp', read:async()=>structuredClone(project), close:async()=>{},
      readProviderRegistry:async()=>({schemaVersion:1,providers:[{id:'openai',label:'Fournisseur simulé',protocol:'openai-responses',status:'configured',supportsBYOK:false,secretConfigured:true,models:[{id:'test-model',label:'Modèle simulé',providerId:'openai',capabilities:['structured-output']}]}]}),
      startSuggestion:async(request)=>{
        proposal={id:'source-switch-proposal',jobId:'source-switch-job',generationId:'source-switch-generation',status:'ready',editorSessionId:request.editorSessionId,intentEpoch:request.intentEpoch,baseDraftVersion:project.draftVersion,explanation:'Candidat simulé du fournisseur.',operations:[{op:'update_theme',tokens:{'color.background':{kind:'color',value:'#f2f2e0'}}}]};
        return {jobId:proposal.jobId,state:'succeeded',proposalIds:[proposal.id]};
      },
      getSuggestionJob:async()=>({jobId:'source-switch-job',state:'succeeded',proposalIds:[proposal.id]}),
      getSuggestionUpdates:async()=>({events:[],nextSeq:0}), readSuggestionProposal:async()=>structuredClone(proposal),
      markSuggestionProposalStale:async()=>{}, rejectSuggestionProposal:async()=>{},
      keepSuggestionProposal:async()=>{const snapshot=applyOperations(project.snapshot,proposal.operations);Object.assign(project,{snapshot,contentHash:await hashSnapshot(snapshot),draftVersion:project.draftVersion+1});return {project:structuredClone(project)}}
    }; }
    export const createMcpTransport=createBrowserTransport;
  ` }));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEmpty(page);
  const providerDetails = page.locator('.model-provider-disclosure');
  const openProviderControls = async () => {
    if (!(await providerDetails.evaluate((element) => (element as HTMLDetailsElement).open))) {
      await providerDetails.locator('summary').click();
    }
  };
  const input = page.getByRole('textbox', { name: 'Description de la page', exact: true });
  await input.fill('Fond noir\nHero\nTitre : Proposition locale initiale');
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');

  await openProviderControls();
  await page.getByLabel('Fournisseur', { exact: true }).selectOption('openai');
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toHaveCount(0);
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('main', { name: 'Aperçu de la proposition', exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(242, 242, 224)');

  await openProviderControls();
  await page.getByLabel('Fournisseur', { exact: true }).selectOption('');
  await expect(page.getByRole('main', { name: 'Aperçu de la proposition précédente', exact: true })).toHaveCount(0);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await input.fill('Un accent violet\nHero\nTitre : Proposition locale');
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toHaveCount(0);
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('heading', { name: 'Proposition locale', exact: true })).toBeVisible();
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('.model-proposal')).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});
