import { expect, test, type Page } from '@playwright/test';

async function desk(page: Page) {
  await page.addInitScript(() => { window.name = 'investigation-responsive-test'; });
  await page.goto('/investigation-file/index.html');
  for (let i = 0; i < 4; i++) await page.locator('#nextIntro').click();
}
async function lab(page: Page) { await page.locator('#labTab').click(); }
async function mix(page: Page, id: string, value: number) {
  await page.locator(`#${id}`).evaluate((element, next) => {
    (element as HTMLInputElement).value = String(next);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
async function decide(page: Page, decision: string, reason: string) {
  await page.locator('#faceCfo').click();
  await page.locator(`[data-decision="${decision}"]`).click();
  await page.locator(`[data-reason="${reason}"]`).click();
  await page.locator('#submitVerdict').click();
}

test('opening dialogue remains separate from report and action', async ({ page }, testInfo) => {
  await page.goto('/investigation-file/index.html');
  await expect(page.locator('#introTitle')).toHaveText('نلغي برنامج تطوير الموظفين؟');
  await expect(page.locator('#introSpeech')).toContainText('المدير المالي جاهز يمضي');
  if (process.env.INVESTIGATION_CAPTURE_PREVIEWS) await page.screenshot({ path: testInfo.outputPath('opening-idle.png'), fullPage: true });
  await page.locator('#nextIntro').click();
  for (const speaker of ['cfo', 'hr', 'cfo']) {
    await expect(page.locator('#introSpeech')).toHaveAttribute('data-speaker', speaker);
    const [speech, report, next] = await Promise.all(['#introSpeech', '.report-paper', '#nextIntro'].map(s => page.locator(s).boundingBox()));
    expect(speech && report && next && speech.y + speech.height < report.y && report.y + report.height < next.y, JSON.stringify({ speech, report, next })).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.INVESTIGATION_CAPTURE_PREVIEWS && speaker === 'hr') await page.screenshot({ path: testInfo.outputPath('opening.png'), fullPage: true });
    await page.locator('#nextIntro').click();
  }
  await page.locator('#muteBtn').click();
  await expect(page.locator('#muteBtn')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#hintBtn').click();
  await expect(page.locator('#hintText')).toContainText('نفس المستوى');
  await page.locator('#dismissHint').click();
  await page.locator('#labTab').click();
  await expect(page.locator('#hintBtn')).toHaveAttribute('aria-label', 'افتح تلميح معمل التحليل');
  await page.locator('#hintBtn').click();
  await expect(page.locator('#hintText')).toContainText('تغيّر التركيبة');
  await page.locator('#dismissHint').click();
  await page.locator('#faceCfo').click();
  await expect(page.locator('#hintBtn')).toBeHidden();
});

test('comparison is immediate; visiting lab unlocks meeting from either tab', async ({ page }, testInfo) => {
  await desk(page);
  await expect(page.locator('#faceCfo')).toBeDisabled();
  await page.locator('[data-id="jt"]').click(); await page.locator('[data-id="ju"]').click();
  const result = page.viewportSize()!.width <= 700 ? page.locator('#mobileComparison') : page.locator('#comparisonResult');
  await expect(result).toContainText('80%'); await expect(result).toContainText('75%'); await expect(result).toContainText('5%');
  if (page.viewportSize()!.width <= 700) await expect.poll(() => result.evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
  if (process.env.INVESTIGATION_CAPTURE_PREVIEWS) await page.screenshot({ path: testInfo.outputPath('evidence.png'), fullPage: true });
  await lab(page);
  await expect(page.locator('#faceCfo')).toBeEnabled();
  await page.locator('#evidenceTab').click(); await page.locator('#faceCfo').click();
  await expect(page.locator('#confrontation')).toBeVisible();
  await page.locator('#backToDesk').click(); await lab(page); await page.locator('#faceCfo').click();
  await expect(page.locator('#confrontation')).toBeVisible();
});

test('independent lab controls update nearby rates and preserve historical records', async ({ page }, testInfo) => {
  await desk(page); await lab(page);
  const historical = await page.locator('#historicalReadout').textContent();
  await mix(page, 'trainedMix', 500);
  await expect(page.locator('#trainedNearRate')).toHaveText('50%');
  await expect(page.locator('#untrainedNearRate')).toHaveText('65.7%');
  await mix(page, 'untrainedMix', 500);
  await expect(page.locator('#untrainedNearRate')).toHaveText('42.5%');
  await expect(page.locator('#trainedPopulation')).toHaveAttribute('data-junior-count', '10');
  await expect(page.locator('#untrainedPopulation')).toHaveAttribute('data-junior-count', '10');
  if (process.env.INVESTIGATION_CAPTURE_PREVIEWS) await page.screenshot({ path: testInfo.outputPath('lab.png'), fullPage: true });
  expect(await page.locator('#historicalReadout').textContent()).toBe(historical);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('two editable choices confirm once; replay resets the run', async ({ page }, testInfo) => {
  await desk(page); await lab(page); await page.locator('#faceCfo').click();
  await page.locator('[data-decision="cancel-program"]').click();
  await page.locator('#editDecision').click();
  await page.locator('[data-decision="pause-review"]').click();
  await page.locator('[data-reason="composition"]').click();
  if (process.env.INVESTIGATION_CAPTURE_PREVIEWS) await page.screenshot({ path: testInfo.outputPath('meeting.png'), fullPage: true });
  await page.locator('#submitVerdict').click();
  await expect(page.locator('#endingTitle')).toHaveText('القرار اتوقف في وقته!');
  if (process.env.INVESTIGATION_CAPTURE_PREVIEWS) await page.screenshot({ path: testInfo.outputPath('win.png'), fullPage: true });
  await page.locator('#openReveal').click();
  await expect(page.locator('#revealSpeech')).toContainText('نفتح الملفات الصغيرة');
  await expect.poll(() => page.locator('#revealFelfel').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  for (let step = 0; step < 5; step++) await page.locator('#nextReveal').click();
  await expect(page.locator('#revealSpeech')).toContainText('السجلات وحدها ما تثبتش');
  await expect(page.locator('#nextReveal')).toHaveText('العب من جديد');
  await page.locator('#nextReveal').click();
  await expect(page.locator('#intro')).toBeVisible();
  await desk(page); await lab(page); await decide(page, 'pause-review', 'aggregate');
  await expect(page.locator('#endingTitle')).toHaveText('الملف محتاج مراجعة');
  if (process.env.INVESTIGATION_CAPTURE_PREVIEWS) await page.screenshot({ path: testInfo.outputPath('loss.png'), fullPage: true });
  await expect(page.locator('#confrontation')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('narrow mobile and larger desktop preserve readable boundaries', async ({ page }, testInfo) => {
  for (const size of testInfo.project.name === 'mobile'
    ? [{ width: 360, height: 780 }]
    : [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await page.goto('/investigation-file/index.html');
    await page.locator('#nextIntro').click();
    const [speech, report] = await Promise.all(['#introSpeech', '.report-paper'].map(s => page.locator(s).boundingBox()));
    expect(speech && report && speech.y + speech.height < report.y, JSON.stringify({ size, speech, report })).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (let i = 0; i < 3; i++) await page.locator('#nextIntro').click();
    await page.locator('#labTab').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
