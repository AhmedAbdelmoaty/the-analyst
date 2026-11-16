import { expect, test } from "@playwright/test";
const harness = "/tests/behind-dots-visual-harness.html";
test("desktop challenge chart uses its plot cell rather than shrinking to a thumbnail", async ({ page }) => {
  await page.goto(harness + "?scenario=challenge");
  const plot = page.locator(".btd-chart-sheet .btd-main-plot");
  const svg = plot.locator("svg.btd-scatter-svg");
  await expect(svg).toBeVisible();
  const metrics = await page.evaluate(() => {
    const plot = document.querySelector(".btd-chart-sheet .btd-main-plot")!;
    const svg = plot.querySelector("svg")!;
    const p = plot.getBoundingClientRect(), s = svg.getBoundingClientRect();
    return { plotHeight: p.height, plotWidth: p.width, svgHeight: s.height, svgWidth: s.width, overflowX: document.documentElement.scrollWidth - innerWidth };
  });
  expect(metrics.plotHeight).toBeGreaterThan(170);
  expect(metrics.svgHeight).toBeGreaterThan(170);
  expect(metrics.svgWidth).toBeGreaterThan(220);
  expect(metrics.svgHeight).toBeLessThanOrEqual(metrics.plotHeight + 2);
  expect(metrics.overflowX).toBeLessThanOrEqual(3);
});
test("tutorial plot stays within notebook in both tutorial steps", async ({ page }) => {
  await page.goto(harness + "?scenario=tutorial");
  const chart = page.locator(".btd-tutorial-plot svg");
  await expect(chart).toBeVisible();
  const check = async () => {
    const result = await page.evaluate(() => {
      const frame = document.querySelector(".btd-tutorial-plot")!.getBoundingClientRect();
      const svg = document.querySelector(".btd-tutorial-plot svg")!.getBoundingClientRect();
      return { frame, svg };
    });
    expect(result.svg.width).toBeGreaterThan(150);
    expect(result.svg.height).toBeGreaterThan(120);
    expect(result.svg.y).toBeGreaterThanOrEqual(result.frame.y - 2);
    expect(result.svg.y + result.svg.height).toBeLessThanOrEqual(result.frame.y + result.frame.height + 2);
  };
  await check();
  await page.getByRole("button", { name: "حطّ النقطة في مكانها" }).click();
  await check();
  await page.getByRole("button", { name: "أظهر باقي الأيام" }).click();
  await check();
});
