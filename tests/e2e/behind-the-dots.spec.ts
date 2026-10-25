import { expect, test } from "@playwright/test";

const harness = "/tests/behind-dots-visual-harness.html";
const answerButton = (page: Parameters<Parameters<typeof test>[1]>[0]["page"], label: string) => page.getByRole("button", { name: new RegExp(label) });

test("opening story, character dialogue, notebook, and interactive tutorial lead into challenge one", async ({ page }, testInfo) => {
  await page.goto(`${harness}?scenario=cover`);
  await page.getByRole("button", { name: "يلا نساعد ليلى!" }).click();
  const scenes = ["يوم خلصت… ويوم فاضت", "الخطة السهلة", "نقرأ الدفتر الأول", "النقط هتفيدنا إزاي؟", "تعالى نكتشفها سوا!"];
  for (let index = 0; index < scenes.length; index++) {
    await expect(page.getByRole("heading", { name: scenes[index] })).toBeVisible();
    if (index === 0) await page.screenshot({ path: testInfo.outputPath("opening-leila-desktop.png") });
    await page.getByRole("button", { name: index === scenes.length - 1 ? "افتح الدفتر" : "كمّل الحكاية" }).click();
  }
  await expect(page.getByRole("heading", { name: "كل نقطة بتحكي يوم" })).toBeVisible();
  await page.getByRole("button", { name: "حطّ النقطة في مكانها" }).click();
  await page.getByRole("button", { name: "أظهر باقي الأيام" }).click();
  await page.getByRole("button", { name: "علاقة طردية" }).click();
  await page.getByRole("button", { name: "ابدأ التحديات" }).click();
  await expect(page.getByRole("heading", { name: "بالضبط!" })).toBeVisible();
  await page.getByRole("button", { name: "ابدأ التحديات" }).click();
  await expect(page.getByText("صفحة 1 من 4", { exact: false })).toBeVisible();
});

test("all four challenges play in order and support the three original answers", async ({ page }, testInfo) => {
  await page.goto(`${harness}?scenario=challenge&muted=false`);
  const answers = ["علاقة طردية", "علاقة طردية", "مفيش اتجاه واضح", "علاقة عكسية"];
  const titles = ["درجة الحرارة", "عدد الزباين", "الكوبايات المحضّرة", "وقت الانتظار"];
  for (let i = 0; i < answers.length; i++) {
    await expect(page.getByText(`صفحة ${i + 1} من 4`, { exact: false })).toBeVisible();
    await expect(page.getByRole("heading").filter({ hasText: titles[i]! })).toBeVisible();
    const answer = answerButton(page, answers[i]!);
    await expect(answer).toBeEnabled();
    if (i === 0) await page.screenshot({ path: testInfo.outputPath("desktop-challenge.png") });
    await answer.click();
    await expect(page.getByText("+3", { exact: true })).toBeVisible();
    const next = page.getByRole("button", { name: i === 3 ? /ساعد ليلى تختار خطة/ : /اقلب الصفحة/ });
    await next.click();
  }
  await expect(page.getByRole("heading", { name: "خطة بكرة" })).toBeVisible();
  await page.getByRole("button", { name: /^B/ }).click();
  await expect(page.locator(".btd-ending-sequence")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("desktop-perfect-ending-start.png") });
  await page.getByRole("button", { name: /تخطّي المشهد/ }).click();
  await expect(page.getByRole("heading", { name: "كسبنا الجولة!" })).toBeVisible();
  await expect(page.locator(".btd-results-score strong")).toContainText("12");
});

