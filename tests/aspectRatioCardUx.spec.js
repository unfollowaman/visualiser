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

  test('aspect cards dynamically update aria-label when selected and deselected', async ({ page }) => {
    const card16x9 = page.locator('#card16x9');
    const card9x16 = page.locator('#card9x16');

    await expect(card16x9).toHaveAttribute('aria-label', 'Select 16:9 aspect ratio (Landscape)');
    await expect(card9x16).toHaveAttribute('aria-label', 'Select 9:16 aspect ratio (Vertical)');

    // Select 16:9 card
    await card16x9.click();

    await expect(card16x9).toHaveAttribute('aria-label', '16:9 aspect ratio (Landscape), selected');
    await expect(card9x16).toHaveAttribute('aria-label', 'Select 9:16 aspect ratio (Vertical)');

    // Select 9:16 card
    await card9x16.click();

    await expect(card9x16).toHaveAttribute('aria-label', '9:16 aspect ratio (Vertical), selected');
    await expect(card16x9).toHaveAttribute('aria-label', 'Select 16:9 aspect ratio (Landscape)');
  });

  test('aspect cards support Arrow key navigation', async ({ page }) => {
    const card16x9 = page.locator('#card16x9');
    const card9x16 = page.locator('#card9x16');

    // Focus 16:9 card and press ArrowRight
    await card16x9.focus();
    await page.keyboard.press('ArrowRight');

    await expect(card9x16).toBeFocused();
    await expect(card9x16).toHaveClass(/selected/);
    await expect(card9x16).toHaveAttribute('aria-pressed', 'true');

    // Press ArrowLeft to move focus back to 16:9 card
    await page.keyboard.press('ArrowLeft');

    await expect(card16x9).toBeFocused();
    await expect(card16x9).toHaveClass(/selected/);
    await expect(card16x9).toHaveAttribute('aria-pressed', 'true');
  });

  test('dropZone aria-label updates dynamically when audio file is loaded', async ({ page }) => {
    const dropZone = page.locator('#dropZone');

    await page.evaluate(() => {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      const origDecode = AudioContext.prototype.decodeAudioData;
      AudioContext.prototype.decodeAudioData = function (buffer, successCallback) {
        successCallback({
          duration: 10,
          sampleRate: 44100,
          numberOfChannels: 2,
          length: 441000,
          getChannelData: () => new Float32Array(441000)
        });
      };

      const origRead = FileReader.prototype.readAsArrayBuffer;
      FileReader.prototype.readAsArrayBuffer = function () {
        if (typeof this.onload === 'function') {
          this.onload({ target: { result: new ArrayBuffer(8) } });
        }
      };

      handleSelectedFile(new File(['fake audio'], 'sample.mp3', { type: 'audio/mp3' }));

      AudioContext.prototype.decodeAudioData = origDecode;
      FileReader.prototype.readAsArrayBuffer = origRead;
    });

    await expect(dropZone).toHaveAttribute('aria-label', 'Replace audio file');
  });
});
