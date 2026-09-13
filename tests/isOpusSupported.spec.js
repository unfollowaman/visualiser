const { test, expect } = require('@playwright/test');

test.describe('isOpusSupported unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('returns false when AudioEncoder is undefined', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const origAudioEncoder = window.AudioEncoder;
      delete window.AudioEncoder;
      try {
        const config = { codec: 'opus', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 };
        return await isOpusSupported(config);
      } finally {
        if (origAudioEncoder) {
          window.AudioEncoder = origAudioEncoder;
        }
      }
    });

    expect(result).toBe(false);
  });

  test('returns false when AudioEncoder.isConfigSupported throws an error', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const origAudioEncoder = window.AudioEncoder;
      window.AudioEncoder = {
        isConfigSupported: async () => {
          throw new Error('Unsupported Opus codec query');
        }
      };
      try {
        const config = { codec: 'opus', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 };
        return await isOpusSupported(config);
      } finally {
        if (origAudioEncoder) {
          window.AudioEncoder = origAudioEncoder;
        } else {
          delete window.AudioEncoder;
        }
      }
    });

    expect(result).toBe(false);
  });

  test('returns true when AudioEncoder.isConfigSupported resolves with supported: true', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const origAudioEncoder = window.AudioEncoder;
      window.AudioEncoder = {
        isConfigSupported: async (config) => {
          return { supported: true, config };
        }
      };
      try {
        const config = { codec: 'opus', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 };
        return await isOpusSupported(config);
      } finally {
        if (origAudioEncoder) {
          window.AudioEncoder = origAudioEncoder;
        } else {
          delete window.AudioEncoder;
        }
      }
    });

    expect(result).toBe(true);
  });

  test('returns false when AudioEncoder.isConfigSupported resolves with supported: false', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const origAudioEncoder = window.AudioEncoder;
      window.AudioEncoder = {
        isConfigSupported: async (config) => {
          return { supported: false, config };
        }
      };
      try {
        const config = { codec: 'opus', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 };
        return await isOpusSupported(config);
      } finally {
        if (origAudioEncoder) {
          window.AudioEncoder = origAudioEncoder;
        } else {
          delete window.AudioEncoder;
        }
      }
    });

    expect(result).toBe(false);
  });
});
