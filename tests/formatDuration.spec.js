const { test, expect } = require('@playwright/test');

test.describe('formatDuration unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('formats zero seconds correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDuration(0));
    expect(formatted).toBe('00:00');
  });

  test('formats sub-minute seconds with single digit second correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDuration(5));
    expect(formatted).toBe('00:05');
  });

  test('formats sub-minute seconds with double digit second correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDuration(45));
    expect(formatted).toBe('00:45');
  });

  test('formats exact minute boundary correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDuration(60));
    expect(formatted).toBe('01:00');
  });

  test('formats multi-minute seconds with fractional component correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDuration(65.7));
    expect(formatted).toBe('01:05');
  });

  test('formats 125 seconds correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDuration(125));
    expect(formatted).toBe('02:05');
  });

  test('formats double digit minutes correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDuration(605));
    expect(formatted).toBe('10:05');
  });

  test('formats large durations greater than an hour into minutes', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDuration(3661));
    expect(formatted).toBe('61:01');
  });
});
