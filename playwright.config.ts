import { defineConfig } from '@playwright/test';

const testPort = Number(process.env.MANIFEST_TEST_PORT ?? 4173);
const testUrl = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [['list']],
  outputDir: '.team/playwright-results',
  use: {
    baseURL: testUrl,
    browserName: 'chromium',
    ...(process.env.CI ? {} : { channel: 'chrome' }),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run dev --workspace @design-workbench/editor-web -- --port ${testPort} --strictPort`,
    url: testUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
