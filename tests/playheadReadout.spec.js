const { test, expect } = require('@playwright/test');

test.describe('playheadReadout unit and integration tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('playheadReadout element exists with aria-hidden=true inside playheadLine', async ({ page }) => {
    const info = await page.evaluate(() => {
      const readout = document.getElementById('playheadReadout');
      const line = document.getElementById('playheadLine');
      return {
        exists: !!readout,
        parentIsLine: readout ? readout.parentElement === line : false,
        ariaHidden: readout ? readout.getAttribute('aria-hidden') : null,
        initialText: readout ? readout.textContent : null,
        hasClass: readout ? readout.classList.contains('playhead-readout') : false
      };
    });

    expect(info.exists).toBe(true);
    expect(info.parentIsLine).toBe(true);
    expect(info.ariaHidden).toBe('true');
    expect(info.initialText).toBe('00:00.0');
    expect(info.hasClass).toBe(true);
  });

  test('runPreviewLoop updates playheadReadout text content with formatted timestamp', async ({ page }) => {
    const result = await page.evaluate(() => {
      isPreviewPlaying = true;
      audioCtx = {
        currentTime: 2.5
      };
      activePreviewSource = {};
      previewStartTime = 0;
      decodedAudioBuffer = {
        duration: 10
      };
      keepRanges = [{ start: 0, end: 10 }];

      activePreviewAnalyser = {
        frequencyBinCount: 128,
        getByteFrequencyData: (arr) => arr.fill(0)
      };

      runPreviewLoop();

      const readout = document.getElementById('playheadReadout');
      return {
        text: readout ? readout.textContent : null
      };
    });

    expect(result.text).toBe('00:02.5');
  });
});
