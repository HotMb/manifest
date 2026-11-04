import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { heroProject } from '../fixtures/m0-project.ts';

const INITIAL_TITLE = 'Des espaces conçus pour durer';
const STORAGE_KEY = 'design-workbench:m0:project-m0:v1';
const SCREENSHOTS = fileURLToPath(new URL('../../.team/screenshots/', import.meta.url));

async function openEditor(page: Page) {
  // Editing regressions exercise a previously saved populated project explicitly.
  // Fresh-user tests below never use this fixture initializer.
  const marker = `manifest:e2e:seed-editor-project:${Date.now()}:${Math.random()}`;
  await page.addInitScript(({ key, project, marker }) => {
    if (sessionStorage.getItem(marker) === 'done') return;
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(key, JSON.stringify({ expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, project }));
    sessionStorage.setItem(marker, 'done');
  }, { key: STORAGE_KEY, project: heroProject(), marker });
  await page.goto('/');
  if ((page.viewportSize()?.width ?? 1280) <= 1100) await expect(page.getByRole('textbox', { name: 'Description de la page', exact: true })).toBeVisible();
  else await expect(page.getByRole('heading', { name: INITIAL_TITLE, exact: true })).toBeVisible();
  await expect(page.getByText('Diagnostic navigateur · sauvegarde locale', { exact: true })).toBeVisible();
}

async function openSettings(page: Page) {
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toBeVisible();
}

