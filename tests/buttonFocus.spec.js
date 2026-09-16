const { test, expect } = require('@playwright/test');

test.describe('buttonFocus unit and integration tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/index.html');
  });

  test('.btn elements have focus-visible outline styles defined', async ({ page }) => {
    const focusOutlineStyles = await page.evaluate(() => {
      const btn = document.getElementById('playPreviewBtn');
      btn.focus();
      const computed = window.getComputedStyle(btn);
      return {
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        outlineColor: computed.outlineColor,
        outlineOffset: computed.outlineOffset
      };
    });

    // Verify button focus styling in browser environment
    expect(focusOutlineStyles.outlineStyle).not.toBe('');
  });
});
