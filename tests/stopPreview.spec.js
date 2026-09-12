const { test, expect } = require('@playwright/test');

test.describe('stopPreview unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('gracefully handles error when activePreviewSource.stop() throws an exception', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Set active preview state
      isPreviewPlaying = true;
      activePreviewAnalyser = {};
      previewAnimationId = 12345;

      let stopCalled = false;
      activePreviewSource = {
        stop: () => {
          stopCalled = true;
          throw new Error('InvalidStateError: The AudioBufferSourceNode was not started.');
        }
      };

      // Call stopPreview which should catch the error
      stopPreview();

      const playPreviewBtnText = document.getElementById('playPreviewBtn').textContent;
      const playheadHidden = document.getElementById('playheadLine').classList.contains('hidden');

      return {
        stopCalled,
        activePreviewSourceIsNull: activePreviewSource === null,
        activePreviewAnalyserIsNull: activePreviewAnalyser === null,
        isPreviewPlayingIsFalse: isPreviewPlaying === false,
        previewAnimationIdIsNull: previewAnimationId === null,
        playPreviewBtnText,
        playheadHidden
      };
    });

    expect(result.stopCalled).toBe(true);
    expect(result.activePreviewSourceIsNull).toBe(true);
    expect(result.activePreviewAnalyserIsNull).toBe(true);
    expect(result.isPreviewPlayingIsFalse).toBe(true);
    expect(result.previewAnimationIdIsNull).toBe(true);
    expect(result.playPreviewBtnText).toBe('PLAY PREVIEW');
    expect(result.playheadHidden).toBe(true);
  });

  test('stops preview cleanly when activePreviewSource.stop() succeeds', async ({ page }) => {
    const result = await page.evaluate(() => {
      isPreviewPlaying = true;
      activePreviewAnalyser = {};
      previewAnimationId = 67890;

      let stopCalled = false;
      activePreviewSource = {
        stop: () => {
          stopCalled = true;
        }
      };

      stopPreview();

      const playPreviewBtnText = document.getElementById('playPreviewBtn').textContent;
      const playheadHidden = document.getElementById('playheadLine').classList.contains('hidden');

      return {
        stopCalled,
        activePreviewSourceIsNull: activePreviewSource === null,
        activePreviewAnalyserIsNull: activePreviewAnalyser === null,
        isPreviewPlayingIsFalse: isPreviewPlaying === false,
        previewAnimationIdIsNull: previewAnimationId === null,
        playPreviewBtnText,
        playheadHidden
      };
    });

    expect(result.stopCalled).toBe(true);
    expect(result.activePreviewSourceIsNull).toBe(true);
    expect(result.activePreviewAnalyserIsNull).toBe(true);
    expect(result.isPreviewPlayingIsFalse).toBe(true);
    expect(result.previewAnimationIdIsNull).toBe(true);
    expect(result.playPreviewBtnText).toBe('PLAY PREVIEW');
    expect(result.playheadHidden).toBe(true);
  });

  test('handles stopPreview when activePreviewSource is already null', async ({ page }) => {
    const result = await page.evaluate(() => {
      isPreviewPlaying = false;
      activePreviewSource = null;
      activePreviewAnalyser = null;
      previewAnimationId = null;

      // Should not throw or fail
      stopPreview();

      const playPreviewBtnText = document.getElementById('playPreviewBtn').textContent;

      return {
        activePreviewSourceIsNull: activePreviewSource === null,
        activePreviewAnalyserIsNull: activePreviewAnalyser === null,
        isPreviewPlayingIsFalse: isPreviewPlaying === false,
        playPreviewBtnText
      };
    });

    expect(result.activePreviewSourceIsNull).toBe(true);
    expect(result.activePreviewAnalyserIsNull).toBe(true);
    expect(result.isPreviewPlayingIsFalse).toBe(true);
    expect(result.playPreviewBtnText).toBe('PLAY PREVIEW');
  });
});