test("wrong answer, timeout, pause, and mute reactions are visible", async ({ page }) => {
  const audioResponses = new Set<string>();
  page.on("response", (response) => {
    if (response.url().includes("/assets/behind-dots/audio/")) audioResponses.add(response.url().split("/").pop()!);
  });
  await page.goto(`${harness}?scenario=challenge&muted=false`);
  await page.getByRole("button", { name: /علاقة عكسية/ }).click();
  await expect(page.getByText("جليتش قرب!", { exact: true })).toBeVisible();
  await expect(page.locator('.btd-hud-lives[aria-label="2 من 3 قلوب"]')).toBeVisible();
  await expect.poll(() => audioResponses.has("wrong.ogg") && audioResponses.has("heart_lost.ogg")).toBe(true);
  await page.goto(`${harness}?scenario=timeout`);
  await expect(page.locator(".btd-reaction-stamp")).toHaveText("خلص الوقت!");
  await expect(page.locator('.btd-hud-lives[aria-label="2 من 3 قلوب"]')).toBeVisible();
  await page.goto(`${harness}?scenario=challenge&muted=false`);
  await page.getByRole("button", { name: "إعدادات الصوت" }).click();
  const sfxSlider = page.getByRole("slider", { name: "مستوى المؤثرات" });
  await expect(page.getByRole("slider", { name: "مستوى الموسيقى" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "مستوى أجواء العربية" })).toBeVisible();
  const beforeVolume = await sfxSlider.inputValue();
  await sfxSlider.focus();
  await sfxSlider.press("ArrowDown");
  await expect(sfxSlider).not.toHaveValue(beforeVolume);
  await page.getByRole("button", { name: "إعدادات الصوت" }).click();
  await expect(page.getByRole("button", { name: "إيقاف مؤقت" })).toBeVisible();
  await page.getByRole("button", { name: "إيقاف مؤقت" }).click();
  await expect(page.getByRole("heading", { name: "دوتّي مستنية" })).toBeVisible();
  const pausedSeconds = await page.locator(".btd-hud-clock b").innerText();
  await page.waitForTimeout(1200);
  await expect(page.locator(".btd-hud-clock b")).toHaveText(pausedSeconds);
  await page.getByRole("button", { name: "كمّل اللعب", exact: true }).click();
  await page.getByRole("button", { name: "كتم الصوت" }).click();
  await expect(page.getByRole("button", { name: "تشغيل الصوت" })).toBeVisible();
});

test("countdown warning starts at five, pauses cleanly, and stops on answer", async ({ page }) => {
  await page.clock.install();
  await page.goto(`${harness}?scenario=challenge&muted=false`);
  await page.clock.runFor(800);
  await expect(page.locator(".btd-hud-clock b")).toHaveText("20");
  await page.getByRole("button", { name: "إعدادات الصوت" }).click();
  await page.clock.runFor(15_000);
  await expect(page.locator(".btd-hud-clock b")).toHaveText("5");
  await page.getByRole("button", { name: "إيقاف مؤقت" }).click();
  await page.clock.runFor(3_000);
  await expect(page.locator(".btd-hud-clock b")).toHaveText("5");
  await page.getByRole("button", { name: "كمّل اللعب", exact: true }).click();
  await page.clock.runFor(1_000);
  await expect(page.locator(".btd-hud-clock b")).toHaveText("4");
  await page.getByRole("button", { name: /علاقة عكسية/ }).click();
  await expect(page.locator(".btd-result-reaction")).toBeVisible();
  await page.clock.runFor(2_000);
  await expect(page.locator(".btd-hud-clock b")).toHaveText("4");
});

test("zero hearts still allow the last evidence page in marked practice and lock the loss outcome", async ({ page }) => {
  await page.goto(`${harness}?scenario=practice`);
  await expect(page.getByText("صفحة 4 من 4", { exact: false })).toBeVisible();
  await expect(page.getByText("تدريب بعد الإمساك", { exact: false })).toBeVisible();
  await expect(page.locator(".btd-hud-clock")).toBeHidden();
  await expect(page.locator('.btd-hud-lives[aria-label="0 من 3 قلوب"]')).toBeVisible();
  await page.getByRole("button", { name: /علاقة عكسية/ }).click();
  await expect(page.getByText("جليتش لحق دوتّي!", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /كمّل/ }).last().click();
  await page.getByRole("button", { name: /^B/ }).click();
  await page.getByRole("button", { name: /تخطّي المشهد/ }).click();
  await expect(page.getByRole("heading", { name: "جليتش خطف الجولة!" })).toBeVisible();
});

