const { test, expect } = require('@playwright/test');

test.describe('trimHandleKeyboard unit and integration tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/index.html');
  });

  test('left and right trim handles have tabindex=0 and ARIA attributes initialized on decode', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof audioCtx === 'undefined' || !audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const mockBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100); // 10s buffer

      decodedAudioBuffer = mockBuffer;
      keepRanges = [{ start: 0, end: 10 }];
      renderEditState();

      const left = document.getElementById('leftTrimHandle');
      const right = document.getElementById('rightTrimHandle');

      return {
        leftTabIndex: left.getAttribute('tabindex'),
        rightTabIndex: right.getAttribute('tabindex'),
        leftValuenow: left.getAttribute('aria-valuenow'),
        leftValuemin: left.getAttribute('aria-valuemin'),
        leftValuemax: left.getAttribute('aria-valuemax'),
        leftValuetext: left.getAttribute('aria-valuetext'),
        rightValuenow: right.getAttribute('aria-valuenow'),
        rightValuemin: right.getAttribute('aria-valuemin'),
        rightValuemax: right.getAttribute('aria-valuemax'),
        rightValuetext: right.getAttribute('aria-valuetext')
      };
    });

    expect(result.leftTabIndex).toBe('0');
    expect(result.rightTabIndex).toBe('0');
    expect(result.leftValuenow).toBe('0.0');
    expect(result.leftValuemin).toBe('0');
    expect(result.leftValuemax).toBe('9.9');
    expect(result.leftValuetext).toBe('00:00.0 start time');

    expect(result.rightValuenow).toBe('10.0');
    expect(result.rightValuemin).toBe('0.05');
    expect(result.rightValuemax).toBe('10.0');
    expect(result.rightValuetext).toBe('00:10.0 end time');
  });

  test('left trim handle responds to Arrow keys and updates keepRanges and ARIA attributes', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof audioCtx === 'undefined' || !audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const mockBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100);

      decodedAudioBuffer = mockBuffer;
      keepRanges = [{ start: 0, end: 10 }];
      editHistory = [];
      renderEditState();

      const left = document.getElementById('leftTrimHandle');

      // ArrowRight advances left handle by +0.1s
      left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      const step1Start = keepRanges[0].start;
      const step1HistoryLen = editHistory.length;

      // Shift + ArrowRight advances left handle by +1.0s
      left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }));

      const step2Start = keepRanges[0].start;

      // ArrowLeft moves back by -0.1s
      left.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      const step3Start = keepRanges[0].start;

      return {
        step1Start,
        step1HistoryLen,
        step2Start,
        step3Start,
        ariaValuenow: left.getAttribute('aria-valuenow'),
        ariaValuetext: left.getAttribute('aria-valuetext')
      };
    });

    expect(result.step1Start).toBeCloseTo(0.1, 2);
    expect(result.step1HistoryLen).toBe(1);
    expect(result.step2Start).toBeCloseTo(1.1, 2);
    expect(result.step3Start).toBeCloseTo(1.0, 2);
    expect(result.ariaValuenow).toBe('1.0');
    expect(result.ariaValuetext).toBe('00:01.0 start time');
  });

  test('right trim handle responds to Arrow keys and respects bounds clamping', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof audioCtx === 'undefined' || !audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const mockBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100);

      decodedAudioBuffer = mockBuffer;
      keepRanges = [{ start: 0, end: 10 }];
      editHistory = [];
      renderEditState();

      const right = document.getElementById('rightTrimHandle');

      // ArrowLeft moves end handle back by -0.1s
      right.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      const step1End = keepRanges[0].end;

      // Home key jumps to start + 0.05s
      right.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

      const step2End = keepRanges[0].end;

      // End key jumps back to total duration (10s)
      right.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

      const step3End = keepRanges[0].end;

      return {
        step1End,
        step2End,
        step3End,
        ariaValuenow: right.getAttribute('aria-valuenow'),
        ariaValuetext: right.getAttribute('aria-valuetext')
      };
    });

    expect(result.step1End).toBeCloseTo(9.9, 2);
    expect(result.step2End).toBeCloseTo(0.05, 2);
    expect(result.step3End).toBeCloseTo(10.0, 2);
    expect(result.ariaValuenow).toBe('10.0');
    expect(result.ariaValuetext).toBe('00:10.0 end time');
  });

  test('trim handle readouts are visible when handle receives focus', async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById('editSection').classList.remove('hidden');
      const left = document.getElementById('leftTrimHandle');
      left.style.transition = 'none';
      const readout = left.querySelector('.handle-readout');
      if (readout) readout.style.transition = 'none';
      left.focus();
    });

    const opacity = await page.evaluate(() => {
      const readout = document.querySelector('#leftTrimHandle .handle-readout');
      return window.getComputedStyle(readout).opacity;
    });

    expect(opacity).toBe('1');
  });
});
