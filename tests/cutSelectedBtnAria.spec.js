const { test, expect } = require('@playwright/test');

test.describe('cutSelectedBtn ARIA label dynamic shortcut updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/index.html');
  });

  test('cutSelectedBtn initializes with default aria-label "Cut selected audio range"', async ({ page }) => {
    const cutBtn = page.locator('#cutSelectedBtn');
    await expect(cutBtn).toHaveAttribute('aria-label', 'Cut selected audio range');
  });

  test('updateSelectionHighlight sets aria-label to include "(Esc to cancel)" when selection is active and resets when cleared', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cutBtn = document.getElementById('cutSelectedBtn');

      // 1. Initial state (no selection)
      selectionStartX = null;
      selectionEndX = null;
      updateSelectionHighlight();

      const initialLabel = cutBtn.getAttribute('aria-label');

      // 2. Active selection region
      selectionStartX = 50;
      selectionEndX = 250;
      updateSelectionHighlight();

      const activeLabel = cutBtn.getAttribute('aria-label');

      // 3. Selection cleared
      selectionStartX = null;
      selectionEndX = null;
      updateSelectionHighlight();

      const clearedLabel = cutBtn.getAttribute('aria-label');

      return { initialLabel, activeLabel, clearedLabel };
    });

    expect(result.initialLabel).toBe('Cut selected audio range');
    expect(result.activeLabel).toBe('Cut selected audio range (Esc to cancel)');
    expect(result.clearedLabel).toBe('Cut selected audio range');
  });

  test('pressing Escape key resets cutSelectedBtn aria-label back to "Cut selected audio range"', async ({ page }) => {
    const result = await page.evaluate(() => {
      const cutBtn = document.getElementById('cutSelectedBtn');
      document.getElementById('editSection').classList.remove('hidden');

      selectionStartX = 100;
      selectionEndX = 300;
      updateSelectionHighlight();

      const activeLabel = cutBtn.getAttribute('aria-label');

      // Trigger Escape key
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      const cancelledLabel = cutBtn.getAttribute('aria-label');

      return { activeLabel, cancelledLabel };
    });

    expect(result.activeLabel).toBe('Cut selected audio range (Esc to cancel)');
    expect(result.cancelledLabel).toBe('Cut selected audio range');
  });
});
