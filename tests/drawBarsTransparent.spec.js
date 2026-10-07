import { test, expect } from "@playwright/test";

test.describe("drawBars black background unit tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  test("drawBars fills black background with fillRect and draws bars with fillStyle #ffffff", async ({ page }) => {
    const result = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");

      let fillRectCalls = [];

      const originalFillRect = ctx.fillRect.bind(ctx);
      ctx.fillRect = (x, y, w, h) => {
        fillRectCalls.push({ x, y, w, h, fillStyle: ctx.fillStyle });
        return originalFillRect(x, y, w, h);
      };

      const amplitudes = new Float32Array(48).fill(0.5);
      window.drawBars(ctx, amplitudes, 1280, 720);

      const topCornerPixelData = ctx.getImageData(0, 0, 1, 1).data;
      const isBlackBackground = topCornerPixelData[0] === 0 && topCornerPixelData[1] === 0 && topCornerPixelData[2] === 0 && topCornerPixelData[3] === 255;

      return {
        fillRectCalls,
        isBlackBackground,
        fillStyle: ctx.fillStyle,
      };
    });

    expect(result.fillRectCalls.length).toBeGreaterThan(0);
    expect(result.fillRectCalls[0]).toEqual({ x: 0, y: 0, w: 1280, h: 720, fillStyle: "#000000" });
    expect(result.isBlackBackground).toBe(true);
    expect(result.fillStyle.toLowerCase()).toBe("#ffffff");
  });
});
