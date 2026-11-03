import { expect, test } from '@playwright/test';
import { mockAccount } from '../gaming-v2/fixture';

async function loadedImages(page: import('@playwright/test').Page, selector: string) {
  await expect.poll(() => page.locator(selector).evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
}

for (const width of [1280, 768, 390, 360]) {
  test(`arcade screens ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 1000 ? 800 : width >= 600 ? 1024 : 844 });
    await mockAccount(page); await page.goto('/app');
    await expect(page.locator('.hub-grid .game-cover-card')).toHaveCount(6);
    await loadedImages(page, '.hub-grid .game-cover-art img');
    await page.evaluate(() => document.fonts.ready);
    const rows = await page.locator('.hub-grid .game-cover-card').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().y));
    if (width === 1280) { expect(rows[0]).toBe(rows[2]); expect(rows[3]).toBe(rows[5]); }
    else { expect(rows[0]).toBe(rows[1]); expect(rows[2]).toBeGreaterThan(rows[0]); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/gaming-v4/hub-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: /مركز اللاعب/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: `artifacts/gaming-v4/player-${width}.png`, fullPage: false });
    await page.keyboard.press('Escape');

    await page.goto('/plans'); await expect(page.locator('.pass-card')).toHaveCount(2);
    await page.screenshot({ path: `artifacts/gaming-v4/plans-${width}.png`, fullPage: true });
    await page.goto('/'); await expect(page.getByRole('region', { name: 'استكشف الألعاب' })).toBeVisible();
    await page.screenshot({ path: `artifacts/gaming-v4/landing-${width}.png`, fullPage: true });
  });
}

for (const width of [1280, 390, 360]) {
  test(`arcade character ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 800 ? 800 : 844 });
    await mockAccount(page, { incomplete: true }); await page.goto('/setup');
    await expect(page.getByRole('radio', { name: 'محللة' })).toBeVisible();
    await loadedImages(page, '.avatar-option img');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/gaming-v4/setup-${width}.png`, fullPage: true });
    await page.getByRole('radio', { name: 'محللة' }).click();
    await expect(page.getByRole('radio', { name: 'محللة' })).toHaveAttribute('aria-checked', 'true');
  });
}

test('mission card lifts, tilts, and shows a keyboard focus state', async ({ page }) => {
  await mockAccount(page); await page.setViewportSize({ width: 1280, height: 800 }); await page.goto('/app');
  const card = page.getByRole('button', { name: 'ابدأ اللعب: قرار التكريم' });
  await card.hover();
  await expect.poll(() => card.evaluate(el => getComputedStyle(el).transform)).not.toBe('none');
  await expect.poll(() => card.evaluate(el => (el as HTMLElement).style.getPropertyValue('--card-tilt-y'))).not.toBe('');
  await page.screenshot({ path: 'artifacts/gaming-v4/hub-hover-1280.png', fullPage: false });
  await card.focus();
  await expect(card).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await card.evaluate(el => getComputedStyle(el).transform)).toBe('none');
});

test('landing auto advances one card, pauses, and resumes without disabling manual controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await mockAccount(page, { guest: true }); await page.goto('/');
  const strip = page.getByRole('region', { name: 'استكشف الألعاب' });
  await expect(strip).toBeVisible();
  await page.waitForTimeout(5500);
  await expect.poll(() => strip.evaluate(el => el.scrollLeft)).toBeLessThan(-100);
  await page.getByRole('button', { name: 'إيقاف الحركة التلقائية' }).click();
  await page.mouse.move(0, 0);
  const pausedAt = await strip.evaluate(el => el.scrollLeft);
  await page.waitForTimeout(5500);
  expect(Math.abs((await strip.evaluate(el => el.scrollLeft)) - pausedAt)).toBeLessThan(5);
  await page.getByRole('button', { name: 'الألعاب التالية' }).click();
  await expect.poll(() => strip.evaluate(el => el.scrollLeft)).toBeLessThan(pausedAt - 100);
  await page.getByRole('button', { name: 'تشغيل الحركة التلقائية' }).click();
  await page.mouse.move(0, 0);
  const resumedAt = await strip.evaluate(el => el.scrollLeft);
  await page.waitForTimeout(5500);
  expect(await strip.evaluate(el => el.scrollLeft)).not.toBe(resumedAt);
  await strip.focus();
  const focusedAt = await strip.evaluate(el => el.scrollLeft);
  await page.waitForTimeout(5500);
  expect(Math.abs((await strip.evaluate(el => el.scrollLeft)) - focusedAt)).toBeLessThan(3);
});

test('system reduced motion disables landing autoplay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mockAccount(page, { guest: true });
  await page.goto('/');
  const strip = page.getByRole('region', { name: 'استكشف الألعاب' });
  await expect(strip).toBeVisible();
  const start = await strip.evaluate(el => el.scrollLeft);
  await page.waitForTimeout(5500);
  expect(Math.abs((await strip.evaluate(el => el.scrollLeft)) - start)).toBeLessThan(3);
  await expect(page.getByRole('button', { name: 'الحركة التلقائية متوقفة بسبب تقليل الحركة' })).toBeDisabled();
});

test('landing autoplay loops from the last card to the first', async ({ page }) => {
  await mockAccount(page, { guest: true }); await page.goto('/');
  const strip = page.getByRole('region', { name: 'استكشف الألعاب' });
  await expect(strip).toBeVisible();
  await strip.evaluate(el => { el.scrollLeft = -(el.scrollWidth - el.clientWidth); });
  await expect.poll(() => strip.evaluate(el => el.scrollLeft)).toBeLessThan(-100);
  await page.waitForTimeout(5500);
  await expect.poll(() => strip.evaluate(el => Math.abs(el.scrollLeft))).toBeLessThan(3);
});

test('all six original Hub cards navigate to their existing game routes', async ({ page }) => {
  await mockAccount(page);
  const games = [
    ['اسأل صح', '/play'],
    ['قرار التكريم', '/games/reward-decision'],
    ['ورا النقط', '/games/behind-the-dots'],
    ['الشفرة الأخيرة', '/games/crack-the-code'],
    ['مصفوفة القرار', '/games/decision-matrix'],
    ['ملف تحت التحقيق', '/games/investigation-file'],
  ] as const;
  for (const [title, route] of games) {
    await page.goto('/app');
    await page.getByRole('button', { name: `ابدأ اللعب: ${title}` }).click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
  }
});
