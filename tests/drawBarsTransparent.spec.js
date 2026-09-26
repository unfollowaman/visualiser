import { test, expect } from "@playwright/test";

test.describe("drawBars transparent background unit tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  test("drawBars clears canvas with clearRect and draws bars with fillStyle #ffffff", async ({ page }) => {
    const result = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");

      let clearRectCalled = false;
      let clearRectArgs = null;
      let fillRectCount = 0;

      const originalClearRect = ctx.clearRect.bind(ctx);
      ctx.clearRect = (x, y, w, h) => {
        clearRectCalled = true;
        clearRectArgs = { x, y, w, h };
        return originalClearRect(x, y, w, h);
      };

      const originalFillRect = ctx.fillRect.bind(ctx);
      ctx.fillRect = (x, y, w, h) => {
        fillRectCount++;
        return originalFillRect(x, y, w, h);
      };

      const amplitudes = new Float32Array(48).fill(0.5);
      window.drawBars(ctx, amplitudes, 1280, 720);

      const centerPixelData = ctx.getImageData(0, 0, 1, 1).data;
      const isPixelTransparent = centerPixelData[3] === 0;

      return {
        clearRectCalled,
        clearRectArgs,
        fillRectCount,
        isPixelTransparent,
        fillStyle: ctx.fillStyle,
      };
    });

    expect(result.clearRectCalled).toBe(true);
    expect(result.clearRectArgs).toEqual({ x: 0, y: 0, w: 1280, h: 720 });
    expect(result.fillRectCount).toBe(0);
    expect(result.isPixelTransparent).toBe(true);
    expect(result.fillStyle.toLowerCase()).toBe("#ffffff");
  });
});
