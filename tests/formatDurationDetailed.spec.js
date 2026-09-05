const { test, expect } = require('@playwright/test');

test.describe('formatDurationDetailed unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('formats zero seconds correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDurationDetailed(0));
    expect(formatted).toBe('00:00.0');
  });

  test('formats sub-minute seconds with single digit second correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDurationDetailed(5.4));
    expect(formatted).toBe('00:05.4');
  });

  test('formats sub-minute seconds with double digit second correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDurationDetailed(12.8));
    expect(formatted).toBe('00:12.8');
  });

  test('formats exact minute boundary correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDurationDetailed(60));
    expect(formatted).toBe('01:00.0');
  });

  test('formats multi-minute seconds with fractional component correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDurationDetailed(65.7));
    expect(formatted).toBe('01:05.7');
  });

  test('formats double digit minutes correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDurationDetailed(605.2));
    expect(formatted).toBe('10:05.2');
  });

  test('formats integer seconds with .0 decimal component', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDurationDetailed(45));
    expect(formatted).toBe('00:45.0');
  });

  test('truncates fractional sub-seconds to single digit tenth', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDurationDetailed(59.99));
    expect(formatted).toBe('00:59.9');
  });

  test('formats large durations greater than an hour into minutes', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDurationDetailed(3661.8));
    expect(formatted).toBe('61:01.8');
  });

  test('formats basic formatDuration utility correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => formatDuration(125));
    expect(formatted).toBe('02:05');
  });
});
