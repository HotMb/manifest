import { test, expect } from '@playwright/test';

test('éditeur web charge le renderer catalogue sans erreur de résolution Vite', async ({ page }) => {
  const moduleResolutionErrors: string[] = [];
  const browserErrors: string[] = [];
  const failedResponses: string[] = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const location = message.location();
    browserErrors.push(`${message.text()} (${location.url}:${location.lineNumber}:${location.columnNumber})`);
    if (/Failed to resolve import|@design-workbench\/catalog/i.test(message.text())) moduleResolutionErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('/');

  await expect(page.locator('#root > *')).toHaveCount(1);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('#root')).not.toContainText(/Failed to resolve import/i);
  expect(moduleResolutionErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
  expect(browserErrors).toEqual([]);
  await page.screenshot({ path: 'docs/evidence/GEN-02/editor-workspace-smoke.png' });
});
