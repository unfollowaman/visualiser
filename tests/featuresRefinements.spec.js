const { test, expect } = require('@playwright/test');

test.describe('Feature Section Refinements (Grid Standardisation & Card Backgrounds)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('Grid dark linear gradients and borders use absolute white (#ffffff / rgb(255, 255, 255))', async ({ page }) => {
    const gridDarkStyles = await page.evaluate(() => {
      const fg = document.getElementById('features-grid');
      const cs = window.getComputedStyle(fg);
      return {
        bgImage: cs.backgroundImage,
        borderRightColor: cs.borderRightColor,
        borderBottomColor: cs.borderBottomColor,
        borderRightStyle: cs.borderRightStyle,
        borderBottomStyle: cs.borderBottomStyle
      };
    });

    // Check linear gradients in background-image use rgb(255, 255, 255)
    expect(gridDarkStyles.bgImage).toContain('rgb(255, 255, 255)');
    expect(gridDarkStyles.bgImage).not.toContain('rgb(154, 154, 154)');
    expect(gridDarkStyles.bgImage).not.toContain('rgb(85, 85, 85)');

    // Check borders use white
    expect(gridDarkStyles.borderRightColor).toBe('rgb(255, 255, 255)');
    expect(gridDarkStyles.borderBottomColor).toBe('rgb(255, 255, 255)');
    expect(gridDarkStyles.borderRightStyle).toBe('solid');
    expect(gridDarkStyles.borderBottomStyle).toBe('solid');
  });

  test('Grid dark ::after pseudo-element creates symmetric double lines on right and bottom outer edges', async ({ page }) => {
    const pseudoStyles = await page.evaluate(() => {
      const fg = document.getElementById('features-grid');
      const afterCs = window.getComputedStyle(fg, '::after');
      const rootCs = window.getComputedStyle(document.documentElement);
      const expectedGutter = rootCs.getPropertyValue('--gutter').trim();
      return {
        content: afterCs.content,
        position: afterCs.position,
        right: afterCs.right,
        bottom: afterCs.bottom,
        expectedGutter: expectedGutter,
        borderRightColor: afterCs.borderRightColor,
        borderBottomColor: afterCs.borderBottomColor,
        borderRightStyle: afterCs.borderRightStyle,
        borderBottomStyle: afterCs.borderBottomStyle
      };
    });

    expect(pseudoStyles.position).toBe('absolute');
    expect(pseudoStyles.right).toBe(pseudoStyles.expectedGutter);
    expect(pseudoStyles.bottom).toBe(pseudoStyles.expectedGutter);
    expect(pseudoStyles.borderRightColor).toBe('rgb(255, 255, 255)');
    expect(pseudoStyles.borderBottomColor).toBe('rgb(255, 255, 255)');
    expect(pseudoStyles.borderRightStyle).toBe('solid');
    expect(pseudoStyles.borderBottomStyle).toBe('solid');
  });

  test('Style cards have solid black backgrounds (rgb(0, 0, 0)) and full opacity (1) in selected and unselected states', async ({ page }) => {
    const cardStyles = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.style-card'));
      return cards.map(c => {
        const cs = window.getComputedStyle(c);
        return {
          style: c.getAttribute('data-style'),
          ariaPressed: c.getAttribute('aria-pressed'),
          backgroundColor: cs.backgroundColor,
          opacity: cs.opacity
        };
      });
    });

    expect(cardStyles.length).toBe(3);

    for (const card of cardStyles) {
      expect(card.backgroundColor).toBe('rgb(0, 0, 0)');
      expect(parseFloat(card.opacity)).toBe(1);
    }

    // Toggle selected style card to flower and re-check
    const flowerCard = page.locator('.style-card[data-style="flower"]');
    await flowerCard.click();

    const cardStylesAfterClick = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.style-card'));
      return cards.map(c => {
        const cs = window.getComputedStyle(c);
        return {
          style: c.getAttribute('data-style'),
          ariaPressed: c.getAttribute('aria-pressed'),
          backgroundColor: cs.backgroundColor,
          opacity: cs.opacity
        };
      });
    });

    for (const card of cardStylesAfterClick) {
      expect(card.backgroundColor).toBe('rgb(0, 0, 0)');
      expect(parseFloat(card.opacity)).toBe(1);
    }
  });
});
