const { test, expect } = require('@playwright/test');

test.describe('drawRoundedRect unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('draws rounded rectangle path on canvas context with options object', async ({ page }) => {
    const calls = await page.evaluate(() => {
      const recordedCalls = [];
      const mockCtx = {
        beginPath: () => recordedCalls.push('beginPath'),
        moveTo: (x, y) => recordedCalls.push(['moveTo', x, y]),
        lineTo: (x, y) => recordedCalls.push(['lineTo', x, y]),
        quadraticCurveTo: (cpx, cpy, x, y) => recordedCalls.push(['quadraticCurveTo', cpx, cpy, x, y]),
        closePath: () => recordedCalls.push('closePath'),
        fill: () => recordedCalls.push('fill')
      };

      drawRoundedRect(mockCtx, { x: 10, y: 20, width: 100, height: 50, radius: 5 });
      return recordedCalls;
    });

    expect(calls).toEqual([
      'beginPath',
      ['moveTo', 15, 20],
      ['lineTo', 105, 20],
      ['quadraticCurveTo', 110, 20, 110, 25],
      ['lineTo', 110, 65],
      ['quadraticCurveTo', 110, 70, 105, 70],
      ['lineTo', 15, 70],
      ['quadraticCurveTo', 10, 70, 10, 65],
      ['lineTo', 10, 25],
      ['quadraticCurveTo', 10, 20, 15, 20],
      'closePath',
      'fill'
    ]);
  });
});
