const { test, expect } = require('@playwright/test');

test.describe('Main render process exception handling tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('catches Error objects in analyzeAudio and resets UI state gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Set up mock workingAudioBuffer and decodedAudioBuffer
      const mockBuffer = {
        duration: 5.0,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 220500,
        getChannelData: () => new Float32Array(220500)
      };
      window.workingAudioBuffer = mockBuffer;
      decodedAudioBuffer = mockBuffer;

      const renderBtn = document.getElementById('renderBtn');
      const playPreviewBtn = document.getElementById('playPreviewBtn');
      const card16x9 = document.getElementById('card16x9');
      const card9x16 = document.getElementById('card9x16');
      const progressContainer = document.getElementById('progressContainer');
      const statusLine = document.getElementById('statusLine');

      // Click card16x9 to set chosenWidth = 1280, chosenHeight = 720
      card16x9.click();

      // Mock analyzeAudio to throw Error
      analyzeAudio = () => {
        throw new Error('Audio analysis failed due to corrupted samples');
      };

      // Trigger click and wait for async click handler to settle
      renderBtn.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      const statusText = statusLine.textContent;
      const statusHidden = statusLine.classList.contains('hidden');
      const progressHidden = progressContainer.classList.contains('hidden');
      const renderDisabled = renderBtn.disabled;
      const playPreviewDisabled = playPreviewBtn.disabled;
      const card16x9Disabled = card16x9.classList.contains('disabled');
      const card9x16Disabled = card9x16.classList.contains('disabled');

      return {
        statusText,
        statusHidden,
        progressHidden,
        renderDisabled,
        playPreviewDisabled,
        card16x9Disabled,
        card9x16Disabled
      };
    });

    expect(result.statusText).toBe('Error: Audio analysis failed due to corrupted samples');
    expect(result.statusHidden).toBe(false);
    expect(result.progressHidden).toBe(true);
    expect(result.renderDisabled).toBe(false);
    expect(result.playPreviewDisabled).toBe(false);
    expect(result.card16x9Disabled).toBe(false);
    expect(result.card9x16Disabled).toBe(false);
  });

  test('catches Error objects in renderFormat and resets UI state gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const mockBuffer = {
        duration: 5.0,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 220500,
        getChannelData: () => new Float32Array(220500)
      };
      window.workingAudioBuffer = mockBuffer;
      decodedAudioBuffer = mockBuffer;

      const renderBtn = document.getElementById('renderBtn');
      const playPreviewBtn = document.getElementById('playPreviewBtn');
      const card16x9 = document.getElementById('card16x9');
      const card9x16 = document.getElementById('card9x16');
      const progressContainer = document.getElementById('progressContainer');
      const statusLine = document.getElementById('statusLine');

      card16x9.click();

      // Mock renderFormat to reject with error
      renderFormat = async () => {
        throw new Error('VideoEncoder configuration failed');
      };

      renderBtn.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        statusText: statusLine.textContent,
        statusHidden: statusLine.classList.contains('hidden'),
        progressHidden: progressContainer.classList.contains('hidden'),
        renderDisabled: renderBtn.disabled,
        playPreviewDisabled: playPreviewBtn.disabled,
        card16x9Disabled: card16x9.classList.contains('disabled'),
        card9x16Disabled: card9x16.classList.contains('disabled')
      };
    });

    expect(result.statusText).toBe('Error: VideoEncoder configuration failed');
    expect(result.statusHidden).toBe(false);
    expect(result.progressHidden).toBe(true);
    expect(result.renderDisabled).toBe(false);
    expect(result.playPreviewDisabled).toBe(false);
    expect(result.card16x9Disabled).toBe(false);
    expect(result.card9x16Disabled).toBe(false);
  });

  test('catches non-Error string exceptions and displays error string', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const mockBuffer = {
        duration: 5.0,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 220500,
        getChannelData: () => new Float32Array(220500)
      };
      window.workingAudioBuffer = mockBuffer;
      decodedAudioBuffer = mockBuffer;

      const renderBtn = document.getElementById('renderBtn');
      const playPreviewBtn = document.getElementById('playPreviewBtn');
      const card16x9 = document.getElementById('card16x9');
      const card9x16 = document.getElementById('card9x16');
      const progressContainer = document.getElementById('progressContainer');
      const statusLine = document.getElementById('statusLine');

      card16x9.click();

      // Mock analyzeAudio to throw string exception
      analyzeAudio = () => {
        throw 'Uncaught string exception in audio pipeline';
      };

      renderBtn.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        statusText: statusLine.textContent,
        statusHidden: statusLine.classList.contains('hidden'),
        progressHidden: progressContainer.classList.contains('hidden'),
        renderDisabled: renderBtn.disabled,
        playPreviewDisabled: playPreviewBtn.disabled,
        card16x9Disabled: card16x9.classList.contains('disabled'),
        card9x16Disabled: card9x16.classList.contains('disabled')
      };
    });

    expect(result.statusText).toBe('Error: Uncaught string exception in audio pipeline');
    expect(result.statusHidden).toBe(false);
    expect(result.progressHidden).toBe(true);
    expect(result.renderDisabled).toBe(false);
    expect(result.playPreviewDisabled).toBe(false);
    expect(result.card16x9Disabled).toBe(false);
    expect(result.card9x16Disabled).toBe(false);
  });
});
