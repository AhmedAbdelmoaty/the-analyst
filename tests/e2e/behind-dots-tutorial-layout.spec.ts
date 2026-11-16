import { expect, test } from "@playwright/test";

test("tutorial chart remains fully inside its notebook without horizontal clipping", async ({ page }, testInfo) => {
  await page.goto("/tests/behind-dots-visual-harness.html?scenario=tutorial");
  const notebook = page.locator(".btd-tutorial-sheet");
  const chart = page.locator(".btd-tutorial-plot .btd-scatter-svg");
  await expect(notebook).toBeVisible();
  await expect(chart).toBeVisible();
  await chart.scrollIntoViewIfNeeded();
  const bounds = await chart.boundingBox();
  const notebookBounds = await notebook.boundingBox();
  expect(bounds).not.toBeNull();
  expect(notebookBounds).not.toBeNull();
  expect(bounds!.width).toBeGreaterThan(150);
  expect(bounds!.height).toBeGreaterThan(100);
  expect(bounds!.x).toBeGreaterThanOrEqual(notebookBounds!.x - 2);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(notebookBounds!.x + notebookBounds!.width + 2);
  const metrics = await page.evaluate(() => {
    const svg = document.querySelector(".btd-tutorial-plot .btd-scatter-svg") as SVGSVGElement;
    const box = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    return { width: box.width, height: box.height, viewRatio: viewBox.width / viewBox.height };
  });
  expect(Math.abs(metrics.width / metrics.height - metrics.viewRatio)).toBeLessThan(0.05);
  await page.screenshot({ path: testInfo.outputPath("tutorial-layout.png"), fullPage: true });
});
