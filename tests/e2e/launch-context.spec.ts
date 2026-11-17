import { test, expect, type Page } from '@playwright/test';
import type { EditorLaunchContext, M0Project } from '@design-workbench/m0-contract';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type LaunchTestState = { project: M0Project; commits: number; modelCalls: number };
type LaunchTestWindow = Window & { __manifestLaunchTest: { state(): LaunchTestState; emit(context: EditorLaunchContext): void; resumeCommits(): void } };

const blackLaunch: EditorLaunchContext = {
  id: 'launch-black', projectId: 'project-m0', baseDraftVersion: 0,
  userRequest: 'Ouvre l’éditeur Manifest et affiche un fond noir.', backgroundColor: '#000000',
};

async function installLaunchTransport(page: Page, launch: EditorLaunchContext, options: { existingHero?: boolean; draftVersion?: number; configuredModel?: boolean; autoModel?: boolean; holdCommits?: boolean; lockedTheme?: boolean } = {}) {
  // Simulate only the host boundary. The real Editor and shared document operations execute.
  // No provider API or native conversation is consulted by this fixture.
  await page.route('**/packages/host-adapters/src/index.ts*', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    import { initialProject, createHeroBlock, applyOperations, hashSnapshot, validateCommand, disconnectedProviderRegistry } from ${JSON.stringify(route.request().url().replace(/host-adapters\/src\/index\.ts.*$/, 'm0-contract/src/index.ts'))};
    let project = initialProject(), latest = ${JSON.stringify(launch)}, commits = 0, modelCalls = 0, proposal;
    project.draftVersion = ${options.draftVersion ?? 0};
    if (${Boolean(options.existingHero)}) {
      const block = createHeroBlock(); block.props.title = 'Un contenu déjà conservé';
      project.snapshot.pages[0].composition.content = [block];
    }
    if (${Boolean(options.lockedTheme)}) project.snapshot.locks = [{ pageId: project.snapshot.pages[0].id, blockId: null, properties: ['color.background'] }];
    project.contentHash = await hashSnapshot(project.snapshot);
    let holdCommits = ${Boolean(options.holdCommits)};
    const waitingCommits = [];
    const listeners = new Set();
    window.__manifestLaunchTest = {
      state: () => structuredClone({ project, commits, modelCalls }),
      emit: (context) => { latest = structuredClone(context); for (const listener of listeners) listener(structuredClone(latest)); },
      resumeCommits: () => { holdCommits = false; for (const resolve of waitingCommits.splice(0)) resolve(); }
    };
    export function createBrowserTransport() { return {
      kind: 'mcp', read: async () => structuredClone(project),
      subscribeLaunchContext(listener) { listeners.add(listener); listener(structuredClone(latest)); return () => listeners.delete(listener); },
      readProviderRegistry: async () => ${Boolean(options.configuredModel)} ? ({ schemaVersion: 1, providers: [{ id:'openai', label:'Fournisseur simulé de test', protocol:'openai-responses', status:'configured', supportsBYOK:false, secretConfigured:true, models:[{id:'launch-test-model',label:'Modèle simulé de test',providerId:'openai',capabilities:['structured-output']}]}] }) : disconnectedProviderRegistry(),
      getChatGPTAuthStatus: async () => ${Boolean(options.configuredModel)} ? ({ status:'connected', usageMode:'chatgpt-plan' }) : ({ status:'disconnected', usageMode:'none' }),
      startSuggestion: async (request) => {
        modelCalls++;
        if (!${Boolean(options.autoModel)}) throw new Error('Le modèle de test ne doit pas être appelé dans ce scénario.');
        const block = project.snapshot.pages[0].composition.content[0];
        proposal = { id:'launch-auto-proposal',jobId:'launch-auto-job',generationId:'launch-auto-generation',status:'ready',editorSessionId:request.editorSessionId,intentEpoch:request.intentEpoch,baseDraftVersion:project.draftVersion,explanation:'Modification produite par le transport simulé après le délai automatique.',operations:[{op:'update_props',pageId:project.snapshot.pages[0].id,blockId:block.props.id,props:{animation:'fade'}}] };
        return { jobId:proposal.jobId, state:'succeeded', proposalIds:[proposal.id] };
      },
      getSuggestionJob: async () => ({ jobId:'launch-auto-job',state:'succeeded',proposalIds:proposal ? [proposal.id] : [] }),
      getSuggestionUpdates: async () => ({ events:[],nextSeq:0 }),
      readSuggestionProposal: async () => structuredClone(proposal),
      markSuggestionProposalStale: async () => {},
      commit: async (command) => {
        if (holdCommits) await new Promise((resolve) => waitingCommits.push(resolve));
        validateCommand(command);
        if (command.expectedDraftVersion !== project.draftVersion) throw Object.assign(new Error('Version de test périmée.'), { code: 'VERSION_CONFLICT' });
        const snapshot = applyOperations(project.snapshot, command.payload.operations);
        const contentHash = await hashSnapshot(snapshot);
        project = { ...project, snapshot, contentHash, draftVersion: project.draftVersion + (contentHash === project.contentHash ? 0 : 1) };
        commits++;
        return structuredClone(project);
      },
      close: async () => {}
    }; }
    export const createMcpTransport = createBrowserTransport;
  ` }));
  const resetMarker = `manifest:e2e:launch-reset:${Date.now()}:${Math.random()}`;
  await page.addInitScript((marker) => {
    if (sessionStorage.getItem(marker) === 'done') return;
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem(marker, 'done');
  }, resetMarker);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Description de la page', exact: true })).toBeVisible();
}

async function state(page: Page) {
  return page.evaluate(() => (window as LaunchTestWindow).__manifestLaunchTest.state());
}

async function emit(page: Page, context: EditorLaunchContext) {
  await page.evaluate((received) => (window as LaunchTestWindow).__manifestLaunchTest.emit(received), context);
}

test('le chat préremplit la demande et affiche un fond noir annulable sans modifier la base', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00.000Z') });
  await page.clock.pauseAt(new Date('2026-11-04T12:01:00.000Z'));
  await installLaunchTransport(page, blackLaunch);
  await expect(page.getByRole('textbox', { name: 'Description de la page', exact: true })).toHaveValue(blackLaunch.userRequest!);
  await expect(page.locator('.launch-status')).toContainText('fond demandé');
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.getByRole('button', { name: 'Conserver le fond', exact: true })).toBeVisible();
  await expect(page.locator('.site-hero')).toHaveCount(0);
  const before = await state(page);
  expect(before.project.snapshot.theme.tokens['color.background'].value).toBe('#ffffff');
  expect(before.project.snapshot.pages[0].composition.content).toEqual([]);
  expect(before.commits).toBe(0);
  // Cross the autosave debounce: a preview must not save itself.
  await page.clock.runFor(1100);
  expect(await state(page)).toEqual(before);
  const screenshots = fileURLToPath(new URL('../../.team/screenshots/launch-context/', import.meta.url));
  mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: `${screenshots}01-chat-black-preview.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Ignorer le fond', exact: true }).click();
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('button', { name: 'Conserver le fond', exact: true })).toHaveCount(0);
  expect(await state(page)).toEqual(before);
});

