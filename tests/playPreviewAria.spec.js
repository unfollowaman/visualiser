const { test, expect } = require('@playwright/test');

test.describe('Preview toggle and edit button ARIA attributes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('playPreviewBtn initializes with aria-pressed="false" and aria-label="Play audio preview"', async ({ page }) => {
    const playPreviewBtn = page.locator('#playPreviewBtn');
    await expect(playPreviewBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(playPreviewBtn).toHaveAttribute('aria-label', 'Play audio preview');
  });

  test('playPreviewBtn updates aria-pressed and aria-label during startPreview and stopPreview', async ({ page }) => {
    const result = await page.evaluate(() => {
      decodedAudioBuffer = {
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 10,
        length: 441000,
        getChannelData: () => new Float32Array(441000)
      };
      keepRanges = [{ start: 0, end: 10 }];

      audioCtx = {
        state: 'running',
        currentTime: 0,
        resume: () => {},
        createBuffer: (channels, length, rate) => ({
          numberOfChannels: channels,
          length: length,
          sampleRate: rate,
          getChannelData: () => new Float32Array(length)
        }),
        createBufferSource: () => ({
          buffer: null,
          connect: () => {},
          start: () => {},
          stop: () => {}
        }),
        createAnalyser: () => ({
          fftSize: 256,
          frequencyBinCount: 128,
          connect: () => {},
          getByteFrequencyData: () => {}
        })
      };

      startPreview();

      const btn = document.getElementById('playPreviewBtn');
      const startState = {
        pressed: btn.getAttribute('aria-pressed'),
        label: btn.getAttribute('aria-label')
      };

      stopPreview();

      const stopState = {
        pressed: btn.getAttribute('aria-pressed'),
        label: btn.getAttribute('aria-label')
      };

      return { startState, stopState };
    });

    expect(result.startState.pressed).toBe('true');
    expect(result.startState.label).toBe('Stop audio preview');
    expect(result.stopState.pressed).toBe('false');
    expect(result.stopState.label).toBe('Play audio preview');
  });

  test('showEditBtn has aria-controls="editSection" and updates aria-expanded when clicked and continued', async ({ page }) => {
    const showEditBtn = page.locator('#showEditBtn');
    await expect(showEditBtn).toHaveAttribute('aria-controls', 'editSection');
    await expect(showEditBtn).toHaveAttribute('aria-expanded', 'false');

    await page.evaluate(() => {
      decodedAudioBuffer = {
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 10,
        length: 441000,
        getChannelData: () => new Float32Array(441000)
      };
      keepRanges = [{ start: 0, end: 10 }];

      audioCtx = {
        state: 'running',
        currentTime: 0,
        resume: () => {},
        createBuffer: (channels, length, rate) => ({
          numberOfChannels: channels,
          length: length,
          sampleRate: rate,
          getChannelData: () => new Float32Array(length)
        }),
        createBufferSource: () => ({
          buffer: null,
          connect: () => {},
          start: () => {},
          stop: () => {}
        }),
        createAnalyser: () => ({
          fftSize: 256,
          frequencyBinCount: 128,
          connect: () => {},
          getByteFrequencyData: () => {}
        })
      };

      renderEditState();
      document.getElementById('showEditBtn').click();
    });

    const expandedState = await page.evaluate(() => document.getElementById('showEditBtn').getAttribute('aria-expanded'));
    expect(expandedState).toBe('true');

    await page.evaluate(() => {
      document.getElementById('continueBtn').click();
    });

    const collapsedState = await page.evaluate(() => document.getElementById('showEditBtn').getAttribute('aria-expanded'));
    expect(collapsedState).toBe('false');
  });
});
