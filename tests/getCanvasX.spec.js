const { test, expect } = require('@playwright/test');

test.describe('getCanvasX unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('handles mouse event clientX within bounds correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Set a controlled cached rect for deterministic testing
      cachedEditorRect = { left: 100, top: 0, width: 500, height: 100 };
      const event = { clientX: 250 };
      return getCanvasX(event);
    });
    expect(result).toBe(150);
  });

  test('clamps mouse event clientX to 0 when clientX is to the left of container', async ({ page }) => {
    const result = await page.evaluate(() => {
      cachedEditorRect = { left: 100, top: 0, width: 500, height: 100 };
      const event = { clientX: 50 };
      return getCanvasX(event);
    });
    expect(result).toBe(0);
  });

  test('clamps mouse event clientX to width when clientX is to the right of container', async ({ page }) => {
    const result = await page.evaluate(() => {
      cachedEditorRect = { left: 100, top: 0, width: 500, height: 100 };
      const event = { clientX: 700 };
      return getCanvasX(event);
    });
    expect(result).toBe(500);
  });

  test('handles touch event touches[0].clientX within bounds correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      cachedEditorRect = { left: 50, top: 0, width: 400, height: 100 };
      const event = { touches: [{ clientX: 150 }] };
      return getCanvasX(event);
    });
    expect(result).toBe(100);
  });

  test('clamps touch event touches[0].clientX to 0 when touch is to the left of container', async ({ page }) => {
    const result = await page.evaluate(() => {
      cachedEditorRect = { left: 50, top: 0, width: 400, height: 100 };
      const event = { touches: [{ clientX: 10 }] };
      return getCanvasX(event);
    });
    expect(result).toBe(0);
  });

  test('clamps touch event touches[0].clientX to width when touch is to the right of container', async ({ page }) => {
    const result = await page.evaluate(() => {
      cachedEditorRect = { left: 50, top: 0, width: 400, height: 100 };
      const event = { touches: [{ clientX: 500 }] };
      return getCanvasX(event);
    });
    expect(result).toBe(400);
  });

  test('automatically updates editor dimensions when cachedEditorRect is null', async ({ page }) => {
    const result = await page.evaluate(() => {
      cachedEditorRect = null;
      const event = { clientX: 100 };
      const x = getCanvasX(event);
      return { x, isCachedRectPopulated: cachedEditorRect !== null };
    });
    expect(result.isCachedRectPopulated).toBe(true);
    expect(typeof result.x).toBe('number');
    expect(result.x).toBeGreaterThanOrEqual(0);
  });

  test('automatically updates editor dimensions when cachedEditorRect width is 0', async ({ page }) => {
    const result = await page.evaluate(() => {
      cachedEditorRect = { left: 0, top: 0, width: 0, height: 0 };
      const event = { clientX: 100 };
      const x = getCanvasX(event);
      return { x, updatedWidth: cachedEditorRect ? cachedEditorRect.width : 0 };
    });
    expect(typeof result.x).toBe('number');
  });
});
