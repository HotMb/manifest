import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const searchLabel = 'Rechercher un composant ou une animation';
const storageKey = 'design-workbench:m0:project-m0:v1';

test('la recherche à droite filtre les exemples et laisse le brief et le document intacts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const search = page.getByRole('searchbox', { name: searchLabel, exact: true });
  const list = page.getByRole('list', { name: 'Exemples de composants et d’animations', exact: true });
  await expect(search).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(7);
  await page.getByRole('textbox', { name: 'Description de la page', exact: true }).fill('Mon brief doit rester tel quel.');
  const before = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  const background = await page.locator('.canvas-frame').evaluate((element) => getComputedStyle(element).backgroundColor);
  const version = await page.locator('.footer-version').textContent();
  await search.fill('MENU');
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list.getByRole('heading', { name: 'Menu de navigation', exact: true })).toBeVisible();
  await search.fill('accordeon');
  await expect(list.getByRole('heading', { name: 'Accordéon FAQ', exact: true })).toBeVisible();
  await search.fill('animation entree');
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await search.fill('introuvable-xyz');
  await expect(page.getByText('Aucun exemple trouvé', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Effacer la recherche de composants', exact: true }).click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('');
  await expect(list.getByRole('listitem')).toHaveCount(7);
  await expect(page.getByRole('textbox', { name: 'Description de la page', exact: true })).toHaveValue('Mon brief doit rester tel quel.');
  await expect(page.locator('.canvas-frame')).toHaveCSS('background-color', background);
  expect(await page.locator('.footer-version').textContent()).toBe(version);
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(before);
});

test('les exemples sont utilisables au clavier et respectent le mouvement réduit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const search = page.getByRole('searchbox', { name: searchLabel, exact: true });
  await search.fill('menu');
  const menuToggle = page.getByRole('button', { name: 'Voir l’exemple : Menu de navigation', exact: true });
  await menuToggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Fermer l’exemple : Menu de navigation', exact: true })).toHaveAttribute('aria-expanded', 'true');
  const menu = page.getByRole('region', { name: 'Exemple : Menu de navigation', exact: true });
  await menu.getByRole('button', { name: 'Services', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(menu.getByText('Découvre nos services.', { exact: true })).toBeVisible();
  await search.fill('FAQ');
  await page.getByRole('button', { name: 'Voir l’exemple : Accordéon FAQ', exact: true }).click();
  await page.getByText('Comment ça fonctionne ?', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Une question à la fois, avec sa réponse juste en dessous.', { exact: true })).toBeVisible();
  await search.fill('fondu');
  await page.getByRole('button', { name: 'Voir l’exemple : Fondu à l’entrée', exact: true }).click();
  await expect(page.locator('.example-motion-tile')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: 'Rejouer l’animation', exact: true }).click();
  await expect(page.locator('.example-motion-tile')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.example-motion-tile')).toHaveCSS('opacity', '1');
  await search.focus();
  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('');
  await expect(page.getByRole('region', { name: 'Exemple : Fondu à l’entrée', exact: true })).toHaveCount(0);
});

test('le catalogue reste dans la même surface et devient un panneau sélectionnable sur téléphone', async ({ page }) => {
  await page.goto('/');
  for (const width of [1440, 900, 736]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator('.description-panel')).toBeVisible();
    await expect(page.locator('.canvas-region')).toBeVisible();
    await expect(page.locator('.inspector')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Panneaux de l’atelier' })).toBeHidden();
    await expect(page.getByRole('searchbox', { name: searchLabel, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await page.setViewportSize({ width: 375, height: 844 });
  await expect(page.getByRole('navigation', { name: 'Panneaux de l’atelier' })).toBeVisible();
  await expect(page.locator('.description-panel')).toBeVisible();
  await expect(page.locator('.inspector')).toBeHidden();
  await page.getByRole('button', { name: 'Suggestions', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: searchLabel, exact: true })).toBeVisible();
  await expect(page.locator('.description-panel')).toBeHidden();
  await expect(page.locator('.canvas-region')).toBeHidden();
  await page.getByRole('searchbox', { name: searchLabel, exact: true }).fill('menu');
  await expect(page.getByRole('heading', { name: 'Menu de navigation', exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel('Fond de la page', { exact: true }).fill('#000000');
  await page.getByRole('searchbox', { name: searchLabel, exact: true }).fill('fondu');
  await page.getByRole('button', { name: 'Voir l’exemple : Fondu à l’entrée', exact: true }).click();
  const directory = fileURLToPath(new URL('../../.team/screenshots/component-examples/', import.meta.url));
  mkdirSync(directory, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${directory}01-search-fade-desktop.png`, fullPage: true, animations: 'disabled' });
});
