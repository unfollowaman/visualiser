const { test, expect } = require('@playwright/test');

test.describe('mixDownToMono unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('returns an empty Float32Array when audioBuffer is null or undefined', async ({ page }) => {
    const result = await page.evaluate(() => {
      const nullRes = mixDownToMono(null);
      const undefRes = mixDownToMono(undefined);
      return {
        nullIsFloat32: nullRes instanceof Float32Array,
        nullLength: nullRes.length,
        undefIsFloat32: undefRes instanceof Float32Array,
        undefLength: undefRes.length
      };
    });

    expect(result.nullIsFloat32).toBe(true);
    expect(result.nullLength).toBe(0);
    expect(result.undefIsFloat32).toBe(true);
    expect(result.undefLength).toBe(0);
  });

  test('returns channel 0 data directly for single-channel (mono) audio', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      const buffer = audioCtx.createBuffer(1, 10, sampleRate);
      const ch0 = buffer.getChannelData(0);
      for (let i = 0; i < 10; i++) ch0[i] = (i + 1) * 0.1;

      const mono = mixDownToMono(buffer);
      return {
        isSameReference: mono === ch0,
        length: mono.length,
        values: Array.from(mono)
      };
    });

    expect(result.isSameReference).toBe(true);
    expect(result.length).toBe(10);
    expect(result.values[0]).toBeCloseTo(0.1, 5);
    expect(result.values[9]).toBeCloseTo(1.0, 5);
  });

  test('correctly mixes down 2-channel (stereo) audio using 0.5 factor', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      const buffer = audioCtx.createBuffer(2, 4, sampleRate);
      const ch0 = buffer.getChannelData(0);
      const ch1 = buffer.getChannelData(1);

      ch0.set([1.0, -0.5, 0.0, 0.8]);
      ch1.set([0.0, 0.5, -1.0, 0.2]);

      const mono = mixDownToMono(buffer);
      return {
        length: mono.length,
        values: Array.from(mono)
      };
    });

    expect(result.length).toBe(4);
    // (1.0 + 0.0) * 0.5 = 0.5
    expect(result.values[0]).toBeCloseTo(0.5, 5);
    // (-0.5 + 0.5) * 0.5 = 0.0
    expect(result.values[1]).toBeCloseTo(0.0, 5);
    // (0.0 + -1.0) * 0.5 = -0.5
    expect(result.values[2]).toBeCloseTo(-0.5, 5);
    // (0.8 + 0.2) * 0.5 = 0.5
    expect(result.values[3]).toBeCloseTo(0.5, 5);
  });

  test('correctly mixes down multi-channel (>2 channels) audio', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      const buffer = audioCtx.createBuffer(4, 2, sampleRate);
      buffer.getChannelData(0).set([0.8, 0.4]);
      buffer.getChannelData(1).set([0.4, 0.0]);
      buffer.getChannelData(2).set([0.0, -0.4]);
      buffer.getChannelData(3).set([-0.4, 0.8]);

      const mono = mixDownToMono(buffer);
      return {
        length: mono.length,
        values: Array.from(mono)
      };
    });

    expect(result.length).toBe(2);
    // Frame 0: (0.8 + 0.4 + 0.0 + -0.4) / 4 = 0.8 / 4 = 0.2
    expect(result.values[0]).toBeCloseTo(0.2, 5);
    // Frame 1: (0.4 + 0.0 + -0.4 + 0.8) / 4 = 0.8 / 4 = 0.2
    expect(result.values[1]).toBeCloseTo(0.2, 5);
  });

  test('memoizes results in monoCache on repeated calls for the same AudioBuffer', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      const buffer = audioCtx.createBuffer(2, 5, sampleRate);
      buffer.getChannelData(0).fill(0.5);
      buffer.getChannelData(1).fill(0.5);

      const firstCall = mixDownToMono(buffer);
      const secondCall = mixDownToMono(buffer);

      return {
        isIdenticalReference: firstCall === secondCall
      };
    });

    expect(result.isIdenticalReference).toBe(true);
  });

  test('handles zero-length mock AudioBuffers gracefully', async ({ page }) => {
    const result = await page.evaluate(() => {
      const mockMonoBuffer = {
        numberOfChannels: 1,
        length: 0,
        getChannelData: () => new Float32Array(0)
      };
      const mockStereoBuffer = {
        numberOfChannels: 2,
        length: 0,
        getChannelData: () => new Float32Array(0)
      };

      const mono1 = mixDownToMono(mockMonoBuffer);
      const mono2 = mixDownToMono(mockStereoBuffer);

      return {
        len1: mono1.length,
        len2: mono2.length,
        isFloat32_1: mono1 instanceof Float32Array,
        isFloat32_2: mono2 instanceof Float32Array
      };
    });

    expect(result.len1).toBe(0);
    expect(result.len2).toBe(0);
    expect(result.isFloat32_1).toBe(true);
    expect(result.isFloat32_2).toBe(true);
  });
});