async function screenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOTS, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${SCREENSHOTS}${filename}`, fullPage: true, animations: 'disabled' });
}

test('les trois zones restent visibles à partir de 560 px et se commutent sous ce seuil', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEditor(page);
  for (const width of [1440, 1100, 1000, 736, 560]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator('.description-panel')).toBeVisible();
    await expect(page.locator('.canvas-region')).toBeVisible();
    await expect(page.locator('.inspector')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Panneaux de l’atelier' })).toBeHidden();
    await expect(page.locator('.mobile-tabs, .workflow-bar, .inspector-tabs')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Réglages du bloc', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await page.setViewportSize({ width: 559, height: 844 });
  const nav = page.getByRole('navigation', { name: 'Panneaux de l’atelier' });
  await expect(nav).toBeVisible();
  await expect(page.locator('.description-panel')).toBeVisible();
  await expect(page.locator('.canvas-region')).toBeHidden();
  const describe = page.getByRole('button', { name: 'Décrire', exact: true });
  const preview = page.getByRole('button', { name: 'Aperçu', exact: true });
  const suggestions = page.getByRole('button', { name: 'Suggestions', exact: true });
  await describe.focus();
  await page.keyboard.press('Tab');
  await expect(preview).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(suggestions).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(preview).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.canvas-region')).toBeVisible();
  await expect(page.locator('.description-panel')).toBeHidden();
  await expect(preview).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('le lien clavier Aller à l’aperçu ouvre le panneau sur téléphone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openEditor(page);
  const skipLink = page.getByRole('link', { name: 'Aller à l’aperçu', exact: true });
  await skipLink.focus();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('.canvas-region')).toBeVisible();
  await expect(page.locator('.description-panel')).toBeHidden();
  await expect(page.locator('.canvas-region')).toBeFocused();
});

test('sur mobile la saisie pilote le candidat et les panneaux restent accessibles sans changer de page', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await openEditor(page);
  const description = page.locator('#page-description');
  await description.fill('Un fond noir');
  await expect(description).toBeFocused();
  await page.getByRole('button', { name: 'Aperçu', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Aperçu du candidat local', exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).not.toBeNull();
  await page.getByRole('button', { name: 'Conserver la proposition locale', exact: true }).click();
  await page.getByRole('button', { name: 'Décrire', exact: true }).click();
  await expect(description).toHaveValue('Un fond noir');
  await expect(page.locator('.description-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Brouillon v1', exact: true })).toBeVisible();
});

test('les réglages modifient la page et une sauvegarde locale survit au rechargement', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEditor(page);
  await expect(page.getByRole('button', { name: 'Enregistrer le brouillon', exact: true })).toBeDisabled();
  await screenshot(page, 'arc01-desktop.png');
  await openSettings(page);

  const editorBackground = await page.locator('.topbar').evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Des lieux pour vivre ensemble');
  await page.getByRole('textbox', { name: 'Texte de présentation', exact: true }).fill('Un atelier qui transforme les usages en espaces durables.');
  await page.getByLabel('Fond de la page', { exact: true }).fill('#dbe9ec');
  await page.getByLabel('Texte', { exact: true }).fill('#152f39');
  await page.getByLabel('Accent', { exact: true }).fill('#315f73');

  await expect(page.getByRole('heading', { name: 'Des lieux pour vivre ensemble', exact: true })).toBeVisible();
  await expect(page.locator('.site-hero')).toHaveCSS('background-color', 'rgb(219, 233, 236)');
  expect(await page.locator('.topbar').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(editorBackground);
  await expect(page.locator('.statusbar').getByRole('status')).toContainText('Modifications non enregistrées');
  await expect(page.locator('.statusbar').getByRole('status')).toContainText('Brouillon enregistré dans ce navigateur.');
  await expect(page.getByRole('button', { name: 'Voir la version 1', exact: true })).toBeVisible();
  await page.reload();

  await openSettings(page);
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveValue('Des lieux pour vivre ensemble');
  await expect(page.getByRole('textbox', { name: 'Texte de présentation', exact: true })).toHaveValue('Un atelier qui transforme les usages en espaces durables.');
  await expect(page.getByLabel('Fond de la page', { exact: true })).toHaveValue('#dbe9ec');
  await expect(page.getByLabel('Texte', { exact: true })).toHaveValue('#152f39');
  await expect(page.getByLabel('Accent', { exact: true })).toHaveValue('#315f73');
  await expect(page.getByRole('button', { name: 'Enregistrer le brouillon', exact: true })).toBeDisabled();
  await screenshot(page, 'arc01-desktop-edited.png');
});

test('annuler puis rétablir restitue le document et le réglage visible', async ({ page }) => {
  await openEditor(page);
  await openSettings(page);
  await expect(page.getByRole('button', { name: 'Annuler', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Une nouvelle direction');
  await expect(page.getByRole('heading', { name: 'Une nouvelle direction', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.getByRole('heading', { name: INITIAL_TITLE, exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveValue(INITIAL_TITLE);
  await page.getByRole('button', { name: 'Rétablir', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Une nouvelle direction', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveValue('Une nouvelle direction');
});

test('deux vues ne peuvent écraser silencieusement la même version locale', async ({ page, context }) => {
  await openEditor(page);
  const second = await context.newPage();
  await openEditor(second);
  await openSettings(page);
  await openSettings(second);
  await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Version conservée dans la première vue');
  await expect(page.getByRole('button', { name: 'Voir la version 1', exact: true })).toBeVisible();

  await second.getByRole('textbox', { name: 'Titre', exact: true }).fill('Réglage encore ouvert dans la seconde vue');
  await expect(second.getByRole('alert')).toContainText('Le brouillon a changé ailleurs');
  await expect(second.getByRole('textbox', { name: 'Titre', exact: true })).toHaveValue('Réglage encore ouvert dans la seconde vue');
  await expect(second.getByRole('button', { name: 'Enregistrer le brouillon', exact: true })).toBeDisabled();

  await second.getByRole('button', { name: 'Recharger…', exact: true }).click();
  const dialog = second.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Garder mes réglages', exact: true })).toBeFocused();
  await dialog.getByRole('button', { name: 'Recharger la version', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(second.getByRole('textbox', { name: 'Titre', exact: true })).toHaveValue('Version conservée dans la première vue');
  await expect(second.getByRole('alert')).toHaveCount(0);
});

test('la largeur 375 px garde le contenu et les actions accessibles au clavier', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openEditor(page);
  const title = page.getByRole('textbox', { name: 'Titre', exact: true });
  await title.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Un atelier sur mobile');
  await expect(title).toBeFocused();
  await expect(title).toHaveValue('Un atelier sur mobile');
  await page.getByRole('button', { name: 'Aperçu', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Un atelier sur mobile', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Suggestions', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Panneau de conception', exact: true })).toBeVisible();
  await expect(page.locator('.canvas-region')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await screenshot(page, 'arc01-mobile-workspace.png');
  await expect(page.getByRole('button', { name: 'Brouillon v1', exact: true })).toBeVisible();
});

test('le mouvement réduit laisse la page immédiatement lisible sans animation du Hero', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openEditor(page);
  await openSettings(page);
  await expect(page.locator('.site-hero__body')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.site-hero__body')).toHaveCSS('opacity', '1');
});

test('un mode MCP sans hôte affiche un échec et ne passe jamais en diagnostic local', async ({ page }) => {
  await page.goto('/?host=mcp');
  await expect(page.getByRole('heading', { name: 'L’atelier n’a pas pu s’ouvrir', exact: true })).toBeVisible({ timeout: 18_000 });
  await expect(page.getByRole('alert')).toContainText('connexion à l’hôte');
  await expect(page.getByRole('button', { name: 'Réessayer la connexion', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enregistrer le brouillon', exact: true })).toHaveCount(0);
  await expect(page.getByText(/Diagnostic navigateur/)).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('un brouillon expiré reste intact et se récupère seulement après une action explicite', async ({ page }) => {
  await openEditor(page);
  await openSettings(page);
  const title = 'Un brouillon à retrouver après expiration';
  await page.getByRole('textbox', { name: 'Titre', exact: true }).fill(title);
  await expect(page.getByRole('button', { name: 'Voir la version 1', exact: true })).toBeVisible();
  const expiredRecord = await page.evaluate((key) => {
    const record = JSON.parse(localStorage.getItem(key)!);
    record.expiresAt = Date.now() - 1000;
    const raw = JSON.stringify(record);
    localStorage.setItem(key, raw);
    return raw;
  }, STORAGE_KEY);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Brouillon local à reprendre', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reprendre le brouillon expiré', exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(expiredRecord);
  await expect(page.getByRole('button', { name: 'Enregistrer le brouillon', exact: true })).toHaveCount(0);
  await screenshot(page, 'arc01-recovery-expired.png');

  await page.getByRole('button', { name: 'Reprendre le brouillon expiré', exact: true }).click();
  await openSettings(page);
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveValue(title);
  await expect(page.getByRole('button', { name: 'Voir la version 1', exact: true })).toBeVisible();
  const recovered = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  expect(recovered.project.snapshot.pages[0].composition.content[0].props.title).toBe(title);
  expect(recovered.project.draftVersion).toBe(1);
  expect(recovered.expiresAt).toBeGreaterThan(Date.now());
});

test('une sauvegarde incertaine conserve sa capture puis les nouveaux réglages après vérification', async ({ page }) => {
  await openEditor(page);
  await openSettings(page);
  const originalRecord = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    let failNext = true;
    Storage.prototype.setItem = function (name: string, value: string) {
      if (name === key && failNext) {
        failNext = false;
        throw new DOMException('Échec de stockage simulé avant écriture', 'QuotaExceededError');
      }
      return original.call(this, name, value);
    };
  }, STORAGE_KEY);

  const capturedTitle = 'Capture de la sauvegarde interrompue';
  const newerTitle = 'Nouveaux réglages conservés dans la page';
  await page.getByRole('textbox', { name: 'Titre', exact: true }).fill(capturedTitle);
  await page.getByRole('button', { name: 'Enregistrer le brouillon', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('n’a pas été enregistré');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(originalRecord);

  await page.getByRole('textbox', { name: 'Titre', exact: true }).fill(newerTitle);
  await page.getByRole('button', { name: 'Vérifier la version enregistrée', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveValue(newerTitle);
  await page.getByRole('button', { name: 'Réessayer l’enregistrement en attente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Voir la version 1', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveValue(newerTitle);
  const captured = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  expect(captured.project.snapshot.pages[0].composition.content[0].props.title).toBe(capturedTitle);

  await page.getByRole('button', { name: 'Enregistrer le brouillon', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Voir la version 2', exact: true })).toBeVisible();
  const final = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  expect(final.project.snapshot.pages[0].composition.content[0].props.title).toBe(newerTitle);
  await page.reload();
  await openSettings(page);
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toHaveValue(newerTitle);
});
