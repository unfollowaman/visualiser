const { test, expect } = require('@playwright/test');

test.describe('isAACSupported unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('returns false when AudioEncoder is undefined', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const origAudioEncoder = window.AudioEncoder;
      delete window.AudioEncoder;
      try {
        const config = { codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 };
        return await isAACSupported(config);
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
          throw new Error('Unsupported codec query');
        }
      };
      try {
        const config = { codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 };
        return await isAACSupported(config);
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
        const config = { codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 };
        return await isAACSupported(config);
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
        const config = { codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 };
        return await isAACSupported(config);
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
