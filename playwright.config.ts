import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  reporter: "list",
  timeout: 35_000,
  expect: { timeout: 8_000 },
  use: { baseURL: "http://127.0.0.1:8091", browserName: "chromium", headless: true, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 8091 --strictPort", url: "http://127.0.0.1:8091/tests/behind-dots-visual-harness.html", reuseExistingServer: !process.env.CI, timeout: 30_000 },
  outputDir: "test-results/behind-dots",
});
