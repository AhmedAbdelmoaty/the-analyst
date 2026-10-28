import { expect, test } from '@playwright/test';

async function openInvestigation(page: import('@playwright/test').Page) {
  await page.addInitScript(() => { window.name = 'investigation-playtest-user'; });
  await page.goto('/investigation-file/index.html');
  await expect(page.getByRole('heading', { name: 'هل نقفل برنامج تطوير القيادات؟' })).toBeVisible();
  await page.getByRole('button', { name: /التالي/ }).click();
  await page.getByRole('button', { name: /التالي/ }).click();
  await page.getByRole('button', { name: /افتح التحقيق/ }).click();
  await expect(page.getByRole('heading', { name: 'خلّي التقريرين يحكوا نفس القصة' })).toBeVisible();
}

test('successful investigation preserves the puzzle and plays its win ending', async ({ page }, testInfo) => {
  const audioFailures: string[] = [];
  const pageErrors: string[] = [];
  await page.addInitScript(() => {
    const played: string[] = [];
    (window as Window & { __playedSounds?: string[] }).__playedSounds = played;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      played.push(this.currentSrc || this.src);
      return play.call(this).catch(() => {});
    };
  });
  page.on('response', (response) => {
    if (response.url().endsWith('.mp3') && response.status() >= 400) audioFailures.push(`${response.status()} ${response.url()}`);
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await openInvestigation(page);
  for (const [first, second, clip] of [['jt', 'ju', '0'], ['st', 'su', '1']]) {
    await page.locator(`[data-id="${first}"]`).click();
    await page.locator(`[data-id="${second}"]`).click();
    await page.locator(`[data-clip="${clip}"]`).click();
  }
  await page.locator('input[name="trainedDominant"][value="senior"]').check();
  await page.locator('input[name="untrainedDominant"][value="junior"]').check();
  await page.getByRole('button', { name: 'وزن السجلات الفعلية' }).click();
  for (const id of ['trainedMix', 'untrainedMix']) {
    await page.locator(`#${id}`).evaluate((element) => {
      const slider = element as HTMLInputElement;
      slider.value = '50';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  await page.getByRole('button', { name: 'اختبر توزيعك' }).click();
  await expect(page.getByText(/التقرير الأصلي/)).toBeVisible();
  await page.getByRole('button', { name: 'ارجع للاجتماع' }).click();
  await page.getByRole('button', { name: 'نوقف الإلغاء ونراجع أثر البرنامج' }).click();
  await expect(page.getByRole('heading', { name: 'القرار اتوقف في وقته!' })).toBeVisible();
  await expect(page.locator('#endingMath')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('success-ending.png'), fullPage: true });
  await expect.poll(() => page.evaluate(() => (window as Window & { __playedSounds?: string[] }).__playedSounds ?? []))
    .toContain('http://127.0.0.1:8091/investigation-file/audio/win.mp3');
  await expect.poll(() => page.evaluate(() => (window as Window & { __playedSounds?: string[] }).__playedSounds ?? []))
    .toContain('http://127.0.0.1:8091/investigation-file/audio/confettipop.mp3');
  expect(await page.evaluate(() => localStorage.getItem('the-analyst:investigation-file:v1:investigation-playtest-user')))
    .toContain('"outcome":"success"');
  expect(audioFailures).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto('/investigation-file/index.html?showResult=1');
  await expect(page.getByRole('heading', { name: 'القرار اتوقف في وقته!' })).toBeVisible();
});

test('skipping the evidence ends in failure with its own sound and no answer reveal', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  await page.addInitScript(() => {
    const played: string[] = [];
    (window as Window & { __playedSounds?: string[] }).__playedSounds = played;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      played.push(this.currentSrc || this.src);
      return play.call(this).catch(() => {});
    };
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await openInvestigation(page);
  await page.getByRole('button', { name: 'ارجع للاجتماع' }).click();
  await page.getByRole('button', { name: 'نلغي البرنامج' }).click();
  await expect(page.getByRole('heading', { name: 'الملف محتاج مراجعة' })).toBeVisible();
  await expect(page.locator('#endingMath')).toBeHidden();
  await page.waitForTimeout(700);
  await page.screenshot({ path: testInfo.outputPath('failure-ending.png'), fullPage: true });
  await expect.poll(() => page.evaluate(() => (window as Window & { __playedSounds?: string[] }).__playedSounds ?? []))
    .toContain('http://127.0.0.1:8091/investigation-file/audio/lose.mp3');
  await expect.poll(() => page.evaluate(() => (window as Window & { __playedSounds?: string[] }).__playedSounds ?? []))
    .toContain('http://127.0.0.1:8091/investigation-file/audio/horn-short.mp3');
  expect(pageErrors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
