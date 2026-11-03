import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './gaming-v4', timeout: 40000, expect: { timeout: 8000 }, workers: 1,
  reporter: 'list', outputDir: '../artifacts/gaming-v4/results',
  use: { baseURL: 'http://127.0.0.1:8097', browserName: 'chromium', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 8097 --strictPort', url: 'http://127.0.0.1:8097', reuseExistingServer: true },
});
