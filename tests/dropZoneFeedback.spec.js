const { test, expect } = require('@playwright/test');

test.describe('Drop zone drag-and-drop feedback and post-decode focus management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('updates drop zone text on dragover and reverts on dragleave/drop', async ({ page }) => {
    const dragFeedback = await page.evaluate(() => {
      const dropZone = document.getElementById('dropZone');
      const dropZoneText = document.getElementById('dropZoneText');

      const initialText = dropZoneText.textContent;

      dropZone.dispatchEvent(new Event('dragover', { bubbles: true }));
      const dragOverText = dropZoneText.textContent;
      const isDragOverClass = dropZone.classList.contains('drag-over');

      dropZone.dispatchEvent(new Event('dragleave', { bubbles: true }));
      const dragLeaveText = dropZoneText.textContent;

      return {
        initialText,
        dragOverText,
        isDragOverClass,
        dragLeaveText
      };
    });

    expect(dragFeedback.initialText).toBe('DRAG & DROP AUDIO FILE OR CLICK TO BROWSE');
    expect(dragFeedback.dragOverText).toBe('DROP AUDIO FILE HERE');
    expect(dragFeedback.isDragOverClass).toBe(true);
    expect(dragFeedback.dragLeaveText).toBe('DRAG & DROP AUDIO FILE OR CLICK TO BROWSE');
  });

  test('updates drop zone text to replace message and focuses #showEditBtn after successful audio decode', async ({ page }) => {
    const decodeResult = await page.evaluate(async () => {
      const dropZoneText = document.getElementById('dropZoneText');
      const showEditBtn = document.getElementById('showEditBtn');

      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      const origDecode = AudioContext.prototype.decodeAudioData;

      AudioContext.prototype.decodeAudioData = function (buffer, successCallback) {
        const mockBuffer = {
          duration: 60,
          sampleRate: 44100,
          numberOfChannels: 2,
          length: 44100 * 60,
          getChannelData: () => new Float32Array(44100 * 60)
        };
        successCallback(mockBuffer);
      };

      const validFile = new File(['fake audio'], 'test.mp3', { type: 'audio/mp3' });

      const origRead = FileReader.prototype.readAsArrayBuffer;
      FileReader.prototype.readAsArrayBuffer = function () {
        if (typeof this.onload === 'function') {
          this.onload({ target: { result: new ArrayBuffer(8) } });
        }
      };

      try {
        handleSelectedFile(validFile);

        return {
          dropZoneTextContent: dropZoneText.textContent,
          activeElementId: document.activeElement ? document.activeElement.id : null,
          showEditBtnHidden: showEditBtn.classList.contains('hidden')
        };
      } finally {
        AudioContext.prototype.decodeAudioData = origDecode;
        FileReader.prototype.readAsArrayBuffer = origRead;
      }
    });

    expect(decodeResult.dropZoneTextContent).toBe('DRAG & DROP NEW AUDIO FILE OR CLICK TO REPLACE');
    expect(decodeResult.showEditBtnHidden).toBe(false);
    expect(decodeResult.activeElementId).toBe('showEditBtn');
  });
});
