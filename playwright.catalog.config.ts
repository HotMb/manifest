import { defineConfig } from '@playwright/test';

// Isolated catalog-render tests use page.setContent and do not need the editor server.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'catalog-composed-motion.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [['list']],
  outputDir: '.team/playwright-catalog-results',
  use: {
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
