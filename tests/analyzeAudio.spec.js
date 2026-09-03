const { test, expect } = require('@playwright/test');

test.describe('analyzeAudio unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('correctly analyzes audio and returns Float32Array subarrays per frame', async ({ page }) => {
    const analysis = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      const duration = 2; // 2 seconds = 120 frames at 60fps
      const mockBuffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const channel = mockBuffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) {
        channel[i] = Math.sin(i * 0.05);
      }

      const frames = analyzeAudio(mockBuffer);
      return {
        totalFrames: frames.length,
        frame0Length: frames[0].length,
        frame0IsFloat32: frames[0] instanceof Float32Array,
        frame0Bar0: frames[0][0],
        frame119Bar47: frames[119][47]
      };
    });

    expect(analysis.totalFrames).toBe(120);
    expect(analysis.frame0Length).toBe(48);
    expect(analysis.frame0IsFloat32).toBe(true);
    expect(typeof analysis.frame0Bar0).toBe('number');
    expect(typeof analysis.frame119Bar47).toBe('number');
  });
});
