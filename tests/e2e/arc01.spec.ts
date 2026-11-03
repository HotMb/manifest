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
  await page.addInitScript(({ key, project }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, project }));
  }, { key: STORAGE_KEY, project: heroProject() });
  await page.goto('/');
  if ((page.viewportSize()?.width ?? 1280) <= 1100) await expect(page.getByRole('textbox', { name: 'Description de la page', exact: true })).toBeVisible();
  else await expect(page.getByRole('heading', { name: INITIAL_TITLE, exact: true })).toBeVisible();
  await expect(page.getByText('Diagnostic navigateur · sauvegarde locale', { exact: true })).toBeVisible();
}

async function openSettings(page: Page) {
  const desktopSettings = page.locator('.inspector-tabs').getByRole('button', { name: 'Réglages', exact: true });
  const isMobileLayout = (page.viewportSize()?.width ?? 1280) <= 767;
  if (isMobileLayout) await page.getByRole('button', { name: 'Réglages du bloc', exact: true }).click();
  else if (await page.locator('.inspector').isVisible()) await desktopSettings.click();
  else await page.getByRole('button', { name: 'Modifier le bloc', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toBeVisible();
}

async function screenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOTS, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${SCREENSHOTS}${filename}`, fullPage: true, animations: 'disabled' });
}

test('l’atelier suit la hiérarchie Figma sur desktop et replie les rails sous 1100 px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEditor(page);
  await expect(page.getByRole('navigation', { name: 'Étapes de conception' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Décrire' })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('heading', { name: 'Décrivez votre interface', exact: true })).toBeVisible();
  await expect(page.getByRole('main', { name: 'Aperçu modifiable de la page' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Panneau de conception' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Préparer le rapport', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Préparer le rapport', exact: true })).not.toHaveClass(/button--primary/);

  const layout = await page.locator('.workspace').evaluate((element) => {
    const columns = getComputedStyle(element).gridTemplateColumns.split(' ').map(Number.parseFloat);
    return { columns };
  });
  expect(layout.columns).toHaveLength(2);
  expect(layout.columns[0]).toBeGreaterThanOrEqual(264);
  expect(layout.columns[0]).toBeLessThanOrEqual(280);

  await page.locator('#page-description').fill('Je veux un accent vert et aucune animation.');
  await page.getByLabel('Analyse automatique locale', { exact: true }).check();
  await expect(page.locator('.hint-card')).toHaveCount(2, { timeout: 6_000 });
  await expect(page.getByRole('complementary', { name: 'Panneau de conception' })).toBeVisible();
  const composedColumns = await page.locator('.workspace').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').map(Number.parseFloat));
  expect(composedColumns).toHaveLength(3);
  expect(composedColumns[0]).toBeGreaterThanOrEqual(264);
  expect(composedColumns[0]).toBeLessThanOrEqual(280);
  expect(composedColumns[2]).toBeGreaterThanOrEqual(264);
  expect(composedColumns[2]).toBeLessThanOrEqual(280);

  await page.setViewportSize({ width: 1000, height: 1000 });
  await expect(page.locator('.mobile-tabs')).toBeVisible();
  await expect(page.getByRole('main', { name: 'Aperçu modifiable de la page' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Décrivez votre interface', exact: true })).toBeHidden();
  await expect(page.getByRole('complementary', { name: 'Panneau de conception' })).toBeHidden();
  await page.locator('.mobile-tabs').getByRole('button', { name: 'Description' }).click();
  await expect(page.getByRole('heading', { name: 'Décrivez votre interface', exact: true })).toBeVisible();
});

test('les étapes transfèrent le focus après le changement de panneau sur mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await openEditor(page);
  await page.getByRole('button', { name: 'Décrire' }).click();
  await expect(page.locator('#page-description')).toBeFocused();
  await page.getByRole('button', { name: 'Composer' }).click();
  await expect(page.locator('#page-preview')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Composer' })).toHaveAttribute('aria-current', 'step');
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

test('la largeur 375 px garde les actions accessibles au clavier et un seul panneau visible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openEditor(page);
  await page.getByRole('button', { name: 'Aperçu de la page', exact: true }).click();
  await expect(page.getByRole('heading', { name: INITIAL_TITLE, exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Panneau de conception', exact: true })).not.toBeVisible();
  await screenshot(page, 'arc01-mobile-preview.png');

  const settings = page.getByRole('button', { name: 'Réglages du bloc', exact: true });
  await settings.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Titre', exact: true })).toBeVisible();
  await expect(page.getByRole('main', { name: 'Aperçu modifiable de la page', exact: true })).not.toBeVisible();
  const title = page.getByRole('textbox', { name: 'Titre', exact: true });
  await title.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Un atelier sur mobile');
  await expect(title).toBeFocused();
  await expect(title).toHaveValue('Un atelier sur mobile');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await screenshot(page, 'arc01-mobile-settings.png');
  await expect(page.getByRole('button', { name: 'Brouillon v1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Aperçu de la page', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Un atelier sur mobile', exact: true })).toBeVisible();
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
