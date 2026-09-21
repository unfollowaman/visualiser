const { test, expect } = require('@playwright/test');

test.describe('Keyboard Focus Transitions for Section Toggles and Export Completion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('showEditBtn click sets focus to playPreviewBtn', async ({ page }) => {
    const focusedId = await page.evaluate(() => {
      decodedAudioBuffer = {
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 1,
        length: 44100,
        getChannelData: () => new Float32Array(44100)
      };
      keepRanges = [{ start: 0, end: 1 }];

      renderEditState();
      const showEditBtn = document.getElementById('showEditBtn');
      showEditBtn.click();

      return document.activeElement ? document.activeElement.id : null;
    });

    expect(focusedId).toBe('playPreviewBtn');
  });

  test('continueBtn click sets focus to card16x9', async ({ page }) => {
    const focusedId = await page.evaluate(() => {
      audioCtx = {
        createBuffer: (channels, length, rate) => ({
          numberOfChannels: channels,
          length: length,
          sampleRate: rate,
          getChannelData: () => new Float32Array(length)
        })
      };
      decodedAudioBuffer = {
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 1,
        length: 44100,
        getChannelData: () => new Float32Array(44100)
      };
      keepRanges = [{ start: 0, end: 1 }];

      renderEditState();
      document.getElementById('showEditBtn').click();

      const continueBtn = document.getElementById('continueBtn');
      continueBtn.disabled = false;
      continueBtn.removeAttribute('aria-disabled');
      continueBtn.click();

      return document.activeElement ? document.activeElement.id : null;
    });

    expect(focusedId).toBe('card16x9');
  });

  test('waveform video export completion sets focus to downloadVideo link', async ({ page }) => {
    const focusedId = await page.evaluate(async () => {
      window.workingAudioBuffer = {
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 1,
        length: 44100,
        getChannelData: () => new Float32Array(44100)
      };
      chosenWidth = 1280;
      chosenHeight = 720;

      // Mock analyzeAudio and renderFormat to simulate export completion fast
      window.analyzeAudio = () => [new Float32Array(48)];
      window.renderFormat = async () => new Blob(['fake-video'], { type: 'video/mp4' });

      const renderBtn = document.getElementById('renderBtn');
      renderBtn.disabled = false;
      renderBtn.removeAttribute('aria-disabled');

      renderBtn.click();

      // Wait briefly for async export promise resolution
      await new Promise((r) => setTimeout(r, 100));

      return document.activeElement ? document.activeElement.id : null;
    });

    expect(focusedId).toBe('downloadVideo');
  });

  test('flower video export completion sets focus to flowerDownloadVideo link', async ({ page }) => {
    const focusedId = await page.evaluate(async () => {
      window.workingAudioBuffer = {
        sampleRate: 44100,
        numberOfChannels: 2,
        duration: 1,
        length: 44100,
        getChannelData: () => new Float32Array(44100)
      };

      // Mock extractAudioMetrics and flowerMp4MuxerPromise module
      window.extractAudioMetrics = async (buf, frames) => new Array(frames).fill({ amplitude: 0.5, frequency: 0.5 });
      flowerMp4MuxerPromise = Promise.resolve({
        Mp4Muxer: {
          ArrayBufferTarget: class {},
          Muxer: class {
            constructor() {
              this.target = { buffer: new ArrayBuffer(8) };
            }
            addVideoChunk() {}
            finalize() {}
          }
        }
      });

      window.VideoEncoder = class {
        configure() {}
        encode() {}
        async flush() {}
        close() {}
      };
      window.VideoFrame = class {
        close() {}
      };

      const renderFlowerBtn = document.getElementById('renderFlowerBtn');
      renderFlowerBtn.disabled = false;
      renderFlowerBtn.removeAttribute('aria-disabled');

      // Trigger export function
      await renderAndExportFlowerVideo();

      return document.activeElement ? document.activeElement.id : null;
    });

    expect(focusedId).toBe('flowerDownloadVideo');
  });
});
