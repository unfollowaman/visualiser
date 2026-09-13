const { test, expect } = require('@playwright/test');

test.describe('handleSelectedFile security and validation tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('rejects non-audio file types with appropriate error message', async ({ page }) => {
    const errorText = await page.evaluate(() => {
      const invalidFile = new File(['hello world'], 'test.txt', { type: 'text/plain' });
      handleSelectedFile(invalidFile);
      const decodeError = document.getElementById('decodeError');
      return {
        isHidden: decodeError.classList.contains('hidden'),
        text: decodeError.textContent
      };
    });

    expect(errorText.isHidden).toBe(false);
    expect(errorText.text).toBe('Please select a valid audio file (MP3, WAV, etc.).');
  });

  test('rejects files larger than 50MB with appropriate error message', async ({ page }) => {
    const errorText = await page.evaluate(() => {
      // Create a mock large file object (>50MB) without allocating actual memory
      const mockLargeFile = {
        name: 'large_audio.mp3',
        type: 'audio/mp3',
        size: 51 * 1024 * 1024
      };
      handleSelectedFile(mockLargeFile);
      const decodeError = document.getElementById('decodeError');
      return {
        isHidden: decodeError.classList.contains('hidden'),
        text: decodeError.textContent
      };
    });

    expect(errorText.isHidden).toBe(false);
    expect(errorText.text).toBe('File size exceeds the 50MB limit.');
  });

  test('accepts valid audio file under 50MB without type error', async ({ page }) => {
    const fileInfo = await page.evaluate(() => {
      const validFile = new File(['fake audio content'], 'sample.mp3', { type: 'audio/mp3' });
      handleSelectedFile(validFile);
      const decodeError = document.getElementById('decodeError');
      const fileNameEl = document.getElementById('fileName');
      return {
        decodeErrorHidden: decodeError.classList.contains('hidden'),
        fileNameText: fileNameEl.textContent
      };
    });

    expect(fileInfo.decodeErrorHidden).toBe(true);
    expect(fileInfo.fileNameText).toBe('sample.mp3');
  });

  test('handles FileReader onerror handler correctly', async ({ page }) => {
    const errorResult = await page.evaluate(() => {
      let loggedArgs = null;
      const originalLogError = window.logError;
      window.logError = (...args) => {
        loggedArgs = args;
        if (typeof originalLogError === 'function') {
          originalLogError(...args);
        }
      };

      const originalReadAsArrayBuffer = FileReader.prototype.readAsArrayBuffer;
      FileReader.prototype.readAsArrayBuffer = function () {
        if (typeof this.onerror === 'function') {
          this.onerror(new Error('Mock FileReader failure'));
        }
      };

      try {
        const validFile = new File(['fake audio content'], 'sample.mp3', { type: 'audio/mp3' });
        handleSelectedFile(validFile);

        const decodeError = document.getElementById('decodeError');
        return {
          decodeErrorHidden: decodeError.classList.contains('hidden'),
          loggedArgs: loggedArgs ? loggedArgs.map(String) : null
        };
      } finally {
        FileReader.prototype.readAsArrayBuffer = originalReadAsArrayBuffer;
        window.logError = originalLogError;
      }
    });

    expect(errorResult.decodeErrorHidden).toBe(false);
    expect(errorResult.loggedArgs).not.toBeNull();
    expect(errorResult.loggedArgs[0]).toBe('FileReader Error: ');
    expect(errorResult.loggedArgs[1]).toContain('Mock FileReader failure');
  });
});