test('la demande userRequest prime sur une proposition d’assistant différente', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00.000Z') });
  await page.clock.pauseAt(new Date('2026-11-04T12:01:00.000Z'));
  const userRequest = 'Crée un tableau de bord de ventes avec des nuages animés et deux graphiques.';
  const assistantProposal = 'Hero\nTitre : Page fixe inventée';
  await installLaunchTransport(page, {
    id: 'launch-priority', projectId: 'project-m0', baseDraftVersion: 0,
    userRequest, assistantProposal,
  });
  const input = page.getByRole('textbox', { name: 'Description de la page', exact: true });
  await expect(input).toHaveValue(userRequest);
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();
  await page.clock.runFor(1499);
  await expect(page.locator('.manifest-clouds')).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.locator('.manifest-clouds')).toBeVisible();
  await expect(page.locator('.manifest-chart')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Page fixe inventée', exact: true })).toHaveCount(0);
});

test('une proposition déjà formulée sert de repli si le chat ne transmet pas userRequest', async ({ page }) => {
  const assistantProposal = 'Une page de présentation avec un fondu doux.';
  await installLaunchTransport(page, {
    id: 'launch-assistant-fallback', projectId: 'project-m0', baseDraftVersion: 0, assistantProposal,
  });
  await expect(page.getByRole('textbox', { name: 'Description de la page', exact: true })).toHaveValue(assistantProposal);
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();
});

