import { expect, test } from '@playwright/test';
import { mockAccount } from '../gaming-v2/fixture';

async function loadedImages(page: import('@playwright/test').Page, selector: string) {
  await expect.poll(() => page.locator(selector).evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
}

for (const width of [1280, 768, 390, 360]) {
  test(`world screens at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 800 ? 800 : width > 500 ? 1024 : 844 });
    await mockAccount(page); await page.goto('/app');
    await expect(page.locator('.hub-grid .game-cover-card')).toHaveCount(6);
    await loadedImages(page, '.hub-grid .game-cover-art img');
    await page.evaluate(() => document.fonts.ready);
    const positions = await page.locator('.hub-grid .game-cover-card').evaluateAll(cards => cards.map(card => ({ x: card.getBoundingClientRect().x, y: card.getBoundingClientRect().y })));
    if (width === 1280) { expect(positions[0].y).toBe(positions[2].y); expect(positions[3].y).toBe(positions[5].y); }
    else { expect(positions[0].y).toBe(positions[1].y); expect(positions[2].y).toBeGreaterThan(positions[0].y); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/gaming-v3/hub-${width}.png`, fullPage: true });

    await page.goto('/plans'); await expect(page.locator('.pass-card')).toHaveCount(2);
    await page.screenshot({ path: `artifacts/gaming-v3/plans-${width}.png`, fullPage: true });
    await page.goto('/'); await expect(page.getByRole('region', { name: 'استكشف الألعاب' })).toBeVisible();
    await page.screenshot({ path: `artifacts/gaming-v3/landing-${width}.png`, fullPage: true });
  });
}

for (const width of [1280, 390, 360]) {
  test(`character stage at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 800 ? 800 : 844 });
    await mockAccount(page, { incomplete: true }); await page.goto('/setup');
    await expect(page.getByRole('radio', { name: 'محللة' })).toBeVisible();
    await loadedImages(page, '.avatar-option img');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByLabel('الاسم الأول', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: `artifacts/gaming-v3/setup-${width}.png`, fullPage: true });
    await page.getByRole('radio', { name: 'محللة' }).click();
    await expect(page.getByRole('radio', { name: 'محللة' })).toHaveAttribute('aria-checked', 'true');
  });
}

test('missing signup name uses account settings recovery, not setup name fields', async ({ page }) => {
  await mockAccount(page, { incomplete: true, missingName: true }); await page.goto('/setup');
  await expect(page.getByText('بيانات الاسم ناقصة في حسابك.')).toBeVisible();
  await expect(page.getByLabel('الاسم الأول', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ابدأ مغامرتك' })).toBeDisabled();
  await page.getByRole('button', { name: /مركز اللاعب/ }).click();
  await page.getByRole('button', { name: 'تعديل بياناتي' }).click();
  await expect(page.getByLabel('الاسم الأول', { exact: true })).toBeVisible();
});
