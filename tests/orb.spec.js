import { test, expect } from '@playwright/test';

test.describe('Phase 4: Orb Style Engine Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/index.html');
  });

  test('Acceptance Check 1: Select Orb card with no audio loaded', async ({ page }) => {
    const orbCard = page.locator('.style-card[data-style="orb"]');
    const linesCard = page.locator('.style-card[data-style="lines"]');
    const flowerCard = page.locator('.style-card[data-style="flower"]');

    const linesPreview = page.locator('.canvas-container');
    const flowerPreview = page.locator('#flower-preview-container');
    const orbPreview = page.locator('#orb-preview');

    const renderLinesBtn = page.locator('#renderBtn');
    const renderFlowerBtn = page.locator('#renderFlowerBtn');
    const renderOrbBtn = page.locator('#renderOrbBtn');
    const flowerOptions = page.locator('#flower-options');

    // Orb card should be enabled
    await expect(orbCard).not.toHaveAttribute('aria-disabled', 'true');
    await expect(orbCard).toHaveAttribute('aria-pressed', 'false');

    // Click Orb card
    await orbCard.click();

    // Orb card selected
    await expect(orbCard).toHaveAttribute('aria-pressed', 'true');
    await expect(linesCard).toHaveAttribute('aria-pressed', 'false');
    await expect(flowerCard).toHaveAttribute('aria-pressed', 'false');

    // Previews active / inactive state
    await expect(linesPreview).toHaveClass(/is-inactive/);
    await expect(flowerPreview).toHaveClass(/is-inactive/);
    await expect(orbPreview).not.toHaveClass(/is-inactive/);

    // Render buttons
    await expect(renderLinesBtn).toBeHidden();
    await expect(renderFlowerBtn).toBeHidden();
    await expect(renderOrbBtn).toBeVisible();

    // Flower options hidden
    await expect(flowerOptions).toBeHidden();
  });

  test('Acceptance Check 3: Determinism of drawOrbFrame', async ({ page }) => {
    const isIdentical = await page.evaluate(() => {
      const canvas1 = document.createElement('canvas');
      canvas1.width = 300; canvas1.height = 300;
      const cx1 = canvas1.getContext('2d');

      const canvas2 = document.createElement('canvas');
      canvas2.width = 300; canvas2.height = 300;
      const cx2 = canvas2.getContext('2d');

      const t = 5.0;
      const f = { level: 0.6, bass: 0.8, mid: 0.4, treble: 0.3 };
      const onsets = [1.2, 3.4, 4.8];

      window.drawOrbFrame(cx1, 300, t, f, onsets);
      window.drawOrbFrame(cx2, 300, t, f, onsets);

      const imgData1 = cx1.getImageData(0, 0, 300, 300).data;
      const imgData2 = cx2.getImageData(0, 0, 300, 300).data;

      if (imgData1.length !== imgData2.length) return false;
      for (let i = 0; i < imgData1.length; i++) {
        if (imgData1[i] !== imgData2[i]) return false;
      }
      return true;
    });

    expect(isIdentical).toBe(true);
  });

  test('Acceptance Check 7: Switching between styles maintains audio and state', async ({ page }) => {
    const linesCard = page.locator('.style-card[data-style="lines"]');
    const flowerCard = page.locator('.style-card[data-style="flower"]');
    const orbCard = page.locator('.style-card[data-style="orb"]');

    // Switch to Flower
    await flowerCard.click();
    await expect(flowerCard).toHaveAttribute('aria-pressed', 'true');

    // Select second flower in grid
    const secondFlower = page.locator('.flower-preview-card').nth(1);
    await secondFlower.click();
    await expect(secondFlower).toHaveClass(/selected/);

    // Switch to Orb
    await orbCard.click();
    await expect(orbCard).toHaveAttribute('aria-pressed', 'true');

    // Switch back to Flower
    await flowerCard.click();
    await expect(flowerCard).toHaveAttribute('aria-pressed', 'true');
    await expect(secondFlower).toHaveClass(/selected/);
  });

  test('Acceptance Check 9: Keyboard navigation and toggles', async ({ page }) => {
    const orbCard = page.locator('.style-card[data-style="orb"]');

    await orbCard.focus();
    await page.keyboard.press('Space');
    await expect(orbCard).toHaveAttribute('aria-pressed', 'true');

    const linesCard = page.locator('.style-card[data-style="lines"]');
    await linesCard.focus();
    await page.keyboard.press('Enter');
    await expect(linesCard).toHaveAttribute('aria-pressed', 'true');
    await expect(orbCard).toHaveAttribute('aria-pressed', 'false');
  });

  test('Audio analysis unit check', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const sampleRate = 44100;
      const duration = 2; // 2 seconds
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);

      // Create synthetic audio with bass pulses
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        data[i] = Math.sin(2 * Math.PI * 60 * t) * (t > 0.5 && t < 0.8 ? 0.9 : 0.1);
      }

      const analysis = await window.analyzeOrbAudio(buffer);
      const fMid = analysis.features(0.65);
      return {
        totalFrames: analysis.totalFrames,
        hasFeatures: typeof analysis.features === 'function',
        bassValue: fMid.bass,
        onsetsCount: analysis.onsets.length
      };
    });

    expect(result.totalFrames).toBe(120);
    expect(result.hasFeatures).toBe(true);
    expect(result.bassValue).toBeGreaterThan(0);
  });
});
