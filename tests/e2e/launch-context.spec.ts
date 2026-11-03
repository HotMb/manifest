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

async function installLaunchTransport(page: Page, launch: EditorLaunchContext, options: { existingHero?: boolean; draftVersion?: number; configuredModel?: boolean; holdCommits?: boolean; lockedTheme?: boolean } = {}) {
  // Simulate only the host boundary. The real Editor and shared document operations execute.
  // No provider API or native conversation is consulted by this fixture.
  await page.route('**/packages/host-adapters/src/index.ts*', (route) => route.fulfill({ contentType: 'text/javascript', body: `
    import { initialProject, createHeroBlock, applyOperations, hashSnapshot, validateCommand, disconnectedProviderRegistry } from ${JSON.stringify(route.request().url().replace(/host-adapters\/src\/index\.ts.*$/, 'm0-contract/src/index.ts'))};
    let project = initialProject(), latest = ${JSON.stringify(launch)}, commits = 0, modelCalls = 0;
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
      startSuggestion: async () => { modelCalls++; throw new Error('Aucun modèle ne doit être appelé au lancement.'); },
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
  await page.waitForTimeout(1100);
  expect(await state(page)).toEqual(before);
  const screenshots = fileURLToPath(new URL('../../.team/screenshots/launch-context/', import.meta.url));
  mkdirSync(screenshots, { recursive: true });
  await page.screenshot({ path: `${screenshots}01-chat-black-preview.png`, fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Ignorer le fond', exact: true }).click();
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('button', { name: 'Conserver le fond', exact: true })).toHaveCount(0);
  expect(await state(page)).toEqual(before);
});

test('conserver le fond sauvegarde le choix et préserve le contenu de la page existante', async ({ page }) => {
  await installLaunchTransport(page, { ...blackLaunch, assistantProposal: 'Une page sur fond noir avec son contenu conservé.' }, { existingHero: true });
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

test('la génération manuelle et automatique reste suspendue pendant l’aperçu du fond reçu', async ({ page }) => {
  await installLaunchTransport(page, blackLaunch, { configuredModel: true });
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await page.locator('.model-provider-disclosure > summary').click();
  await page.getByLabel('Fournisseur', { exact: true }).selectOption('openai');
  await page.getByRole('checkbox', { name: 'Analyse automatique du modèle', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Proposer maintenant', exact: true })).toBeDisabled();
  // Cross the 1.5 s generation pause with a model selected and automatic mode enabled.
  await page.waitForTimeout(1800);
  expect((await state(page)).modelCalls).toBe(0);
  expect((await state(page)).commits).toBe(0);
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
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
