import { expect, test } from '@playwright/test';
import { mockAccount } from './fixture';

test('Plans contains only two passes and preserves verified account pricing', async ({ page }) => {
  await mockAccount(page); await page.goto('/plans');
  await expect(page.locator('[data-annual-price="400"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ابدأ مجانًا' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'التجربة الكاملة' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'اختار مغامرتك' })).toHaveCount(0);
});

test('fresh account refreshes Plans then Setup, saves secure fields and reaches Hub', async ({ page }) => {
  const { patches, forbidden } = await mockAccount(page, { incomplete: true, plans: true });
  await page.goto('/app'); await expect(page).toHaveURL(/\/plans$/);
  await page.reload(); await page.getByRole('button', { name: 'ابدأ مجانًا', exact: true }).click();
  await expect(page).toHaveURL(/\/setup$/); await page.reload();
  await expect(page.getByLabel('الاسم الأول', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('الاسم الأخير', { exact: true })).toHaveCount(0);
  await expect(page.getByText('تركيز', { exact: true })).toHaveCount(0);
  await page.getByRole('radio', { name: /محللة/ }).click();
  await page.getByRole('combobox').nth(0).click(); await page.getByRole('option', { name: /Finance|المالية/, exact: true }).click();
  await page.getByRole('combobox').nth(1).click(); await page.getByRole('option', { name: /Technology & Telecom|التكنولوجيا والاتصالات/, exact: true }).click();
  await page.getByRole('button', { name: 'ابدأ مغامرتك', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  expect(patches).toEqual([{ filter: 'eq.00000000-0000-4000-a000-000000000002', patch: { gender: 'female', avatar_choice: 'sara', department: 'finance', department_other: null, industry: 'technology_telecom', industry_other: null } }]);
  expect(forbidden).toEqual([]);
});

test('Annual choice reaches payment summary even with a selected game', async ({ page }) => {
  const { forbidden } = await mockAccount(page);
  await page.addInitScript(() => sessionStorage.setItem('analyst-selected-game-v1', 'reward-decision'));
  await page.goto('/plans'); await page.getByRole('button', { name: /اختار السنوية|اشترك الآن/ }).click();
  await expect(page).toHaveURL(/\/subscription\/summary$/);
  await page.getByRole('link', { name: 'الألعاب', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  expect(forbidden).toEqual([]);
});
