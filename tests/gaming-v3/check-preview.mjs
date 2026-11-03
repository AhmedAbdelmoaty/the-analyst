import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const failures = [];
page.on('requestfailed', request => failures.push(`${request.url()}: ${request.failure()?.errorText}`));
page.on('pageerror', error => failures.push(error.message));
page.on('console', message => { if (message.type() === 'error') failures.push(`console: ${message.text()}`); });
await page.goto('http://127.0.0.1:8099/tests/gaming-v3/preview.html');
await page.getByRole('button', { name: /لاعب عائد/ }).click();
await page.locator('.hub-grid .game-cover-card').first().waitFor({ state: 'visible', timeout: 10000 });
const cards = await page.locator('.hub-grid .game-cover-card').count();
const unexpected = failures.filter(message => !message.includes('googletagmanager.com'));
console.log(JSON.stringify({ url: page.url(), cards, unexpected }, null, 2));
if (cards !== 6 || unexpected.length) process.exitCode = 1;
await browser.close();
