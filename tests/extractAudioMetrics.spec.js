const { test, expect } = require('@playwright/test');

test.describe('extractAudioMetrics unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('returns default zero array when audioBuffer is null', async ({ page }) => {
    const result = await page.evaluate(() => {
      const metrics = extractAudioMetrics(null, 60, 60);
      return {
        length: metrics.length,
        first: metrics[0],
        last: metrics[metrics.length - 1]
      };
    });

    expect(result.length).toBe(60);
    expect(result.first).toEqual({ amplitude: 0, frequency: 0 });
    expect(result.last).toEqual({ amplitude: 0, frequency: 0 });
  });

  test('correctly extracts audio metrics for mono AudioBuffer', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!window.audioCtx) {
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      const duration = 2; // 2 seconds = 120 frames at 60fps
      const totalFrames = 120;
      const mockBuffer = window.audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const channel = mockBuffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) {
        channel[i] = Math.sin(i * 0.05);
      }

      const metrics = extractAudioMetrics(mockBuffer, totalFrames, 60);
      let allValid = true;
      for (let i = 0; i < metrics.length; i++) {
        const { amplitude, frequency } = metrics[i];
        if (typeof amplitude !== 'number' || typeof frequency !== 'number' ||
            amplitude < 0 || amplitude > 1 || frequency < 0 || frequency > 1) {
          allValid = false;
          break;
        }
      }

      return {
        length: metrics.length,
        allValid,
        hasNonZeroAmp: metrics.some(m => m.amplitude > 0),
        hasNonZeroFreq: metrics.some(m => m.frequency > 0)
      };
    });

    expect(result.length).toBe(120);
    expect(result.allValid).toBe(true);
    expect(result.hasNonZeroAmp).toBe(true);
    expect(result.hasNonZeroFreq).toBe(true);
  });

  test('correctly handles stereo AudioBuffer and normalizes metrics', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!window.audioCtx) {
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      const duration = 1;
      const totalFrames = 60;
      const mockBuffer = window.audioCtx.createBuffer(2, sampleRate * duration, sampleRate);
      const left = mockBuffer.getChannelData(0);
      const right = mockBuffer.getChannelData(1);
      for (let i = 0; i < left.length; i++) {
        left[i] = Math.sin(i * 0.1);
        right[i] = Math.cos(i * 0.1);
      }

      const metrics = extractAudioMetrics(mockBuffer, totalFrames, 60);
      const maxAmp = Math.max(...metrics.map(m => m.amplitude));
      const maxFreq = Math.max(...metrics.map(m => m.frequency));

      return {
        length: metrics.length,
        maxAmp,
        maxFreq,
        minAmp: Math.min(...metrics.map(m => m.amplitude)),
        minFreq: Math.min(...metrics.map(m => m.frequency))
      };
    });

    expect(result.length).toBe(60);
    expect(result.maxAmp).toBeLessThanOrEqual(1.0);
    expect(result.maxFreq).toBeLessThanOrEqual(1.0);
    expect(result.minAmp).toBeGreaterThanOrEqual(0.0);
    expect(result.minFreq).toBeGreaterThanOrEqual(0.0);
  });
});
