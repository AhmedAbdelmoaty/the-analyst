import { expect, test, type Page } from '@playwright/test';

async function openDesk(page: Page) {
  await page.addInitScript(() => { window.name = 'investigation-v21-test-user'; });
  await page.goto('/investigation-file/index.html');
  for (let i = 0; i < 3; i++) await page.locator('#nextIntro').click();
  await expect(page.locator('#investigation')).toBeVisible();
}
async function pair(page: Page, first: string, second: string, slot: number) {
  await page.locator(`[data-id="${first}"]`).click();
  await page.locator(`[data-id="${second}"]`).click();
  await page.locator(`[data-clip="${slot}"]`).click();
}
async function setMix(page: Page, id: string, value: number) {
  await page.locator(`#${id}`).evaluate((element, next) => {
    const input = element as HTMLInputElement;
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
async function decide(page: Page, decision: string, reason: string) {
  await page.locator('#faceCfo').click();
  await page.locator(`[data-decision="${decision}"]`).click();
  await page.locator(`[data-reason="${reason}"]`).click();
  await page.locator('#submitVerdict').click();
}

test('supports freely saved comparisons and a complete success without a required slider experiment', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openDesk(page);
  await expect(page.locator('#historicalReadout')).toBeVisible();
  await expect(page.locator('#historicalReadout')).toContainText('85.7%');
  await pair(page, 'jt', 'su', 0); // unsuitable comparisons can be kept.
  await page.locator('[data-save-clip="0"]').click();
  await expect(page.locator('#savedPairs')).toContainText('80/100');
  await pair(page, 'jt', 'ju', 0);
  await expect(page.locator('#savedPairs')).toContainText('10/100'); // changing a clip does not erase the saved pair.
  await page.locator('[data-save-clip="0"]').click(); // replace evidence.
  await pair(page, 'st', 'su', 1);
  await page.locator('[data-save-clip="1"]').click();
  await page.screenshot({ path: testInfo.outputPath('v21-desk.png'), fullPage: true });
  await decide(page, 'pause-review', 'composition');
  await expect(page.locator('#endingTitle')).toHaveText('القرار اتوقف في وقته!');
  expect(errors).toEqual([]);
  await page.goto('/investigation-file/index.html?showResult=1');
  await expect(page.locator('#endingTitle')).toHaveText('القرار اتوقف في وقته!');
});

test('missing or unsuitable saved comparisons send a correct judgment back to the desk', async ({ page }) => {
  await openDesk(page);
  await pair(page, 'jt', 'su', 0);
  await page.locator('[data-save-clip="0"]').click();
  await decide(page, 'pause-review', 'composition');
  await expect(page.locator('#investigation')).toBeVisible();
  await expect(page.locator('#pairMessage')).toContainText('المقارنات المحفوظة');
  await expect(page.locator('#savedPairs')).toContainText('10/100');
  expect(await page.evaluate(() => localStorage.getItem('the-analyst:investigation-file:v1:investigation-v21-test-user')))
    .toContain('"status":"in-progress"');
});

test('decision and justification must agree with the data', async ({ page }) => {
  await openDesk(page);
  await decide(page, 'pause-review', 'aggregate');
  await expect(page.locator('#endingTitle')).toHaveText('الملف محتاج مراجعة');
  await expect(page.locator('#endingText')).toContainText('الإجمالي');
  await page.locator('#replay').click();
  await expect(page.locator('#intro')).toBeVisible();
  await openDesk(page);
  await decide(page, 'cancel-program', 'composition');
  await expect(page.locator('#endingTitle')).toHaveText('الملف محتاج مراجعة');
  await expect(page.locator('#endingText')).toContainText('ما اتسقش');
  await page.locator('#replay').click();
  await expect(page.locator('#intro')).toBeVisible();
  await openDesk(page);
  await decide(page, 'claim-causation', 'causation');
  await expect(page.locator('#endingText')).toContainText('ما تثبتش');
});

test('independent 5 percent mixes, accurate reset, endpoints and optional snapshot', async ({ page }) => {
  await openDesk(page);
  await expect(page.locator('#trainedMixValue')).toHaveText('25%');
  await expect(page.locator('#untrainedMixValue')).toHaveText('85.7%');
  await setMix(page, 'trainedMix', 500);
  await expect(page.locator('#trainedWhatIf')).toHaveText('50%');
  await expect(page.locator('#untrainedWhatIf')).toHaveText('65.7%');
  await setMix(page, 'untrainedMix', 500);
  await expect(page.locator('#untrainedWhatIf')).toHaveText('42.5%');
  await setMix(page, 'trainedMix', 0);
  await setMix(page, 'untrainedMix', 1000);
  await expect(page.locator('#trainedWhatIf')).toHaveText('20%');
  await expect(page.locator('#untrainedWhatIf')).toHaveText('75%');
  await page.locator('#saveMix').click();
  await expect(page.locator('#savedMix')).toContainText('افتراضية');
  await page.locator('#resetMix').click();
  await expect(page.locator('#untrainedMixValue')).toHaveText('85.7%');
  await page.locator('#untrainedMix').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#untrainedMixValue')).toHaveText('85%');
  await expect(page.locator('#historicalReadout')).toContainText('85.7%');
  await page.locator('#faceCfo').click();
  await expect(page.locator('#meetingEvidence')).toContainText('لقطة افتراضية');
});

test('mobile, keyboard, mute and reduced motion stay usable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDesk(page);
  await page.locator('#muteBtn').click();
  await expect(page.locator('#muteBtn')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#trainedMix').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#trainedMixValue')).toHaveText('30%');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('#investigation').evaluate(el => getComputedStyle(el).animationDuration)).toBe('1e-05s');
});
