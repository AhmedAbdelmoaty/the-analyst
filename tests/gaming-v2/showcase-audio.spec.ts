import { test, expect } from '@playwright/test';
import { mockAccount } from './fixture';

test('Landing showcase scrolls with RTL buttons and keyboard and preserves guest selection', async ({ page }) => {
  await mockAccount(page, { guest: true }); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  const strip = page.getByRole('region', { name: 'استكشف الألعاب' });
  await expect(strip).toBeVisible();
  await page.getByRole('button', { name: 'الألعاب التالية' }).click();
  await expect.poll(() => strip.evaluate(e => e.scrollLeft)).toBeLessThan(-100);
  await strip.focus(); await page.keyboard.press('Home');
  await expect.poll(() => strip.evaluate(e => e.scrollLeft)).toBe(0);
  await page.getByRole('button', { name: 'اكتشف المغامرة: اسأل صح' }).click();
  await expect(page.getByRole('heading', { name: 'جاهز تبدأ «اسأل صح»؟' })).toBeInViewport();
  expect(await page.evaluate(() => sessionStorage.getItem('analyst-selected-game-v1'))).toBe('problem-framing');
});

test('real audio unlock, mute, volume persistence and game route silence', async ({ page }) => {
  await mockAccount(page);
  await page.addInitScript(() => {
    const elements: HTMLAudioElement[] = [];
    const Original = window.Audio;
    window.Audio = class extends Original { constructor(src?: string) { super(src); elements.push(this); } };
    Object.assign(window, { platformTestAudio: elements });
  });
  const active = () => page.evaluate(() => (window as unknown as { platformTestAudio: HTMLAudioElement[] }).platformTestAudio.filter(el => !el.paused && el.volume > 0).map(el => el.src));
  await page.goto('/app'); expect(await active()).toEqual([]);
  await page.getByRole('button', { name: 'تشغيل الصوت', exact: true }).click();
  await expect.poll(active).toHaveLength(1);
  await page.getByRole('button', { name: /مركز اللاعب/ }).click();
  await page.getByLabel('مستوى الموسيقى').fill('25');
  await page.getByRole('button', { name: 'كتم الموسيقى', exact: true }).click();
  await expect.poll(active).toHaveLength(0);
  await page.getByRole('button', { name: 'تشغيل الموسيقى', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect.poll(active).toHaveLength(1);
  await page.getByRole('button', { name: 'ابدأ اللعب: ملف تحت التحقيق' }).click();
  await expect(page).toHaveURL(/\/games\/investigation-file$/);
  await expect.poll(active).toHaveLength(0);
  await page.goBack(); await expect.poll(active).toHaveLength(1);
  await page.getByRole('button', { name: /مركز اللاعب/ }).click();
  await expect(page.getByLabel('مستوى الموسيقى')).toHaveValue('25');
});
