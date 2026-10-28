import { expect, test, type Page } from '@playwright/test';

async function openDesk(page: Page) {
  await page.addInitScript(() => { window.name = 'investigation-playtest-user'; });
  await page.goto('/investigation-file/index.html');
  await expect(page.getByRole('heading', { name: 'هل نقفل برنامج تطوير القيادات؟' })).toBeVisible();
  await page.getByRole('button', { name: /التالي/ }).click();
  await page.getByRole('button', { name: /التالي/ }).click();
  await page.getByRole('button', { name: /افتح التحقيق/ }).click();
  await expect(page.getByRole('heading', { name: 'هل استنتاج الـCFO عادل؟' })).toBeVisible();
}

async function attachPair(page: Page, first: string, second: string, clip: string) {
  await page.locator(`[data-id="${first}"]`).click();
  await page.locator(`[data-id="${second}"]`).click();
  await page.locator(`[data-clip="${clip}"]`).click();
}

async function setMix(page: Page, id: 'trainedMix' | 'untrainedMix', value: number) {
  await page.locator(`#${id}`).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    input.value = String(nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function pinAllProofs(page: Page) {
  for (const id of ['junior-comparison', 'senior-comparison', 'historical-distribution', 'shared-mix-result']) {
    await page.locator(`[data-proof="${id}"]`).click();
  }
}

async function prepareFullCase(page: Page) {
  await attachPair(page, 'jt', 'ju', '0');
  await attachPair(page, 'st', 'su', '1');
  await page.getByRole('button', { name: 'افتح سجل التركيبة' }).click();
  await page.locator('#trainedMix').focus();
  await setMix(page, 'trainedMix', 250);
  await setMix(page, 'untrainedMix', 250);
}

test('player inspects a valid shared 25% mix and builds the objection from its evidence', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await openDesk(page);
  await expect(page.locator('#trainedWhatIf')).toHaveText('35%');
  await expect(page.locator('#untrainedWhatIf')).toHaveText('65.7%');
  await expect(page.locator('#historicalReadout')).toBeHidden();
  await page.getByRole('button', { name: 'افتح سجل التركيبة' }).click();
  await expect(page.locator('#historicalReadout')).toBeVisible();
  await expect(page.locator('#historicalReadout')).toContainText('65.7% · 460/700');
  await expect(page.locator('#historicalReadout')).toContainText('85.7%');

  await setMix(page, 'trainedMix', 500);
  await expect(page.locator('#trainedWhatIf')).toHaveText('50%');
  await expect(page.locator('#trainedSeniorShare')).toHaveText('50%');
  await expect(page.locator('#untrainedSeniorShare')).toHaveText('14.3%');
  await expect(page.locator('#untrainedWhatIf')).toHaveText('65.7%');
  await setMix(page, 'untrainedMix', 500);
  await expect(page.locator('#untrainedWhatIf')).toHaveText('42.5%');
  await expect(page.locator('#untrainedSeniorShare')).toHaveText('50%');
  await setMix(page, 'trainedMix', 250);
  await expect(page.locator('#untrainedWhatIf')).toHaveText('42.5%');
  await setMix(page, 'untrainedMix', 250);
  await expect(page.locator('#trainedWhatIf')).toHaveText('35%');
  await expect(page.locator('#untrainedWhatIf')).toHaveText('26.3%');
  await expect(page.locator('#historicalReadout')).toContainText('35% · 140/400');
  await expect(page.locator('#historicalReadout')).toContainText('65.7% · 460/700');

  await attachPair(page, 'jt', 'ju', '0');
  await attachPair(page, 'st', 'su', '1');
  await page.screenshot({ path: testInfo.outputPath('investigation-v2-desk.png'), fullPage: true });
  await page.getByRole('button', { name: 'ارجع للاجتماع' }).click();

  // A correct recommendation with an unbuilt objection is recoverable, not a loss.
  await page.getByRole('button', { name: 'نوقف الإلغاء ونراجع أثر البرنامج' }).click();
  await expect(page.getByRole('heading', { name: 'هل استنتاج الـCFO عادل؟' })).toBeVisible();
  await expect(page.locator('#scaleMessage')).toContainText('الاعتراض لسه ناقصه دليل');
  expect(await page.evaluate(() => localStorage.getItem('the-analyst:investigation-file:v1:investigation-playtest-user')))
    .toContain('"status":"in-progress"');

  await page.getByRole('button', { name: 'ارجع للاجتماع' }).click();
  await pinAllProofs(page);
  await expect(page.locator('#evidenceSummary')).toHaveText('الأدلة المتثبتة في الاعتراض: 4 من ٤');
  await page.getByRole('button', { name: 'نوقف الإلغاء ونراجع أثر البرنامج' }).click();
  await expect(page.getByRole('heading', { name: 'القرار اتوقف في وقته!' })).toBeVisible();
  await expect(page.locator('#endingMath')).toContainText('Junior 25% للطرفين');
  await expect(page.locator('#endingMath')).toContainText('26.3%');
  await page.screenshot({ path: testInfo.outputPath('investigation-v2-success.png'), fullPage: true });
  await page.goto('/investigation-file/index.html?showResult=1');
  await expect(page.getByRole('heading', { name: 'القرار اتوقف في وقته!' })).toBeVisible();
  await expect(page.locator('#endingMath')).toContainText('مثال افتراضي');
  expect(await page.evaluate(() => localStorage.getItem('the-analyst:investigation-file:v1:investigation-playtest-user')))
    .toContain('"outcome":"success"');
  expect(pageErrors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('a premature correct recommendation returns with actionable evidence and preserves the case', async ({ page }) => {
  await openDesk(page);
  await attachPair(page, 'jt', 'ju', '0');
  await page.getByRole('button', { name: 'ارجع للاجتماع' }).click();
  await page.getByRole('button', { name: 'نوقف الإلغاء ونراجع أثر البرنامج' }).click();
  await expect(page.getByRole('heading', { name: 'هل استنتاج الـCFO عادل؟' })).toBeVisible();
  await expect(page.locator('#scaleMessage')).toContainText('افتح سجل التركيبة التاريخية');
  await expect(page.locator('#scaleMessage')).toContainText('مشبك Senior');
  await expect(page.locator('#scaleMessage')).not.toContainText('مشبك Junior');
  await expect(page.locator('[data-clip="0"] .clip-content')).toContainText('80%');
  expect(await page.evaluate(() => localStorage.getItem('the-analyst:investigation-file:v1:investigation-playtest-user')))
    .toContain('"status":"in-progress"');
});

test('canceling from the aggregate alone produces a failure with an understandable cause', async ({ page }, testInfo) => {
  await openDesk(page);
  await page.getByRole('button', { name: 'ارجع للاجتماع' }).click();
  await page.getByRole('button', { name: 'نلغي البرنامج' }).click();
  await expect(page.getByRole('heading', { name: 'الملف محتاج مراجعة' })).toBeVisible();
  await expect(page.locator('#endingText')).toContainText('تركيبة الموظفين');
  await page.screenshot({ path: testInfo.outputPath('investigation-v2-failure.png'), fullPage: true });
  expect(await page.evaluate(() => localStorage.getItem('the-analyst:investigation-file:v1:investigation-playtest-user')))
    .toContain('"outcome":"failure"');
});

test('claiming causation fails with the correct explanation, including when reopening the saved result', async ({ page }) => {
  await openDesk(page);
  await prepareFullCase(page);
  await page.getByRole('button', { name: 'ارجع للاجتماع' }).click();
  await pinAllProofs(page);
  await page.getByRole('button', { name: /نثبت إن التدريب سبب الترقيات/ }).click();
  await expect(page.getByRole('heading', { name: 'الملف محتاج مراجعة' })).toBeVisible();
  await expect(page.locator('#endingText')).toContainText('مش تجربة تثبت');
  expect(await page.evaluate(() => localStorage.getItem('the-analyst:investigation-file:v1:investigation-playtest-user')))
    .toContain('"failureReason":"causation"');
  await page.goto('/investigation-file/index.html?showResult=1');
  await expect(page.locator('#endingText')).toContainText('مش تجربة تثبت');
});

test('mobile sliders and evidence board stay usable without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await openDesk(page);
  await page.getByRole('button', { name: 'افتح سجل التركيبة' }).click();
  await expect(page.locator('#historicalReadout')).toBeVisible();
  await setMix(page, 'trainedMix', 0);
  await expect(page.locator('#trainedWhatIf')).toHaveText('20%');
  await setMix(page, 'untrainedMix', 1000);
  await expect(page.locator('#untrainedWhatIf')).toHaveText('75%');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'ارجع للاجتماع' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
