const { test, expect } = require('@playwright/test');

test.describe('buildWorkingAudioBuffer unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('returns null when decodedAudioBuffer is null (empty keepRanges)', async ({ page }) => {
    const result = await page.evaluate(() => {
      decodedAudioBuffer = null;
      keepRanges = [];
      return buildWorkingAudioBuffer();
    });

    expect(result).toBeNull();
  });

  test('returns null when decodedAudioBuffer is null (non-empty keepRanges)', async ({ page }) => {
    const result = await page.evaluate(() => {
      decodedAudioBuffer = null;
      keepRanges = [{ start: 0, end: 10 }];
      return buildWorkingAudioBuffer();
    });

    expect(result).toBeNull();
  });

  test('returns decodedAudioBuffer unchanged when keepRanges is empty', async ({ page }) => {
    const isSameBuffer = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const mockBuffer = audioCtx.createBuffer(2, 44100, 44100);
      decodedAudioBuffer = mockBuffer;
      keepRanges = [];

      const result = buildWorkingAudioBuffer();
      return result === decodedAudioBuffer;
    });

    expect(isSameBuffer).toBe(true);
  });

  test('creates a trimmed AudioBuffer with fades when keepRanges has ranges', async ({ page }) => {
    const details = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      const mockBuffer = audioCtx.createBuffer(1, sampleRate * 2, sampleRate);
      const data = mockBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = 1.0;
      }

      decodedAudioBuffer = mockBuffer;
      keepRanges = [{ start: 0.5, end: 1.5 }];

      const resultBuffer = buildWorkingAudioBuffer();
      if (!resultBuffer) return null;

      const resultData = resultBuffer.getChannelData(0);

      return {
        sampleRate: resultBuffer.sampleRate,
        numberOfChannels: resultBuffer.numberOfChannels,
        length: resultBuffer.length,
        duration: resultBuffer.duration,
        firstSample: resultData[0],
        midSample: resultData[Math.floor(resultData.length / 2)],
        lastSample: resultData[resultData.length - 1],
      };
    });

    expect(details).not.toBeNull();
    expect(details.length).toBe(44100);
    expect(details.duration).toBeCloseTo(1.0, 2);
    expect(details.firstSample).toBe(0);
    expect(details.midSample).toBe(1.0);
    expect(details.lastSample).toBeCloseTo(0, 1);
  });
});