for (const [scenario, title] of [["ending-perfect", "كسبنا الجولة!"], ["ending-saved", "دوتّي نجت!"], ["ending-glitch", "جليتش خطف الجولة!"]] as const) {
  test(`${scenario} runs its ending choreography before results`, async ({ page }, testInfo) => {
    const track = scenario === "ending-perfect" ? "perfect_win.ogg" : scenario === "ending-saved" ? "saved_win.ogg" : "defeat.ogg";
    const endingAudio = page.waitForResponse((response) => response.url().endsWith(`/audio/${track}`));
    await page.goto(`${harness}?scenario=${scenario}&muted=false`);
    const sceneStartedAt = Date.now();
    await expect(page.locator(".btd-ending-sequence")).toBeVisible();
    await expect(page.locator(".btd-ending-dotty")).toBeVisible();
    await expect(page.locator(".btd-ending-glitch")).toBeVisible();
    await expect(page.locator(".btd-ending-leila")).toBeVisible();
    expect((await endingAudio).status()).toBe(200);
    await expect(page.getByRole("heading", { name: title })).toBeHidden();
    await page.waitForTimeout(2300);
    await page.screenshot({ path: testInfo.outputPath(`${scenario}.png`) });
    await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 7000 });
    expect(Date.now() - sceneStartedAt).toBeGreaterThanOrEqual(3800);
    await expect(page.getByRole("button", { name: /العب مرة تانية/ })).toBeVisible();
    await page.getByRole("button", { name: /العب مرة تانية/ }).click();
    await expect(page.getByRole("heading", { name: "ورا النقط" })).toBeVisible();
  });
}

test("mobile challenge and ending fit the viewport without horizontal overflow", async ({ page }, testInfo) => {
  await page.goto(`${harness}?scenario=challenge`);
  await expect(page.getByRole("button", { name: /علاقة طردية/ })).toBeVisible();
  await expect(page.locator(".btd-pattern-button")).toHaveCount(3);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("mobile-challenge.png"), fullPage: true });
  await page.goto(`${harness}?scenario=ending-perfect`);
  await expect(page.locator(".btd-ending-sequence")).toBeVisible();
  await expect(page.locator(".btd-ending-skip")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("mobile-ending.png"), fullPage: true });
  await page.getByRole("button", { name: /تخطّي المشهد/ }).click();
  await expect(page.getByRole("heading", { name: "كسبنا الجولة!" })).toBeVisible();
});

test("ending animation pauses and resumes; reduced-motion users get a short version", async ({ page }) => {
  await page.goto(`${harness}?scenario=ending-perfect&muted=false`);
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "إيقاف مؤقت" }).click();
  const pausedTransform = await page.locator(".btd-ending-dotty").evaluate((element) => getComputedStyle(element).transform);
  await page.waitForTimeout(700);
  await expect(page.locator(".btd-ending-dotty")).toHaveCSS("transform", pausedTransform);
  await page.locator(".btd-pause-card").getByRole("button").click();
  await page.getByRole("button", { name: /تخطّي المشهد/ }).click();
  await expect(page.getByRole("heading", { name: "كسبنا الجولة!" })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${harness}?scenario=ending-glitch`);
  await expect(page.getByRole("heading", { name: "جليتش خطف الجولة!" })).toBeVisible({ timeout: 4000 });
});

test("correct answer loads the approved confirmation sound after the answer reveal", async ({ page }) => {
  await page.addInitScript(() => {
    const instrumentation = window as typeof window & { __btdAudioStarts?: number };
    const originalStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when?: number, offset?: number, duration?: number) {
      instrumentation.__btdAudioStarts = (instrumentation.__btdAudioStarts ?? 0) + 1;
      return originalStart.call(this, when, offset, duration);
    };
  });
  const audioResponses = new Map<string, number>();
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/assets/behind-dots/audio/")) audioResponses.set(url.split("/").pop()!, response.status());
  });
  await page.goto(`${harness}?scenario=challenge&muted=false`);
  const startsBeforeAnswer = await page.evaluate(() => (window as typeof window & { __btdAudioStarts?: number }).__btdAudioStarts ?? 0);
  const sound = page.waitForResponse((response) => response.url().endsWith("/audio/correct.ogg"));
  await page.getByRole("button", { name: /علاقة طردية/ }).click();
  await expect(page.locator(".btd-result-reaction")).toBeVisible();
  try { expect((await sound).status()).toBe(200); } catch { throw new Error(`No approved confirmation sound response; observed: ${[...audioResponses.keys()].join(", ") || "none"}`); }
  await expect.poll(() => audioResponses.size).toBe(17);
  expect([...audioResponses.values()].every((status) => status === 200)).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __btdAudioStarts?: number }).__btdAudioStarts ?? 0)).toBeGreaterThan(startsBeforeAnswer + 1);
});
