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
  await page.getByRole('button', { name: 'Réglages du bloc', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Aucun composant dans cette page', exact: true })).toBeVisible();
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

test('une ouverture directement à 375 px présente la description et l’étape Décrire actives', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/');
  const description = page.getByRole('textbox', { name: 'Description de la page', exact: true });
  await expect(description).toBeVisible();
  await expect(page.getByRole('button', { name: 'Description', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Décrire', exact: true })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('main', { name: 'Aperçu modifiable de la page', exact: true })).toBeHidden();
  await capture(page, '06-direct-mobile-description');
  await description.fill('Une intention à saisir sur mobile');
  await expect(description).toHaveValue('Une intention à saisir sur mobile');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
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

test('une piste locale peut insérer un Hero en aperçu avant conservation ou abandon explicites', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEmpty(page);
  await page.getByRole('textbox', { name: 'Description de la page', exact: true }).fill('Une section d’accueil avec un fondu.\nTitre : Une idée à examiner');
  await page.getByRole('button', { name: 'Proposer maintenant', exact: true }).click();
  const hint = page.locator('.hint-card--component');
  await expect(hint).toContainText('Règle locale');
  await hint.getByRole('button', { name: 'Prévisualiser la section', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Aperçu de la piste locale', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Une idée à examiner', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enregistrer le brouillon', exact: true })).toBeDisabled();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await capture(page, '04-local-insertion-preview');
  await page.getByRole('button', { name: 'Ignorer l’aperçu local', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();
  await hint.getByRole('button', { name: 'Prévisualiser la section', exact: true }).click();
  await page.getByRole('button', { name: 'Conserver la section', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Aperçu modifiable de la page', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voir la version 1', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Une idée à examiner', exact: true })).toBeVisible();
});

test('une nouvelle intention retire immédiatement le candidat local sans insérer son Hero', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEmpty(page);
  await page.getByRole('textbox', { name: 'Description de la page', exact: true }).fill('Un Hero\nTitre : Premier candidat');
  await page.getByRole('button', { name: 'Proposer maintenant', exact: true }).click();
  await page.getByRole('button', { name: 'Prévisualiser la section', exact: true }).click();
  await page.getByRole('textbox', { name: 'Description de la page', exact: true }).fill('Une autre idée');
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Conserver la section', exact: true })).toHaveCount(0);
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
  await page.locator('.model-provider-disclosure > summary').click();
  await page.getByLabel('Fournisseur', { exact: true }).selectOption('openai');
  await page.getByRole('textbox', { name: 'Description de la page', exact: true }).fill('Crée une section de présentation.');
  await page.getByRole('button', { name: 'Proposer maintenant', exact: true }).click();
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
