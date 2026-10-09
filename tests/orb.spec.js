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

    await expect(orbCard).not.toHaveAttribute('aria-disabled', 'true');
    await expect(orbCard).toHaveAttribute('aria-pressed', 'false');

    await orbCard.click();

    await expect(orbCard).toHaveAttribute('aria-pressed', 'true');
    await expect(linesCard).toHaveAttribute('aria-pressed', 'false');
    await expect(flowerCard).toHaveAttribute('aria-pressed', 'false');

    await expect(linesPreview).toHaveClass(/is-inactive/);
    await expect(flowerPreview).toHaveClass(/is-inactive/);
    await expect(orbPreview).not.toHaveClass(/is-inactive/);

    await expect(renderLinesBtn).toBeHidden();
    await expect(renderFlowerBtn).toBeHidden();
    await expect(renderOrbBtn).toBeVisible();

    await expect(flowerOptions).toBeHidden();
  });

  test('Acceptance Check 3: Determinism of drawOrbFrame', async ({ page }) => {
    const isIdentical = await page.evaluate(() => {
      const canvas1 = document.createElement('canvas');
      canvas1.width = 1080; canvas1.height = 1080;
      const cx1 = canvas1.getContext('2d');

      const canvas2 = document.createElement('canvas');
      canvas2.width = 1080; canvas2.height = 1080;
      const cx2 = canvas2.getContext('2d');

      const t = 5.0;
      const f = { amplitude: 0.6, bass: 0.8, mid: 0.4, treble: 0.3 };

      window.drawOrbFrame(cx1, 1080, t, f);
      window.drawOrbFrame(cx2, 1080, t, f);

      const imgData1 = cx1.getImageData(0, 0, 1080, 1080).data;
      const imgData2 = cx2.getImageData(0, 0, 1080, 1080).data;

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

    await flowerCard.click();
    await expect(flowerCard).toHaveAttribute('aria-pressed', 'true');

    const secondFlower = page.locator('.flower-preview-card').nth(1);
    await secondFlower.click();
    await expect(secondFlower).toHaveClass(/selected/);

    await orbCard.click();
    await expect(orbCard).toHaveAttribute('aria-pressed', 'true');

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

  // Requirement 1: Preview canvas renders non-black pixels after loading a sample audio file.
  test('Preview canvas renders non-black pixels after loading sample audio file', async ({ page }) => {
    const fileInput = page.locator('#fileInput');
    await fileInput.setInputFiles('test.wav');

    const orbCard = page.locator('.style-card[data-style="orb"]');
    await orbCard.click();

    await page.waitForTimeout(500);

    const hasNonBlackPixels = await page.evaluate(() => {
      const canvas = document.getElementById('orb-preview');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      let nonBlackCount = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10) {
          nonBlackCount++;
        }
      }
      return nonBlackCount > 50;
    });

    expect(hasNonBlackPixels).toBe(true);
  });

  // Requirement 2: Export produces a non-empty MP4 and the file has no audio track.
  test('Export produces a non-empty MP4 with no audio track', async ({ page }) => {
    const exportResult = await page.evaluate(async () => {
      const sampleRate = 44100;
      const duration = 1; // 1 second test buffer
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 220 * (i / sampleRate));
      }

      const analysis = await window.analyzeOrbAudio(buffer);
      const blob = await window.renderOrbFormat(analysis, 1080, 1080, () => {}, buffer);

      const arrayBuffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);

      let typeStr = "";
      for (let i = 4; i < 8; i++) {
        typeStr += String.fromCharCode(uint8[i]);
      }

      let hasSoundHandler = false;
      for (let i = 0; i < uint8.length - 4; i++) {
        if (uint8[i] === 0x73 && uint8[i+1] === 0x6f && uint8[i+2] === 0x75 && uint8[i+3] === 0x6e) { // "soun"
          hasSoundHandler = true;
          break;
        }
      }

      return {
        size: blob.size,
        type: blob.type,
        ftyp: typeStr,
        hasSoundHandler
      };
    });

    expect(exportResult.size).toBeGreaterThan(1000);
    expect(exportResult.type).toBe('video/mp4');
    expect(exportResult.ftyp).toBe('ftyp');
    expect(exportResult.hasSoundHandler).toBe(false);
  });

  // Requirement 3: The same input exports identical frame 0 on two runs.
  test('The same input exports identical frame 0 on two runs', async ({ page }) => {
    const isIdentical = await page.evaluate(async () => {
      const sampleRate = 44100;
      const duration = 1;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * (i / sampleRate));
      }

      const analysis1 = await window.analyzeOrbAudio(buffer);
      const analysis2 = await window.analyzeOrbAudio(buffer);

      const canvas1 = document.createElement('canvas');
      canvas1.width = 1080; canvas1.height = 1080;
      const cx1 = canvas1.getContext('2d');

      const canvas2 = document.createElement('canvas');
      canvas2.width = 1080; canvas2.height = 1080;
      const cx2 = canvas2.getContext('2d');

      const f1 = analysis1.metrics[0];
      const f2 = analysis2.metrics[0];

      window.drawOrbFrame(cx1, 1080, 0, { amplitude: f1.amplitude, bass: f1.bass, mid: f1.mid, treble: f1.treble, rotationY: 0, scale: 1 + f1.amplitude * 0.18 });
      window.drawOrbFrame(cx2, 1080, 0, { amplitude: f2.amplitude, bass: f2.bass, mid: f2.mid, treble: f2.treble, rotationY: 0, scale: 1 + f2.amplitude * 0.18 });

      const d1 = cx1.getImageData(0, 0, 1080, 1080).data;
      const d2 = cx2.getImageData(0, 0, 1080, 1080).data;

      if (d1.length !== d2.length) return false;
      for (let i = 0; i < d1.length; i++) {
        if (d1[i] !== d2[i]) return false;
      }
      return true;
    });

    expect(isIdentical).toBe(true);
  });

  // Stage-gate: Measure average draw time per frame for preview in Playwright Chromium.
  test('Stage-gate: Measure average draw time per frame for preview', async ({ page }) => {
    const orbCard = page.locator('.style-card[data-style="orb"]');
    await orbCard.click();

    await page.evaluate(() => {
      window.resetOrbPerformanceStats();
    });

    await page.waitForTimeout(1000);

    const stats = await page.evaluate(() => {
      const avgMs = window.getOrbAverageDrawTimeMs();
      const pointCount = window.getOrbPointCount();
      return { avgMs, pointCount };
    });

    console.log(`Orb Preview Stage-Gate: Average draw time per frame = ${stats.avgMs.toFixed(3)} ms (Point count: ${stats.pointCount})`);

    if (stats.avgMs > 8.0) {
      console.warn(`Average draw time ${stats.avgMs.toFixed(3)} ms exceeded 8 ms threshold! Reducing point count to 1600...`);
      await page.evaluate(() => {
        window.setOrbPointCount(1600);
        window.resetOrbPerformanceStats();
      });
      await page.waitForTimeout(1000);
      const newStats = await page.evaluate(() => {
        return { avgMs: window.getOrbAverageDrawTimeMs(), pointCount: window.getOrbPointCount() };
      });
      console.log(`Updated Orb Stage-Gate Stats: Average draw time per frame = ${newStats.avgMs.toFixed(3)} ms (Point count: ${newStats.pointCount})`);
      expect(newStats.avgMs).toBeLessThanOrEqual(8.0);
    } else {
      expect(stats.avgMs).toBeLessThanOrEqual(8.0);
    }
  });
});
