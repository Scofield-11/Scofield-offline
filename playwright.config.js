import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', testIgnore: '**/pwa.spec.js', fullyParallel: false, workers: 1,
  timeout: 45000, expect: { timeout: 10000 },
  use: { baseURL: 'http://127.0.0.1:5173', channel: 'msedge', headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
