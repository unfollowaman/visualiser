const { test, expect } = require('@playwright/test');

test.describe('trimHandleHistory unit and integration tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('clicking or touching trim handle without dragging does not add history or enable undo button', async ({ page }) => {
    const historyInfo = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.getElementById('editSection').classList.remove('hidden');
      const editorContainer = document.getElementById('editorContainer');
      editorContainer.getBoundingClientRect = () => ({
        left: 0, top: 0, width: 1000, height: 100, right: 1000, bottom: 100, x: 0, y: 0, toJSON: () => {}
      });

      decodedAudioBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100); // 10 seconds
      keepRanges = [{ start: 0, end: 10 }];
      editHistory = [];
      renderEditState();
      updateEditorDimensions();

      // Trigger mousedown and mouseup on leftTrimHandle without moving
      const leftHandle = document.getElementById('leftTrimHandle');
      leftHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      const historyAfterMouseClick = editHistory.length;
      const undoDisabledAfterMouse = document.getElementById('undoBtn').disabled;

      // Trigger touchstart and touchend on rightTrimHandle without moving
      const rightHandle = document.getElementById('rightTrimHandle');
      rightHandle.dispatchEvent(new Event('touchstart', { bubbles: true }));
      window.dispatchEvent(new Event('touchend', { bubbles: true }));

      const historyAfterTouch = editHistory.length;
      const undoDisabledAfterTouch = document.getElementById('undoBtn').disabled;

      return {
        historyAfterMouseClick,
        undoDisabledAfterMouse,
        historyAfterTouch,
        undoDisabledAfterTouch
      };
    });

    expect(historyInfo.historyAfterMouseClick).toBe(0);
    expect(historyInfo.undoDisabledAfterMouse).toBe(true);
    expect(historyInfo.historyAfterTouch).toBe(0);
    expect(historyInfo.undoDisabledAfterTouch).toBe(true);
  });

  test('dragging left trim handle saves history state and enables undo button', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.getElementById('editSection').classList.remove('hidden');
      const editorContainer = document.getElementById('editorContainer');
      editorContainer.getBoundingClientRect = () => ({
        left: 0, top: 0, width: 1000, height: 100, right: 1000, bottom: 100, x: 0, y: 0, toJSON: () => {}
      });

      decodedAudioBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100); // 10s
      keepRanges = [{ start: 0, end: 10 }];
      editHistory = [];
      renderEditState();
      updateEditorDimensions();

      const leftHandle = document.getElementById('leftTrimHandle');

      // Start drag at x = 0
      leftHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 0 }));

      // Move drag to x = 200 (representing 2 seconds out of 10s on 1000px canvas)
      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 200 }));

      const rangeDuringDrag = JSON.parse(JSON.stringify(keepRanges));
      const historyDuringDragLength = editHistory.length;

      // Stop drag
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      const rangeAfterDrag = JSON.parse(JSON.stringify(keepRanges));
      const historyAfterDragLength = editHistory.length;
      const savedHistoryState = JSON.parse(JSON.stringify(editHistory[0]));
      const undoBtnDisabled = document.getElementById('undoBtn').disabled;

      return {
        rangeDuringDrag,
        historyDuringDragLength,
        rangeAfterDrag,
        historyAfterDragLength,
        savedHistoryState,
        undoBtnDisabled
      };
    });

    expect(result.rangeDuringDrag[0].start).toBeGreaterThan(0);
    expect(result.historyDuringDragLength).toBe(0); // History is committed when drag completes
    expect(result.historyAfterDragLength).toBe(1);
    expect(result.savedHistoryState).toEqual([{ start: 0, end: 10 }]);
    expect(result.undoBtnDisabled).toBe(false);
  });

  test('dragging right trim handle saves history state and undoing restores previous range', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      document.getElementById('editSection').classList.remove('hidden');
      const editorContainer = document.getElementById('editorContainer');
      editorContainer.getBoundingClientRect = () => ({
        left: 0, top: 0, width: 1000, height: 100, right: 1000, bottom: 100, x: 0, y: 0, toJSON: () => {}
      });

      decodedAudioBuffer = audioCtx.createBuffer(1, 44100 * 10, 44100); // 10s
      keepRanges = [{ start: 0, end: 10 }];
      editHistory = [];
      renderEditState();
      updateEditorDimensions();

      const rightHandle = document.getElementById('rightTrimHandle');

      // Start drag right handle at x = 1000
      rightHandle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 1000 }));

      // Move handle inwards to x = 800 (~8s)
      window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 800 }));

      // Stop drag
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

      const rangeAfterRightDrag = JSON.parse(JSON.stringify(keepRanges));
      const historyLengthAfterRightDrag = editHistory.length;

      // Click Undo
      document.getElementById('undoBtn').click();

      const rangeAfterUndo = JSON.parse(JSON.stringify(keepRanges));
      const historyLengthAfterUndo = editHistory.length;
      const undoBtnDisabledAfterUndo = document.getElementById('undoBtn').disabled;

      return {
        rangeAfterRightDrag,
        historyLengthAfterRightDrag,
        rangeAfterUndo,
        historyLengthAfterUndo,
        undoBtnDisabledAfterUndo
      };
    });

    expect(result.rangeAfterRightDrag[0].end).toBeLessThan(10);
    expect(result.historyLengthAfterRightDrag).toBe(1);
    expect(result.rangeAfterUndo).toEqual([{ start: 0, end: 10 }]);
    expect(result.historyLengthAfterUndo).toBe(0);
    expect(result.undoBtnDisabledAfterUndo).toBe(true);
  });
});
