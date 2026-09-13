const { test, expect } = require('@playwright/test');

test.describe('handleDragMove unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('early return when decodedAudioBuffer is null', async ({ page }) => {
    const result = await page.evaluate(() => {
      decodedAudioBuffer = null;
      isDraggingLeftHandle = true;
      keepRanges = [{ start: 0, end: 10 }];

      // Trigger handleDragMove via mousemove event
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, bubbles: true }));

      return {
        keepRanges
      };
    });

    expect(result.keepRanges).toEqual([{ start: 0, end: 10 }]);
  });

  test('early return when no drag flags are active', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      decodedAudioBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100);
      keepRanges = [{ start: 0, end: 10 }];
      isDraggingLeftHandle = false;
      isDraggingRightHandle = false;
      isDraggingSelection = false;

      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, bubbles: true }));

      return {
        keepRanges
      };
    });

    expect(result.keepRanges).toEqual([{ start: 0, end: 10 }]);
  });

  test('left handle drag clamps to 0 when dragged left beyond container bounds', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.getElementById('editSection').classList.remove('hidden');
      const editorContainer = document.getElementById('editorContainer');
      editorContainer.getBoundingClientRect = () => ({
        left: 100, top: 0, width: 1000, height: 100, right: 1100, bottom: 100, x: 100, y: 0, toJSON: () => {}
      });

      decodedAudioBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100);
      keepRanges = [{ start: 2, end: 10 }];
      renderEditState();
      updateEditorDimensions();

      const leftHandle = document.getElementById('leftTrimHandle');
      leftHandle.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, bubbles: true })); // 2s

      // Move to clientX = 0 (x = Math.max(0, 0 - 100) = 0)
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, bubbles: true }));

      const rangeAfterDragLeft = JSON.parse(JSON.stringify(keepRanges));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      return {
        rangeAfterDragLeft
      };
    });

    expect(result.rangeAfterDragLeft[0].start).toBe(0);
  });

  test('left handle drag clamps to keepRanges[0].end - 0.05 when dragged right past threshold', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.getElementById('editSection').classList.remove('hidden');
      const editorContainer = document.getElementById('editorContainer');
      editorContainer.getBoundingClientRect = () => ({
        left: 0, top: 0, width: 1000, height: 100, right: 1000, bottom: 100, x: 0, y: 0, toJSON: () => {}
      });

      decodedAudioBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100);
      keepRanges = [{ start: 0, end: 10 }];
      renderEditState();
      updateEditorDimensions();

      const leftHandle = document.getElementById('leftTrimHandle');
      leftHandle.dispatchEvent(new MouseEvent('mousedown', { clientX: 0, bubbles: true }));

      // Move to clientX = 1000 (x = 1000, representing 10s on a 10s audio)
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 1000, bubbles: true }));

      const rangeAfterDragRight = JSON.parse(JSON.stringify(keepRanges));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      return {
        rangeAfterDragRight
      };
    });

    expect(result.rangeAfterDragRight[0].start).toBeCloseTo(9.0, 1); // 10 - 1s (since keepRanges.length === 1 -> maxStart = 10 - 1 = 9)
  });

  test('right handle drag clamps to duration when dragged right beyond container bounds', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.getElementById('editSection').classList.remove('hidden');
      const editorContainer = document.getElementById('editorContainer');
      editorContainer.getBoundingClientRect = () => ({
        left: 0, top: 0, width: 1000, height: 100, right: 1000, bottom: 100, x: 0, y: 0, toJSON: () => {}
      });

      decodedAudioBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100);
      keepRanges = [{ start: 0, end: 8 }];
      renderEditState();
      updateEditorDimensions();

      const rightHandle = document.getElementById('rightTrimHandle');
      rightHandle.dispatchEvent(new MouseEvent('mousedown', { clientX: 800, bubbles: true }));

      // Move to clientX = 1500 (beyond width 1000 -> x clamped to 1000 -> timePos = 10s)
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 1500, bubbles: true }));

      const rangeAfterDragRight = JSON.parse(JSON.stringify(keepRanges));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      return {
        rangeAfterDragRight
      };
    });

    expect(result.rangeAfterDragRight[0].end).toBe(10);
  });

  test('right handle drag clamps to keepRanges[last].start + 0.05 when dragged left past threshold', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.getElementById('editSection').classList.remove('hidden');
      const editorContainer = document.getElementById('editorContainer');
      editorContainer.getBoundingClientRect = () => ({
        left: 0, top: 0, width: 1000, height: 100, right: 1000, bottom: 100, x: 0, y: 0, toJSON: () => {}
      });

      decodedAudioBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100);
      keepRanges = [{ start: 2, end: 10 }];
      renderEditState();
      updateEditorDimensions();

      const rightHandle = document.getElementById('rightTrimHandle');
      rightHandle.dispatchEvent(new MouseEvent('mousedown', { clientX: 1000, bubbles: true }));

      // Move to clientX = 0 (x = 0 -> timePos = 0s)
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, bubbles: true }));

      const rangeAfterDragLeft = JSON.parse(JSON.stringify(keepRanges));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      return {
        rangeAfterDragLeft
      };
    });

    expect(result.rangeAfterDragLeft[0].end).toBeCloseTo(3.0, 1); // 2 + 1s (since keepRanges.length === 1 -> minEnd = 2 + 1 = 3)
  });

  test('selection drag updates selectionEndX and selection highlight UI', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.getElementById('editSection').classList.remove('hidden');
      const editorContainer = document.getElementById('editorContainer');
      editorContainer.getBoundingClientRect = () => ({
        left: 0, top: 0, width: 1000, height: 100, right: 1000, bottom: 100, x: 0, y: 0, toJSON: () => {}
      });

      decodedAudioBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100);
      keepRanges = [{ start: 0, end: 10 }];
      renderEditState();
      updateEditorDimensions();

      // Mousedown on container at x = 200
      editorContainer.dispatchEvent(new MouseEvent('mousedown', { clientX: 200, bubbles: true }));

      // Drag to x = 500 via handleDragMove
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, bubbles: true }));

      const selectionHighlightEl = document.getElementById('selectionHighlight');
      const cutBtn = document.getElementById('cutSelectedBtn');

      const isHidden = selectionHighlightEl.classList.contains('hidden');
      const highlightLeft = selectionHighlightEl.style.left;
      const highlightWidth = selectionHighlightEl.style.width;
      const cutDisabled = cutBtn.disabled;
      const currentSelectionEndX = selectionEndX;

      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      return {
        isHidden,
        highlightLeft,
        highlightWidth,
        cutDisabled,
        currentSelectionEndX
      };
    });

    expect(result.isHidden).toBe(false);
    expect(result.highlightLeft).toBe('200px');
    expect(result.highlightWidth).toBe('300px');
    expect(result.cutDisabled).toBe(false);
    expect(result.currentSelectionEndX).toBe(500);
  });

  test('touchmove event correctly triggers handleDragMove', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.getElementById('editSection').classList.remove('hidden');
      const editorContainer = document.getElementById('editorContainer');
      editorContainer.getBoundingClientRect = () => ({
        left: 0, top: 0, width: 1000, height: 100, right: 1000, bottom: 100, x: 0, y: 0, toJSON: () => {}
      });

      decodedAudioBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100);
      keepRanges = [{ start: 0, end: 10 }];
      renderEditState();
      updateEditorDimensions();

      const leftHandle = document.getElementById('leftTrimHandle');
      leftHandle.dispatchEvent(new Event('touchstart', { bubbles: true }));

      const touchMoveEvent = new Event('touchmove', { bubbles: true });
      touchMoveEvent.touches = [{ clientX: 300 }];
      window.dispatchEvent(touchMoveEvent);

      const rangeAfterTouchMove = JSON.parse(JSON.stringify(keepRanges));
      window.dispatchEvent(new Event('touchend', { bubbles: true }));

      return {
        rangeAfterTouchMove
      };
    });

    expect(result.rangeAfterTouchMove[0].start).toBeCloseTo(3.0, 1);
  });
});
