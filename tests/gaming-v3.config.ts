import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './gaming-v3', timeout: 30000, expect: { timeout: 7000 }, workers: 1,
  reporter: 'list', outputDir: '../artifacts/gaming-v3/results',
  use: { baseURL: 'http://127.0.0.1:8097', browserName: 'chromium', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 8097 --strictPort', url: 'http://127.0.0.1:8097', reuseExistingServer: true },
});
