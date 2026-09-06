const { test, expect } = require('@playwright/test');

test.describe('extractAudioMetrics unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('returns array filled with zero metrics when audioBuffer is null or undefined', async ({ page }) => {
    const result = await page.evaluate(() => {
      const nullRes = extractAudioMetrics(null, 60, 60);
      const undefRes = extractAudioMetrics(undefined, 30, 60);
      return {
        nullLength: nullRes.length,
        nullFirst: nullRes[0],
        nullLast: nullRes[nullRes.length - 1],
        undefLength: undefRes.length,
        undefFirst: undefRes[0]
      };
    });

    expect(result.nullLength).toBe(60);
    expect(result.nullFirst).toEqual({ amplitude: 0, frequency: 0 });
    expect(result.nullLast).toEqual({ amplitude: 0, frequency: 0 });
    expect(result.undefLength).toBe(30);
    expect(result.undefFirst).toEqual({ amplitude: 0, frequency: 0 });
  });

  test('extracts normalized amplitude and frequency metrics for standard audio signal', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      const duration = 1; // 1 second
      const fps = 60;
      const totalFrames = duration * fps;

      const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const ch0 = buffer.getChannelData(0);
      for (let i = 0; i < ch0.length; i++) {
        // Sine wave audio signal
        ch0[i] = Math.sin((i / sampleRate) * 2 * Math.PI * 440);
      }

      const metrics = extractAudioMetrics(buffer, totalFrames, fps);

      let allValid = true;
      let minAmp = 1, maxAmp = 0;
      let minFreq = 1, maxFreq = 0;

      for (let f = 0; f < metrics.length; f++) {
        const { amplitude, frequency } = metrics[f];
        if (
          typeof amplitude !== 'number' || Number.isNaN(amplitude) ||
          typeof frequency !== 'number' || Number.isNaN(frequency)
        ) {
          allValid = false;
        }
        if (amplitude < minAmp) minAmp = amplitude;
        if (amplitude > maxAmp) maxAmp = amplitude;
        if (frequency < minFreq) minFreq = frequency;
        if (frequency > maxFreq) maxFreq = frequency;
      }

      return {
        length: metrics.length,
        allValid,
        minAmp,
        maxAmp,
        minFreq,
        maxFreq
      };
    });

    expect(result.length).toBe(60);
    expect(result.allValid).toBe(true);
    expect(result.minAmp).toBeGreaterThanOrEqual(0);
    expect(result.maxAmp).toBeLessThanOrEqual(1);
    expect(result.minFreq).toBeGreaterThanOrEqual(0);
    expect(result.maxFreq).toBeLessThanOrEqual(1);
  });

  test('handles silent audio (all zeros) gracefully without NaN or infinity', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      const buffer = audioCtx.createBuffer(2, sampleRate, sampleRate);
      // Leaves channels filled with zeros

      const metrics = extractAudioMetrics(buffer, 60, 60);

      const hasNaN = metrics.some(m => Number.isNaN(m.amplitude) || Number.isNaN(m.frequency));
      const allZero = metrics.every(m => m.amplitude === 0 && m.frequency === 0);

      return {
        length: metrics.length,
        hasNaN,
        allZero
      };
    });

    expect(result.length).toBe(60);
    expect(result.hasNaN).toBe(false);
    expect(result.allZero).toBe(true);
  });

  test('handles totalFrames exceeding sample count where count <= 0 for trailing frames', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      // Audio buffer has only 100 samples (~0.002 seconds)
      const buffer = audioCtx.createBuffer(1, 100, sampleRate);
      buffer.getChannelData(0).fill(0.5);

      // Request 120 frames at 60fps (expects 2 seconds of audio, but buffer is much shorter)
      const totalFrames = 120;
      const metrics = extractAudioMetrics(buffer, totalFrames, 60);

      const hasNaN = metrics.some(m => Number.isNaN(m.amplitude) || Number.isNaN(m.frequency));

      return {
        length: metrics.length,
        hasNaN,
        firstFrame: metrics[0],
        lastFrame: metrics[metrics.length - 1]
      };
    });

    expect(result.length).toBe(120);
    expect(result.hasNaN).toBe(false);
    expect(result.firstFrame).toHaveProperty('amplitude');
    expect(result.firstFrame).toHaveProperty('frequency');
    expect(result.lastFrame).toHaveProperty('amplitude');
    expect(result.lastFrame).toHaveProperty('frequency');
  });

  test('respects custom fps parameter', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      const duration = 2; // 2 seconds
      const fps = 30; // custom FPS
      const totalFrames = duration * fps; // 60 total frames

      const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const ch0 = buffer.getChannelData(0);
      for (let i = 0; i < ch0.length; i++) {
        ch0[i] = Math.sin((i / sampleRate) * 2 * Math.PI * 220);
      }

      const metrics = extractAudioMetrics(buffer, totalFrames, fps);

      return {
        length: metrics.length,
        frame0: metrics[0]
      };
    });

    expect(result.length).toBe(60);
    expect(typeof result.frame0.amplitude).toBe('number');
    expect(typeof result.frame0.frequency).toBe('number');
  });
});
