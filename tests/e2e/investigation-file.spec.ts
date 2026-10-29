import { expect, test, type Page } from '@playwright/test';

const capturePreview = async (page: Page, path: string) => {
  if (process.env.INVESTIGATION_CAPTURE_PREVIEWS) await page.screenshot({ path, fullPage: true });
};

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
  test.setTimeout(60_000);
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
  await expect(page.locator('#deskFelfel')).toHaveAttribute('data-state', 'idle');
  await capturePreview(page, testInfo.outputPath('v21-desk.png'));
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
  test.setTimeout(60_000);
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

test('phase A keeps comparison cards readable, historical figures fixed, and live results beside controls', async ({ page }, testInfo) => {
  await openDesk(page);
  await pair(page, 'jt', 'ju', 0);
  await expect(page.locator('[data-clip="0"] .comparison-card')).toHaveCount(2);
  await expect(page.locator('[data-clip="0"] .comparison-card').first()).toContainText('80/100');
  await expect(page.locator('[data-clip="0"] .comparison-card').last()).toContainText('450/600');
  await page.locator('[data-save-clip="0"]').click();
  await expect(page.locator('#savedPairs .comparison-card')).toHaveCount(2);
  const original = await page.locator('#historicalReadout').textContent();
  await setMix(page, 'trainedMix', 500);
  await expect(page.locator('#trainedRateBar')).toHaveCSS('width', /\d+px/);
  await expect(page.locator('#trainedWhatIf')).toHaveText('50%');
  expect(await page.locator('#historicalReadout').textContent()).toBe(original);
  if (testInfo.project.name === 'desktop') {
    const controls = await page.locator('.mix-controls').boundingBox();
    const results = await page.locator('.live-results').boundingBox();
    expect(controls && results && controls.x > results.x).toBeTruthy();
    expect(controls && results && Math.abs(controls.y - results.y) < 4).toBeTruthy();
  }
  await page.locator('#faceCfo').click();
  const decisions = page.locator('#decisionStep .verdict');
  const initialColors = await decisions.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
  expect(new Set(initialColors).size).toBe(1);
  await decisions.nth(0).click();
  await page.locator('#backToDecision').click();
  await decisions.nth(1).click();
  await page.locator('#backToDecision').click();
  await expect(decisions.nth(0)).toHaveAttribute('aria-pressed', 'false');
  await expect(decisions.nth(1)).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('a saved experiment can be interpreted, corrected or removed without a false loss', async ({ page }) => {
  await openDesk(page);
  const original = await page.locator('#historicalReadout').textContent();
  await page.locator('#resetMix').click();
  const exactOriginal = Number(await page.locator('#untrainedMix').inputValue()) / 1000;
  expect(Math.abs(exactOriginal - 6 / 7)).toBeLessThan(1e-12);
  await setMix(page, 'trainedMix', 400);
  await page.locator('#saveMix').click();
  await expect(page.locator('#savedMix')).toContainText('افتراضية');
  await page.locator('[data-observation="causation"]').click();
  await pair(page, 'jt', 'ju', 0);
  await page.locator('[data-save-clip="0"]').click();
  await pair(page, 'st', 'su', 1);
  await page.locator('[data-save-clip="1"]').click();
  await decide(page, 'pause-review', 'composition');
  await expect(page.locator('#investigation')).toBeVisible();
  await expect(page.locator('#scaleMessage')).toContainText('ملاحظتك');
  await page.locator('[data-observation="composition-impact"]').click();
  await decide(page, 'pause-review', 'composition');
  await expect(page.locator('#ending')).toBeVisible();
  expect(await page.locator('#historicalReadout').textContent()).toBe(original);
});

test('Felfel delivers three dismissible hints across desk and meeting', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await openDesk(page);
  await expect(page.locator('.desk-guide img')).toBeVisible();
  await page.locator('#hintBtn').click();
  await expect(page.locator('#hintText')).not.toBeEmpty();
  await expect(page.locator('#hintFelfel')).toHaveJSProperty('complete', true);
  await expect(page.locator('#hintCount')).toHaveText('٢');
  if (testInfo.project.name === 'mobile') {
    const hintBox = await page.locator('#hintPanel').boundingBox();
    const recordsBox = await page.locator('.source-panel').boundingBox();
    expect(hintBox && recordsBox && hintBox.y + hintBox.height <= recordsBox.y).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await capturePreview(page, testInfo.outputPath('v3-hint.png'));
  await page.locator('#dismissHint').click();
  await expect(page.locator('#hintPanel')).toBeHidden();
  await page.locator('#faceCfo').click();
  await page.locator('#hintBtn').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#hintText')).not.toBeEmpty();
  await page.locator('#dismissHint').click();
  await expect(page.locator('#hintPanel')).toBeHidden();
  await page.locator('#hintBtn').click();
  await expect(page.locator('#hintText')).not.toBeEmpty();
  await expect(page.locator('#hintCount')).toHaveText('٠');
  await page.locator('#dismissHint').click();
  await expect(page.locator('#hintBtn')).toBeDisabled();
});

test('both endings can open the six-beat Simpson reveal with the real case numbers', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await openDesk(page);
  await pair(page, 'jt', 'ju', 0);
  await page.locator('[data-save-clip="0"]').click();
  await pair(page, 'st', 'su', 1);
  await page.locator('[data-save-clip="1"]').click();
  await decide(page, 'pause-review', 'composition');
  await expect(page.locator('#endingFelfel')).toHaveAttribute('src', /celebrate\.png$/);
  await expect(page.locator('#endingHr')).toHaveJSProperty('complete', true);
  await expect.poll(() => page.locator('#endingFelfel').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.locator('.ending-people').evaluate(async people => { await Promise.all(Array.from(people.querySelectorAll('img')).map((image: HTMLImageElement) => image.decode())); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.waitForTimeout(800); // Let the one-shot ending entrance settle for the visual preview.
  await capturePreview(page, testInfo.outputPath('v3-success.png'));
  await page.locator('#openReveal').click();
  await expect(page.locator('#revealVisual')).toContainText('35%');
  for (let index = 0; index < 5; index++) await page.locator('#nextReveal').click();
  await expect(page.locator('#revealSpeech')).toContainText('مفارقة سيمبسون');
  await expect(page.locator('#revealSpeech')).toContainText('ما يثبتش');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.waitForTimeout(400); // Let the final reveal card settle before capturing the preview.
  await capturePreview(page, testInfo.outputPath('v3-reveal.png'));
  await page.locator('#closeReveal').click();
  const reloaded = page.waitForEvent('load');
  await page.locator('#replay').click();
  await reloaded;
  await expect(page.locator('#intro')).toBeVisible();
  for (let i = 0; i < 3; i++) await page.locator('#nextIntro').click();
  await expect(page.locator('#investigation')).toBeVisible();
  await decide(page, 'cancel-program', 'aggregate');
  await expect(page.locator('#endingFelfel')).toHaveAttribute('src', /concerned\.png$/);
  await expect.poll(() => page.locator('#endingFelfel').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.locator('.ending-people').evaluate(async people => { await Promise.all(Array.from(people.querySelectorAll('img')).map((image: HTMLImageElement) => image.decode())); });
  await page.waitForTimeout(800);
  await capturePreview(page, testInfo.outputPath('v3-failure.png'));
  await page.locator('#openReveal').click();
  await expect(page.locator('#revealStage')).toBeVisible();
  await expect(page.locator('#revealVisual')).toContainText('65.7%');
});
