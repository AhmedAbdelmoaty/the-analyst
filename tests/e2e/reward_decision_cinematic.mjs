// Synthetic browser smoke test. All non-local requests are intercepted.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const env = readFileSync('.env', 'utf8');
const serviceUrl = env.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
if (!serviceUrl) throw new Error('Local public Supabase URL is needed to derive the mock storage key');
const project = new URL(serviceUrl).hostname.split('.')[0];
const uid = '00000000-0000-4000-8000-000000000777';
const out = join(tmpdir(), 'the-analyst-cinematic-evidence');
mkdirSync(out, { recursive: true });
const base = 'http://localhost:8091';
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: uid, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 86400 })}.signature`;
const user = { id: uid, aud: 'authenticated', role: 'authenticated', phone: '201000000000', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const session = { access_token: jwt, refresh_token: 'synthetic', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, user };
const key = `the-analyst:reward-decision:v1:${uid}`;
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
const results = [];

async function context(gender, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  await ctx.addInitScript(({ project, session }) => {
    localStorage.setItem(`sb-${project}-auth-token`, JSON.stringify(session));
    localStorage.setItem('the-analyst:install-dismissed', '1');
  }, { project, session });
  await ctx.route('**/*', async route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === 'localhost') return route.continue();
    if (requestUrl.pathname.includes('/rest/v1/profiles')) return route.fulfill({ json: {
      first_name: 'اختبار', last_name: 'اصطناعي', display_name: 'اختبار', gender, avatar_choice: gender, phone: '201000000000',
    } });
    if (requestUrl.pathname.includes('/rest/v1/user_roles')) return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    if (requestUrl.pathname.includes('/auth/v1/user')) return route.fulfill({ json: user });
    if (requestUrl.pathname.includes('/auth/v1/token')) return route.fulfill({ json: session });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/games/reward-decision`);
  await page.locator('.rd-root').waitFor();
  return { ctx, page };
}
async function scene(page, expected) {
  await page.waitForFunction(expected => document.querySelector('.rd-root')?.dataset.scene === expected, expected, { timeout: 30000 });
  const pic = page.locator(`.rd-scene-picture img`).last();
  await pic.evaluate(image => image.decode());
  if (!await pic.evaluate(image => image.naturalWidth > 0)) throw new Error(`Image failed: ${expected}`);
}
async function savedState(page, patch) {
  await page.evaluate(({ key, patch }) => {
    const original = JSON.parse(localStorage.getItem(key));
    // A mounted typewriter can be many revisions ahead of its debounced save.
    // Give the synthetic checkpoint a dominant revision before pagehide persists.
    localStorage.setItem(key, JSON.stringify({ ...original, ...patch, revision: original.revision + 100000 }));
  }, { key, patch });
  await page.reload();
  if (patch.stage && await page.locator('.rd-root').getAttribute('data-stage') !== patch.stage) {
    throw new Error(`Saved stage ${patch.stage} restored as ${await page.locator('.rd-root').getAttribute('data-stage')} (stored ${await page.evaluate(key => JSON.parse(localStorage.getItem(key))?.stage, key)})`);
  }
  await page.getByRole('button', { name: 'متابعة اللعب' }).click();
}
async function screenshot(page, name) {
  await page.waitForTimeout(500); // Let the restrained scene/dialogue fade settle.
  await page.screenshot({ path: join(out, name), fullPage: false });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 1) throw new Error(`Horizontal overflow: ${overflow}px`);
}