test('le format intégré tient dans un viewport ChatGPT étroit sans page longue', async ({ page }) => {
  await installLaunchTransport(page, { id: 'launch-empty', projectId: 'project-m0', baseDraftVersion: 0 });
  await page.setViewportSize({ width: 736, height: 704 });
  for (const selector of ['.description-panel', '.canvas-region', '.inspector']) await expect(page.locator(selector)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const scrollContainers = await page.evaluate(() => {
    const description = document.querySelector<HTMLElement>('.description-panel')!;
    const suggestions = document.querySelector<HTMLElement>('.inspector')!;
    const canvas = document.querySelector<HTMLElement>('.canvas-stage')!;
    return {
      descriptionOverflow: getComputedStyle(description).overflowY,
      suggestionsOverflow: getComputedStyle(suggestions).overflowY,
      descriptionCanScroll: description.scrollHeight > description.clientHeight,
      suggestionsCanScroll: suggestions.scrollHeight > suggestions.clientHeight,
      canvasOverflow: getComputedStyle(canvas).overflowY,
    };
  });
  expect(scrollContainers.descriptionOverflow).toBe('auto');
  expect(scrollContainers.suggestionsOverflow).toBe('auto');
  expect(scrollContainers.descriptionCanScroll).toBe(true);
  expect(scrollContainers.suggestionsCanScroll).toBe(true);
  expect(scrollContainers.canvasOverflow).toBe('auto');
  const screenshots = fileURLToPath(new URL('../../docs/evidence/HOTFIX-01/', import.meta.url));
  mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: `${screenshots}viewport-736x704.png`, animations: 'disabled' });
  await page.locator('.description-panel').evaluate((element: HTMLElement) => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => page.locator('.description-panel').evaluate((element: HTMLElement) => element.scrollTop)).toBeGreaterThan(0);
  await page.locator('.description-panel').evaluate((element: HTMLElement) => { element.scrollTop = 0; });
  await expect.poll(() => page.locator('.description-panel').evaluate((element: HTMLElement) => element.scrollTop)).toBe(0);
  const desktopMetrics = await page.evaluate(() => ({
    innerHeight: window.innerHeight,
    bodyHeight: document.body.scrollHeight,
    innerWidth: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    shellHeight: document.querySelector('.app-shell')!.getBoundingClientRect().height,
    rootOverflow: getComputedStyle(document.documentElement).overflow,
    bodyOverflow: getComputedStyle(document.body).overflow,
  }));
  expect(desktopMetrics.bodyHeight).toBeLessThanOrEqual(desktopMetrics.innerHeight + 1);
  expect(desktopMetrics.bodyWidth).toBeLessThanOrEqual(desktopMetrics.innerWidth + 1);
  expect(desktopMetrics.shellHeight).toBeLessThanOrEqual(desktopMetrics.innerHeight + 1);
  expect(desktopMetrics.rootOverflow).toBe('hidden');
  expect(desktopMetrics.bodyOverflow).toBe('hidden');
  await page.mouse.move(8, 8);
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  const description = page.getByRole('textbox', { name: 'Description de la page', exact: true });
  await description.fill('Un tableau de bord de ventes avec des nuages et deux graphiques.');
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible({ timeout: 6000 });
  const frame = page.locator('.canvas-frame');
  await expect.poll(() => frame.evaluate((element: HTMLElement) => element.scrollHeight > element.clientHeight)).toBe(true);
  expect(await frame.evaluate((element: HTMLElement) => getComputedStyle(element).overflowY)).toBe('auto');
  await frame.evaluate((element: HTMLElement) => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => frame.evaluate((element: HTMLElement) => element.scrollTop)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await description.fill('');
  await expect(page.getByRole('region', { name: 'Canevas vide', exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const nav = page.getByRole('navigation', { name: 'Panneaux de l’atelier' });
  await expect(nav).toBeVisible();
  await expect(page.getByRole('button', { name: 'Décrire', exact: true })).toBeVisible();
  await expect(page.locator('.description-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Aperçu', exact: true }).click();
  await expect(page.locator('.canvas-region')).toBeVisible();
  await expect(page.locator('.description-panel')).toBeHidden();
  await page.screenshot({ path: `${screenshots}mobile-preview-390x844.png`, animations: 'disabled' });
  const suggestionsTab = page.getByRole('button', { name: 'Suggestions', exact: true });
  await suggestionsTab.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.inspector')).toBeVisible();
  await expect(page.locator('.canvas-region')).toBeHidden();
  await expect(suggestionsTab).toBeFocused();
  await page.getByRole('button', { name: 'Décrire', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.description-panel')).toBeVisible();
  await expect(page.locator('.inspector')).toBeHidden();
  const mobileMetrics = await page.evaluate(() => ({
    innerHeight: window.innerHeight,
    bodyHeight: document.body.scrollHeight,
    innerWidth: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    shellHeight: document.querySelector('.app-shell')!.getBoundingClientRect().height,
    rootOverflow: getComputedStyle(document.documentElement).overflow,
    bodyOverflow: getComputedStyle(document.body).overflow,
  }));
  expect(mobileMetrics.bodyHeight).toBeLessThanOrEqual(mobileMetrics.innerHeight + 1);
  expect(mobileMetrics.bodyWidth).toBeLessThanOrEqual(mobileMetrics.innerWidth + 1);
  expect(mobileMetrics.shellHeight).toBeLessThanOrEqual(mobileMetrics.innerHeight + 1);
  expect(mobileMetrics.rootOverflow).toBe('hidden');
  expect(mobileMetrics.bodyOverflow).toBe('hidden');
  await page.mouse.move(8, 8);
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('conserver le fond sauvegarde le choix et préserve le contenu de la page existante', async ({ page }) => {
  await installLaunchTransport(page, {
    ...blackLaunch,
    userRequest: 'Une page sur fond noir avec son contenu conservé.',
    assistantProposal: 'Cette proposition différente ne doit pas écraser la demande utilisateur.',
  }, { existingHero: true });
  await expect(page.getByRole('textbox', { name: 'Description de la page', exact: true })).toHaveValue('Une page sur fond noir avec son contenu conservé.');
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.getByRole('heading', { name: 'Un contenu déjà conservé', exact: true })).toBeVisible();
  const before = await state(page);
  expect(before.commits).toBe(0);
  await page.getByRole('button', { name: 'Conserver le fond', exact: true }).click();
  await expect.poll(async () => (await state(page)).project.draftVersion).toBe(1);
  const after = await state(page);
  expect(after.project.snapshot.theme.tokens['color.background'].value).toBe('#000000');
  expect(after.project.snapshot.pages).toEqual(before.project.snapshot.pages);
  expect(after.project.contentHash).not.toBe(before.project.contentHash);
  expect(after.commits).toBe(1);
  expect(after.modelCalls).toBe(0);
  await expect(page.getByRole('button', { name: 'Conserver le fond', exact: true })).toHaveCount(0);
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
});

test('un lancement fondé sur une ancienne version ne remplace pas le fond courant', async ({ page }) => {
  await installLaunchTransport(page, { ...blackLaunch, baseDraftVersion: 1 }, { draftVersion: 2, existingHero: true });
  await expect(page.locator('.launch-status')).toContainText('ancienne version');
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('button', { name: 'Conserver le fond', exact: true })).toHaveCount(0);
  const current = await state(page);
  expect(current.project.draftVersion).toBe(2);
  expect(current.project.snapshot.theme.tokens['color.background'].value).toBe('#ffffff');
  expect(current.commits).toBe(0);
  expect(current.modelCalls).toBe(0);
});

test('une notification tardive conserve le texte modifié et propose explicitement de reprendre la demande', async ({ page }) => {
  await installLaunchTransport(page, { id: 'launch-first', projectId: 'project-m0', baseDraftVersion: 0, userRequest: 'Un premier brief transmis.' });
  const input = page.getByRole('textbox', { name: 'Description de la page', exact: true });
  await expect(input).toHaveValue('Un premier brief transmis.');
  await input.fill('Mes retouches dans Manifest.');
  await emit(page, { id: 'launch-later', projectId: 'project-m0', baseDraftVersion: 0, userRequest: 'Une nouvelle demande du chat.' });
  await expect(input).toHaveValue('Mes retouches dans Manifest.');
  await expect(page.getByText('Une nouvelle demande est arrivée. Ton texte est conservé.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Utiliser la demande reçue', exact: true }).click();
  await expect(input).toHaveValue('Une nouvelle demande du chat.');
  expect((await state(page)).commits).toBe(0);
  expect((await state(page)).modelCalls).toBe(0);
});

test('un nouveau lancement textuel retire le fond temporaire précédent sans sauvegarder', async ({ page }) => {
  await installLaunchTransport(page, blackLaunch);
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  const before = await state(page);
  await emit(page, { id: 'launch-text-only', projectId: 'project-m0', baseDraftVersion: 0, userRequest: 'Une nouvelle direction textuelle.' });
  await expect(page.getByRole('textbox', { name: 'Description de la page', exact: true })).toHaveValue('Une nouvelle direction textuelle.');
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('button', { name: 'Conserver le fond', exact: true })).toHaveCount(0);
  expect(await state(page)).toEqual(before);
});

test('une nouvelle saisie remplace le fond reçu et relance le debounce local à 1 500 ms', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00.000Z') });
  await installLaunchTransport(page, blackLaunch);
  await page.clock.pauseAt(new Date('2026-11-04T12:01:00.000Z'));
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  const input = page.getByRole('textbox', { name: 'Description de la page', exact: true });
  await input.fill('Fond clair avec un accent violet\nHero\nTitre : Ma nouvelle page');
  await expect(page.getByRole('main', { name: 'Aperçu du fond demandé', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Conserver le fond', exact: true })).toHaveCount(0);
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.clock.runFor(1499);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toHaveCount(0);
  await page.clock.runFor(1);
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ma nouvelle page', exact: true })).toBeVisible();
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect((await state(page)).commits).toBe(0);
  expect((await state(page)).modelCalls).toBe(0);
});

test('la génération automatique attend la fin de l’aperçu temporaire puis modifie le canevas après la pause', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-04T12:00:00.000Z') });
  await page.clock.pauseAt(new Date('2026-11-04T12:01:00.000Z'));
  await installLaunchTransport(page, blackLaunch, { configuredModel: true, autoModel: true, existingHero: true });
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await page.locator('.model-provider-disclosure > summary').click();
  await page.getByLabel('Fournisseur', { exact: true }).selectOption('openai');
  await expect(page.getByRole('checkbox', { name: 'Analyse automatique du modèle', exact: true })).toHaveCount(0);
  await expect(page.getByText('après 1,5 s de pause', { exact: false })).toBeVisible();
  // A host-provided background candidate temporarily owns the preview, so generation waits.
  await page.clock.runFor(1800);
  expect((await state(page)).modelCalls).toBe(0);
  expect((await state(page)).commits).toBe(0);
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await page.getByRole('button', { name: 'Ignorer le fond', exact: true }).click();
  await page.clock.runFor(1500);
  await expect.poll(async () => (await state(page)).modelCalls).toBe(1);
  await expect(page.locator('.site-hero--fade')).toHaveCount(1, { timeout: 5000 });
  expect((await state(page)).modelCalls).toBe(1);
  expect((await state(page)).commits).toBe(0);
});

test('un fond arrivé pendant une retouche se reprend après sauvegarde sur le contenu actuel', async ({ page }) => {
  await installLaunchTransport(page, { id: 'launch-edit', projectId: 'project-m0', baseDraftVersion: 0, userRequest: 'Un contenu à retoucher.' }, { existingHero: true, holdCommits: true });
  await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Le titre retouché dans Manifest');
  await emit(page, { ...blackLaunch, id: 'launch-during-edit' });
  await expect(page.locator('.launch-status')).toContainText('Enregistre tes modifications');
  const resume = page.getByRole('button', { name: 'Reprendre le fond reçu', exact: true });
  await expect(resume).toBeDisabled();
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.evaluate(() => (window as LaunchTestWindow).__manifestLaunchTest.resumeCommits());
  await expect.poll(async () => (await state(page)).project.draftVersion).toBe(1);
  await expect(resume).toBeEnabled();
  await resume.click();
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.getByRole('heading', { name: 'Le titre retouché dans Manifest', exact: true })).toBeVisible();
  const preview = await state(page);
  expect(preview.project.snapshot.pages[0].composition.content[0].props.title).toBe('Le titre retouché dans Manifest');
  expect(preview.project.snapshot.theme.tokens['color.background'].value).toBe('#ffffff');
  expect(preview.commits).toBe(1);
  await page.getByRole('button', { name: 'Conserver le fond', exact: true }).click();
  await expect.poll(async () => (await state(page)).project.draftVersion).toBe(2);
  const saved = await state(page);
  expect(saved.project.snapshot.theme.tokens['color.background'].value).toBe('#000000');
  expect(saved.project.snapshot.pages[0].composition.content[0].props.title).toBe('Le titre retouché dans Manifest');
  expect(saved.modelCalls).toBe(0);
});

test('un thème verrouillé refuse le fond reçu avec un message sans fermer l’éditeur', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await installLaunchTransport(page, blackLaunch, { existingHero: true, lockedTheme: true });
  await expect(page.locator('.launch-status')).toContainText('verrouillé');
  await expect(page.getByRole('textbox', { name: 'Description de la page', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Un contenu déjà conservé', exact: true })).toBeVisible();
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('button', { name: 'Conserver le fond', exact: true })).toHaveCount(0);
  const current = await state(page);
  expect(current.project.snapshot.theme.tokens['color.background'].value).toBe('#ffffff');
  expect(current.commits).toBe(0);
  expect(current.modelCalls).toBe(0);
  expect(errors).toEqual([]);
});
