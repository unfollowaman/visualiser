const { test, expect } = require('@playwright/test');

test.describe('logError and logWarn unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('logError delegates multiple arguments to console.error', async ({ page }) => {
    const result = await page.evaluate(() => {
      const origError = console.error;
      const calls = [];
      console.error = (...args) => {
        calls.push(args);
      };

      try {
        logError('Error message', 404, { detail: 'Not Found' });
        return {
          callCount: calls.length,
          firstCallArgs: calls[0]
        };
      } finally {
        console.error = origError;
      }
    });

    expect(result.callCount).toBe(1);
    expect(result.firstCallArgs).toEqual(['Error message', 404, { detail: 'Not Found' }]);
  });

  test('logError handles empty arguments and null/undefined gracefully', async ({ page }) => {
    const result = await page.evaluate(() => {
      const origError = console.error;
      const calls = [];
      console.error = (...args) => {
        calls.push(args);
      };

      try {
        logError();
        logError(null, undefined);
        const errObj = new Error('Test failure');
        logError(errObj);

        return {
          callCount: calls.length,
          call0: calls[0],
          call1: calls[1],
          call2Message: calls[2][0] instanceof Error ? calls[2][0].message : null
        };
      } finally {
        console.error = origError;
      }
    });

    expect(result.callCount).toBe(3);
    expect(result.call0).toEqual([]);
    expect(result.call1).toEqual([null, undefined]);
    expect(result.call2Message).toBe('Test failure');
  });

  test('logWarn delegates multiple arguments to console.warn', async ({ page }) => {
    const result = await page.evaluate(() => {
      const origWarn = console.warn;
      const calls = [];
      console.warn = (...args) => {
        calls.push(args);
      };

      try {
        logWarn('Warning message', { code: 200, status: 'deprecated' });
        return {
          callCount: calls.length,
          firstCallArgs: calls[0]
        };
      } finally {
        console.warn = origWarn;
      }
    });

    expect(result.callCount).toBe(1);
    expect(result.firstCallArgs).toEqual(['Warning message', { code: 200, status: 'deprecated' }]);
  });

  test('logWarn handles empty arguments and null/undefined gracefully', async ({ page }) => {
    const result = await page.evaluate(() => {
      const origWarn = console.warn;
      const calls = [];
      console.warn = (...args) => {
        calls.push(args);
      };

      try {
        logWarn();
        logWarn(null, undefined);

        return {
          callCount: calls.length,
          call0: calls[0],
          call1: calls[1]
        };
      } finally {
        console.warn = origWarn;
      }
    });

    expect(result.callCount).toBe(2);
    expect(result.call0).toEqual([]);
    expect(result.call1).toEqual([null, undefined]);
  });
});
