import { expect, test } from '@playwright/test';
import { mockAccount, owner } from './fixture';

test('Hub uses six original covers and honest saved states without invented achievements', async ({ page }) => {
  await mockAccount(page);
  await page.addInitScript(owner => {
    localStorage.setItem(`the-analyst:investigation-file:v1:${owner}`, JSON.stringify({ version: 1, status: 'completed', outcome: 'failure' }));
    localStorage.setItem(`analyst-crack-the-code-v2:${owner}`, JSON.stringify({ progress: { 0: { score: 50 } } }));
  }, owner);
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'اختار مغامرتك' })).toBeVisible();
  await expect(page.locator('.game-cover-card')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'عرض النتيجة: ملف تحت التحقيق' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'كمّل اللعب: الشفرة الأخيرة' })).toBeVisible();
  await expect(page.getByText('وصلت للنهاية', { exact: true })).toHaveCount(1);
  await expect(page.getByText(/محلل مبتدئ|إنجازات/)).toHaveCount(0);
  await page.getByRole('button', { name: 'عرض النتيجة: ملف تحت التحقيق' }).click();
  await expect(page).toHaveURL(/\/games\/investigation-file\?showResult=1$/);
});

test('unknown and denied access have truthful actions and retain game gates', async ({ page }) => {
  await mockAccount(page, { enforcement: true, entitled: false }); await page.goto('/app');
  await expect(page.getByRole('button', { name: 'افتح الوصول: قرار التكريم' })).toBeVisible();
  await page.getByRole('button', { name: 'افتح الوصول: قرار التكريم' }).click();
  await expect(page).toHaveURL(/\/plans$/);
});

test('Player Center edits existing secure fields and restores focus on close', async ({ page }) => {
  const { patches } = await mockAccount(page); await page.goto('/app');
  const trigger = page.getByRole('button', { name: /مركز اللاعب/ }); await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'تعديل بياناتي' }).click();
  await page.getByLabel('الاسم الأول', { exact: true }).fill('ندى');
  await page.getByRole('button', { name: 'حفظ التعديلات' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'اتحفظت' })).toContainText('اتحفظت');
  expect(patches).toHaveLength(1);
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
});