try {
  for (const [gender, width, height] of [['male', 1280, 800], ['female', 390, 844]]) {
    const { ctx, page } = await context(gender, width, height);
    await scene(page, 'corridor');
    await page.getByRole('button', { name: 'ابدأ الآن' }).click();
    await scene(page, 'opening');
    await page.locator('[data-line="celebration_01"]').waitFor({ timeout: 10000 });
    if (await page.getByRole('button', { name: 'متابعة', exact: true }).count()) throw new Error('Compulsory Continue still present');
    await screenshot(page, `${gender}-opening.png`);
    await savedState(page, { phase: 'debate', stage: 'door', dialogueIndex: 0, visibleGraphemes: 0 });
    await scene(page, `door-${gender}`);
    await page.locator('[data-line="briefing_01"]').waitFor({ timeout: 10000 });
    await scene(page, `briefing-${gender}`);
    await savedState(page, { phase: 'hub', stage: '', dialogueIndex: 0, visibleGraphemes: 0 });
    await scene(page, 'corridor');
    await page.locator('[data-dest="sales"]').click();
    await scene(page, `sales-${gender}`);
    await savedState(page, { phase: 'recommendation', stage: '', dialogueIndex: 0, visibleGraphemes: 0 });
    await scene(page, `report-${gender}`);
    await screenshot(page, `${gender}-report.png`);
    await savedState(page, { phase: 'hub', stage: '', dialogueIndex: 0, visibleGraphemes: 0 });
    const order = gender === 'male' ? ['hr', 'sales'] : ['sales', 'hr'];
    for (const office of order) {
      await page.locator(`[data-dest="${office}"]`).click();
      await page.locator(`[data-line="${office}_03"]`).waitFor({ timeout: 25000 });
      await page.locator('[data-dest="workbench"]').waitFor({ timeout: 18000 });
    }
    const collected = await page.evaluate(key => JSON.parse(localStorage.getItem(key))?.collectedDocs ?? [], key);
    for (const documentId of ['policy', 'sales-summary', 'individual-records'])
      if (!collected.includes(documentId)) throw new Error(`Missing ${documentId} after ${order.join('→')}`);
    results.push(`${gender} cover/opening/door/briefing/hub/report, ${order.join('→')} documents and auto-return pass`);
    await ctx.close();
  }

  const { ctx, page } = await context('male', 1280, 800);
  await page.getByRole('button', { name: 'ابدأ الآن' }).click();
  const submitted = { teamId: 'mahmoud', documentId: 'policy', arguments: ['records-coverage', 'range-mahmoud'], submittedAt: 'synthetic' };
  const evaluation = { outcome: 'supported', reason: 'complete', argumentValidity: [true, true] };
  await savedState(page, { phase: 'meeting', stage: 'open', dialogueIndex: 0, visibleGraphemes: 0, submitted, evaluation });
  await scene(page, 'meeting-opening');
  await page.locator('[data-line="meeting_02"]').waitFor({ timeout: 20000 });
  await scene(page, 'meeting-player-male');
  await screenshot(page, 'male-meeting.png');
  await page.locator('[data-line="meeting_03_supported"]').waitFor({ timeout: 25000 });
  await scene(page, 'meeting-neutral');
  await page.locator('[data-testid="rd-incoming-call"]').waitFor({ timeout: 30000 });
  await scene(page, 'analyst-male');
  await screenshot(page, 'male-incoming.png');
  await page.waitForTimeout(2000);
  if (await page.locator('.rd-root').getAttribute('data-stage') !== 'incoming') throw new Error('Incoming call auto-answered');
  await page.getByRole('button', { name: 'الرد على محمود' }).click();
  await scene(page, 'phone-mahmoud-happy');
  await page.locator('[data-line="call_mahmoud_mahmoud_02"]').waitFor({ timeout: 15000 });
  await scene(page, 'phone-player-male-calm');
  await page.locator('[data-line="call_mahmoud_supported_03"]').waitFor({ timeout: 18000 });
  await page.locator('[data-testid="rd-incoming-call"][data-caller="marwan"]').waitFor({ timeout: 22000 });
  if (await page.locator('.rd-root').getAttribute('data-stage') !== 'incoming') throw new Error(`Second call did not wait for Answer: ${await page.locator('.rd-root').getAttribute('data-stage')}`);
  await page.getByRole('button', { name: 'الرد على مروان' }).click();
  await scene(page, 'phone-marwan-upset');
  await page.locator('[data-line="call_mahmoud_supported_marwan_02"]').waitFor({ timeout: 20000 });
  await scene(page, 'phone-player-male-calm');
  await page.locator('[data-phase="debrief"]').waitFor({ timeout: 45000 });
  await scene(page, 'completed-folder');
  results.push('male supported meeting/reaction, both calls with Answer gates, and manual debrief pass');
  await ctx.close();

  const female = await context('female', 360, 780);
  const p = female.page;
  await p.getByRole('button', { name: 'ابدأ الآن' }).click();
  const weak = { ...evaluation, outcome: 'insufficient', reason: 'weak_arguments', argumentValidity: [false, true] };
  await savedState(p, { phase: 'meeting', stage: 'open', dialogueIndex: 2, visibleGraphemes: 0, submitted, evaluation: weak });
  await scene(p, 'meeting-concerned');
  await screenshot(p, 'female-weak-meeting.png');
  await savedState(p, { phase: 'resolution', stage: 'incoming', endingCall: 0, callAnswered: false, dialogueIndex: 0, visibleGraphemes: 0 });
  await scene(p, 'analyst-female');
  await p.getByRole('button', { name: 'الرد على محمود' }).click();
  await scene(p, 'phone-mahmoud-happy');
  await p.locator('[data-line="call_mahmoud_mahmoud_02"]').waitFor({ timeout: 15000 });
  await scene(p, 'phone-player-female-calm');
  await screenshot(p, 'female-weak-call.png');
  results.push('female unsupported reaction and phone scenes pass');
  await female.ctx.close();

  const mobile = await context('female', 320, 640);
  const small = mobile.page;
  await small.getByRole('button', { name: 'ابدأ الآن' }).click();
  await small.locator('[data-line="celebration_01"]').waitFor({ timeout: 10000 });
  await small.getByRole('button', { name: 'إيقاف مؤقت' }).click();
  const pausedLine = await small.locator('.rd-dialogue').getAttribute('data-line');
  await small.waitForTimeout(5500);
  if (await small.locator('.rd-dialogue').getAttribute('data-line') !== pausedLine) throw new Error('Pause did not freeze narration');
  await small.getByRole('button', { name: 'متابعة اللعب' }).click();
  await small.getByRole('button', { name: 'فتح ملف التحليل' }).click();
  await small.waitForTimeout(5500);
  if (await small.locator('.rd-dialogue').getAttribute('data-line') !== pausedLine) throw new Error('File overlay did not freeze narration');
  await small.getByRole('button', { name: 'إغلاق الملف' }).click();
  await small.locator('[data-line="celebration_02"]').waitFor({ timeout: 10000 });
  await small.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await small.waitForTimeout(5500);
  if (await small.locator('.rd-dialogue').getAttribute('data-line') !== 'celebration_02') throw new Error('Hidden tab advanced narration');
  await small.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await small.getByRole('button', { name: 'متابعة اللعب' }).click();
  await small.locator('[data-line="celebration_03"]').waitFor({ timeout: 12000 });
  await screenshot(small, 'female-320-dialogue.png');
  await mobile.ctx.close();
  results.push('320px pause/file/hidden-tab clock freeze and resume pass');

  const landscape = await context('male', 844, 390);
  await landscape.page.getByRole('button', { name: 'ابدأ الآن' }).click();
  await landscape.page.locator('[data-line="celebration_01"]').waitFor({ timeout: 10000 });
  await scene(landscape.page, 'opening');
  await screenshot(landscape.page, 'male-landscape-opening.png');
  await landscape.ctx.close();
  results.push('mobile landscape scene and overflow pass');
  console.log(results.join('\n'));
} finally {
  await browser.close();
}
