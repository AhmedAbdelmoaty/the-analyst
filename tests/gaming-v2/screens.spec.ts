import { expect, test } from '@playwright/test';
import { mockAccount } from './fixture';

for (const [width, height] of [[1366, 768], [360, 800]]) {
  test(`M1 Plans and Setup at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await mockAccount(page, { incomplete: true, plans: true });
    await page.goto('/plans'); await page.screenshot({ path: `artifacts/gaming-v2/plans-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'ابدأ مجانًا', exact: true }).click();
    await expect(page.getByRole('radio', { name: 'محللة', exact: true })).toBeVisible();
    await page.screenshot({ path: `artifacts/gaming-v2/setup-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
