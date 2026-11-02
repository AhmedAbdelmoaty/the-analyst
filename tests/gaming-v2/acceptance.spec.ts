import { expect, test } from '@playwright/test';
import { mockAccount } from './fixture';

for (const [width, height] of [[1440, 900], [1366, 768], [1280, 800], [768, 1024], [390, 844], [360, 800], [683, 384]]) {
  test(`Hub, Player Center and Landing responsive ${width}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await mockAccount(page); await page.setViewportSize({ width, height }); await page.goto('/app');
    await expect(page.locator('.game-cover-card')).toHaveCount(6);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const cards = await page.locator('.game-cover-card').evaluateAll(elements => elements.map(el => ({ x: el.getBoundingClientRect().x, y: el.getBoundingClientRect().y })));
    if (width >= 1200) { expect(cards[0].y).toBe(cards[2].y); expect(cards[3].y).toBe(cards[5].y); expect(cards[3].y).toBeGreaterThan(cards[0].y); }
    for (const image of await page.locator('.game-cover-art img').all()) { await image.scrollIntoViewIfNeeded(); await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0); }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `artifacts/gaming-v2/hub-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: /مركز اللاعب/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: `artifacts/gaming-v2/player-${width}.png`, fullPage: false });
    await page.keyboard.press('Escape'); await page.goto('/');
    await expect(page.getByRole('region', { name: 'استكشف الألعاب' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/gaming-v2/landing-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test('unknown access stays unknown and free game stays accessible', async ({ page }) => {
  await mockAccount(page, { enforcement: null, entitled: null }); await page.goto('/app');
  await expect(page.getByRole('button', { name: 'ابدأ اللعب: اسأل صح' })).toBeVisible();
  await page.getByRole('button', { name: 'تحقّق من الوصول: قرار التكريم' }).click();
  await expect(page.getByRole('heading', { name: 'تعذّر التحقق من اشتراكك الآن' })).toBeVisible();
});

test('profile error retains user edits; Other values require text', async ({ page }) => {
  const { patches } = await mockAccount(page, { profileError: true }); await page.goto('/app');
  await page.getByRole('button', { name: /مركز اللاعب/ }).click(); await page.getByRole('button', { name: 'تعديل بياناتي' }).click();
  await page.getByLabel('الاسم الأول', { exact: true }).fill('هدى');
  await page.getByRole('combobox').first().click(); await page.getByRole('option', { name: 'أخرى', exact: true }).click();
  await page.getByRole('button', { name: 'حفظ التعديلات' }).click(); expect(patches).toHaveLength(0);
  await page.getByLabel('اكتب القسم', { exact: true }).fill('قسم تجريبي'); await page.getByRole('button', { name: 'حفظ التعديلات' }).click();
  await expect(page.getByRole('alert')).toContainText('ماقدرناش'); await expect(page.getByLabel('الاسم الأول', { exact: true })).toHaveValue('هدى');
});

test('reduced motion suppresses transforms and keyboard Space navigates once', async ({ page }) => {
  await mockAccount(page); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/app');
  const card = page.getByRole('button', { name: 'ابدأ اللعب: ملف تحت التحقيق' }); await card.hover();
  expect(await card.evaluate(el => getComputedStyle(el).transform)).toBe('none');
  await card.focus(); await page.keyboard.press('Space'); await expect(page).toHaveURL(/\/games\/investigation-file$/);
});

test('fresh Annual flow survives a new tab and profile save preserves summary', async ({ page, context }) => {
  await mockAccount(page, { incomplete: true, plans: true }); await page.goto('/plans'); await page.getByRole('button', { name: 'اختار السنوية' }).click();
  await expect(page).toHaveURL(/\/setup$/);
  const next = await context.newPage(); await mockAccount(next, { incomplete: true }); await next.goto('/setup');
  await next.getByRole('radio', { name: 'محللة', exact: true }).click();
  await next.getByRole('combobox').nth(0).click(); await next.getByRole('option', { name: 'المالية', exact: true }).click();
  await next.getByRole('combobox').nth(1).click(); await next.getByRole('option', { name: 'التكنولوجيا والاتصالات', exact: true }).click();
  await next.getByRole('button', { name: 'ابدأ مغامرتك' }).click(); await expect(next).toHaveURL(/\/subscription\/summary$/);
});
