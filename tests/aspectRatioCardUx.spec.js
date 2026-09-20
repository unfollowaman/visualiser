const { test, expect } = require('@playwright/test');

test.describe('Aspect Ratio Card UX & Accessibility tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      decodedAudioBuffer = {
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 10,
        length: 441000,
        getChannelData: () => new Float32Array(441000)
      };
      keepRanges = [{ start: 0, end: 10 }];
      window.workingAudioBuffer = decodedAudioBuffer;
      document.getElementById('aspectRatioSection').classList.remove('hidden');
    });
  });

  test('aspect cards update selected class, aria-pressed state, and canvas dimensions on click and keydown', async ({ page }) => {
    const card16x9 = page.locator('#card16x9');
    const card9x16 = page.locator('#card9x16');

    // Initially neither card selected
    await expect(card16x9).toHaveAttribute('aria-pressed', 'false');
    await expect(card9x16).toHaveAttribute('aria-pressed', 'false');

    // Click 16:9 card
    await card16x9.click();

    await expect(card16x9).toHaveClass(/selected/);
    await expect(card16x9).toHaveAttribute('aria-pressed', 'true');
    await expect(card9x16).toHaveAttribute('aria-pressed', 'false');

    // Verify previewCanvas updated width & height
    const dimensions16x9 = await page.evaluate(() => {
      const canvas = document.getElementById('previewCanvas');
      return { width: canvas.width, height: canvas.height };
    });
    expect(dimensions16x9).toEqual({ width: 1280, height: 720 });

    // Focus 9:16 card and press Enter key
    await card9x16.focus();
    await page.keyboard.press('Enter');

    await expect(card9x16).toHaveClass(/selected/);
    await expect(card9x16).toHaveAttribute('aria-pressed', 'true');
    await expect(card16x9).not.toHaveClass(/selected/);
    await expect(card16x9).toHaveAttribute('aria-pressed', 'false');

    // Verify previewCanvas updated width & height for 9:16
    const dimensions9x16 = await page.evaluate(() => {
      const canvas = document.getElementById('previewCanvas');
      return { width: canvas.width, height: canvas.height };
    });
    expect(dimensions9x16).toEqual({ width: 720, height: 1280 });
  });

  test('aspect cards have hover styles applied in CSS', async ({ page }) => {
    const card16x9 = page.locator('#card16x9');
    await card16x9.hover();

    // Wait for 0.15s transition to finish
    await page.waitForTimeout(200);

    const hoverBgColor = await card16x9.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // #1a1a1a in rgb is rgb(26, 26, 26)
    expect(hoverBgColor).toBe('rgb(26, 26, 26)');
  });
});
