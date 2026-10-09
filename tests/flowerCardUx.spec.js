const { test, expect } = require('@playwright/test');

test.describe('Flower Card Arrow Key Navigation & Dynamic ARIA Labels tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const flowerStyleBtn = page.locator('.style-card[data-style="flower"]');
    if (await flowerStyleBtn.count() > 0) {
      await flowerStyleBtn.click();
    }
  });

  test('initial flower cards have aria-label and aria-pressed attributes correctly set', async ({ page }) => {
    const cards = page.locator('.flower-preview-card');
    await expect(cards).toHaveCount(5);

    // Card 0 (Rose) initially selected
    await expect(cards.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(cards.nth(0)).toHaveAttribute('aria-label', 'Rose flower pattern, selected');
    await expect(cards.nth(0)).toHaveClass(/selected/);

    // Card 1 (Hibiscus) initially unselected
    await expect(cards.nth(1)).toHaveAttribute('aria-pressed', 'false');
    await expect(cards.nth(1)).toHaveAttribute('aria-label', 'Select Hibiscus flower pattern');
    await expect(cards.nth(1)).not.toHaveClass(/selected/);
  });

  test('arrow key navigation moves focus and updates selected flower card and aria-label', async ({ page }) => {
    const cards = page.locator('.flower-preview-card');

    // Focus first card
    await cards.nth(0).focus();
    await expect(cards.nth(0)).toBeFocused();

    // Press ArrowRight -> moves focus & selection to Card 1 (Hibiscus)
    await page.keyboard.press('ArrowRight');
    await expect(cards.nth(1)).toBeFocused();
    await expect(cards.nth(1)).toHaveClass(/selected/);
    await expect(cards.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(cards.nth(1)).toHaveAttribute('aria-label', 'Hibiscus flower pattern, selected');

    // Previous Card 0 (Rose) is now unselected
    await expect(cards.nth(0)).not.toHaveClass(/selected/);
    await expect(cards.nth(0)).toHaveAttribute('aria-pressed', 'false');
    await expect(cards.nth(0)).toHaveAttribute('aria-label', 'Select Rose flower pattern');

    // Press ArrowDown -> moves focus & selection from Card 1 (index 1) to Card 4 (index 1+3 = 4, White Daisy)
    await page.keyboard.press('ArrowDown');
    await expect(cards.nth(4)).toBeFocused();
    await expect(cards.nth(4)).toHaveClass(/selected/);
    await expect(cards.nth(4)).toHaveAttribute('aria-label', 'White Daisy flower pattern, selected');

    // Press Home -> moves focus & selection to Card 0 (Rose)
    await page.keyboard.press('Home');
    await expect(cards.nth(0)).toBeFocused();
    await expect(cards.nth(0)).toHaveClass(/selected/);

    // Press End -> moves focus & selection to Card 4 (White Daisy)
    await page.keyboard.press('End');
    await expect(cards.nth(4)).toBeFocused();
    await expect(cards.nth(4)).toHaveClass(/selected/);
  });

  test('flower cards have hover border styles in CSS', async ({ page }) => {
    const card1 = page.locator('.flower-preview-card').nth(1);
    await card1.hover();

    await page.waitForTimeout(200);

    const hoverBorderColor = await card1.evaluate((el) => {
      return window.getComputedStyle(el).borderColor;
    });

    // #7a7a76 in rgb is rgb(122, 122, 118)
    expect(hoverBorderColor).toBe('rgb(122, 122, 118)');
  });
});
