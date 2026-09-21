const { test, expect } = require('@playwright/test');

test.describe('Action buttons aria-disabled and tooltip synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/index.html');
  });

  test('action buttons initialize with disabled="true", aria-disabled="true", and title tooltips', async ({ page }) => {
    const buttons = [
      { id: '#playPreviewBtn', title: 'Load an audio file to play preview' },
      { id: '#cutSelectedBtn', title: 'Drag across waveform timeline to select a region to cut' },
      { id: '#undoBtn', title: 'No edit history to undo' },
      { id: '#resetBtn', title: 'Audio is already at original full length' },
      { id: '#continueBtn', title: 'Load an audio file to continue' },
      { id: '#renderBtn', title: 'Select 16:9 or 9:16 aspect ratio format to render' },
      { id: '#renderFlowerBtn', title: 'Load an audio file and choose aspect ratio to render flower video' }
    ];

    for (const b of buttons) {
      const locator = page.locator(b.id);
      await expect(locator).toHaveAttribute('disabled', '');
      await expect(locator).toHaveAttribute('aria-disabled', 'true');
      await expect(locator).toHaveAttribute('title', b.title);
    }
  });

  test('renderEditState updates aria-disabled and title attributes dynamically', async ({ page }) => {
    const result = await page.evaluate(() => {
      decodedAudioBuffer = {
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 10,
        length: 441000,
        getChannelData: () => new Float32Array(441000)
      };
      keepRanges = [{ start: 0, end: 10 }];
      editHistory = [];

      renderEditState();

      const undo = document.getElementById('undoBtn');
      const reset = document.getElementById('resetBtn');
      const play = document.getElementById('playPreviewBtn');

      const initialUndoState = {
        disabled: undo.disabled,
        ariaDisabled: undo.getAttribute('aria-disabled'),
        title: undo.getAttribute('title')
      };

      const initialResetState = {
        disabled: reset.disabled,
        ariaDisabled: reset.getAttribute('aria-disabled'),
        title: reset.getAttribute('title')
      };

      // Simulate edit history and trimmed range
      editHistory = [[{ start: 0, end: 10 }]];
      keepRanges = [{ start: 2, end: 8 }];

      renderEditState();

      const updatedUndoState = {
        disabled: undo.disabled,
        ariaDisabled: undo.getAttribute('aria-disabled'),
        title: undo.getAttribute('title')
      };

      const updatedResetState = {
        disabled: reset.disabled,
        ariaDisabled: reset.getAttribute('aria-disabled'),
        title: reset.getAttribute('title')
      };

      return { initialUndoState, initialResetState, updatedUndoState, updatedResetState };
    });

    expect(result.initialUndoState.disabled).toBe(true);
    expect(result.initialUndoState.ariaDisabled).toBe('true');
    expect(result.initialUndoState.title).toBe('No edit history to undo');

    expect(result.initialResetState.disabled).toBe(true);
    expect(result.initialResetState.ariaDisabled).toBe('true');
    expect(result.initialResetState.title).toBe('Audio is already at original full length');

    expect(result.updatedUndoState.disabled).toBe(false);
    expect(result.updatedUndoState.ariaDisabled).toBe('false');
    expect(result.updatedUndoState.title).toBe('Undo last audio edit');

    expect(result.updatedResetState.disabled).toBe(false);
    expect(result.updatedResetState.ariaDisabled).toBe('false');
    expect(result.updatedResetState.title).toBe('Reset audio edits');
  });

  test('updateSelectionHighlight updates cutSelectedBtn aria-disabled and title', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cutBtn = document.getElementById('cutSelectedBtn');

      // 1. Initial / empty selection state
      selectionStartX = null;
      selectionEndX = null;
      updateSelectionHighlight();
      const emptyState = {
        disabled: cutBtn.disabled,
        ariaDisabled: cutBtn.getAttribute('aria-disabled'),
        title: cutBtn.getAttribute('title')
      };

      // 2. Active selection region
      selectionStartX = 50;
      selectionEndX = 150;
      updateSelectionHighlight();
      const activeState = {
        disabled: cutBtn.disabled,
        ariaDisabled: cutBtn.getAttribute('aria-disabled'),
        title: cutBtn.getAttribute('title')
      };

      return { emptyState, activeState };
    });

    expect(result.emptyState.disabled).toBe(true);
    expect(result.emptyState.ariaDisabled).toBe('true');
    expect(result.emptyState.title).toBe('Drag across waveform timeline to select a region to cut');

    expect(result.activeState.disabled).toBe(false);
    expect(result.activeState.ariaDisabled).toBe('false');
    expect(result.activeState.title).toBe('Cut selected audio range');
  });
});
