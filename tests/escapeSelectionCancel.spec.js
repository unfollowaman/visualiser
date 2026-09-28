const { test, expect } = require('@playwright/test');

test.describe('Escape key waveform selection cancel tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('pressing Escape clears active waveform selection, hides highlight, and disables cut button', async ({ page }) => {
    const result = await page.evaluate(() => {
      decodedAudioBuffer = {
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 10,
        length: 441000,
        getChannelData: () => new Float32Array(441000)
      };
      keepRanges = [{ start: 0, end: 10 }];

      document.getElementById('editSection').classList.remove('hidden');

      // Simulate making a selection on waveform
      selectionStartX = 100;
      selectionEndX = 300;
      updateSelectionHighlight();

      const cutBtn = document.getElementById('cutSelectedBtn');
      const highlight = document.getElementById('selectionHighlight');

      const activeState = {
        selectionStartX,
        selectionEndX,
        cutBtnDisabled: cutBtn.disabled,
        cutBtnTitle: cutBtn.getAttribute('title'),
        highlightHidden: highlight.classList.contains('hidden')
      };

      // Dispatch Escape key event
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      const clearedState = {
        selectionStartX,
        selectionEndX,
        cutBtnDisabled: cutBtn.disabled,
        cutBtnTitle: cutBtn.getAttribute('title'),
        highlightHidden: highlight.classList.contains('hidden')
      };

      return { activeState, clearedState };
    });

    expect(result.activeState.selectionStartX).toBe(100);
    expect(result.activeState.selectionEndX).toBe(300);
    expect(result.activeState.cutBtnDisabled).toBe(false);
    expect(result.activeState.cutBtnTitle).toBe('Cut selected audio range (Esc to cancel)');
    expect(result.activeState.highlightHidden).toBe(false);

    expect(result.clearedState.selectionStartX).toBeNull();
    expect(result.clearedState.selectionEndX).toBeNull();
    expect(result.clearedState.cutBtnDisabled).toBe(true);
    expect(result.clearedState.highlightHidden).toBe(true);
  });

  test('pressing Escape when editSection is hidden does not throw or interfere', async ({ page }) => {
    const result = await page.evaluate(() => {
      document.getElementById('editSection').classList.add('hidden');
      selectionStartX = null;
      selectionEndX = null;

      // Dispatch Escape key event
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      return { selectionStartX, selectionEndX };
    });

    expect(result.selectionStartX).toBeNull();
    expect(result.selectionEndX).toBeNull();
  });
});
