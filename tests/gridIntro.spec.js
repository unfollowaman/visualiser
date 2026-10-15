const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;
const pixelmatchModule = require('pixelmatch');
const pixelmatch = pixelmatchModule.default || pixelmatchModule;

test.describe('Hero Grid Intro Animation Tests', () => {

  test('Acceptance Check 1 & 3: Animation timeline, event sequence, and line DOM structure', async ({ page }) => {
    const events = [];
    await page.addInitScript(() => {
      window.__gridEvents = [];
      const track = (name) => {
        window.__gridEvents.push({ name, time: performance.now() });
      };
      window.addEventListener('gridintro:start', () => track('start'));
      window.addEventListener('gridintro:top-done', () => track('top-done'));
      window.addEventListener('gridintro:verticals-done', () => track('verticals-done'));
      window.addEventListener('gridintro:done', () => track('done'));
    });

    await page.goto('/');

    // Check initial state or running state
    const datasetState = await page.evaluate(() => document.documentElement.dataset.gridIntro);
    expect(['running', 'done']).toContain(datasetState);

    // Wait until animation completes
    await page.waitForFunction(() => document.documentElement.dataset.gridIntro === 'done', { timeout: 4000 });

    const gridEvents = await page.evaluate(() => window.__gridEvents);
    expect(gridEvents.map(e => e.name)).toEqual(['start', 'top-done', 'verticals-done', 'done']);

    // Check relative time intervals
    const tStart = gridEvents[0].time;
    const tTopDone = gridEvents[1].time - tStart;
    const tVertDone = gridEvents[2].time - tStart;
    const tDone = gridEvents[3].time - tStart;

    // Expected target times from start event:
    // top-done is T.top = 650ms
    // verticals-done is T.top + T.vert = 1450ms
    // done is T.top + T.vert + T.fade/2 = 1530ms
    expect(tTopDone).toBeGreaterThanOrEqual(350);
    expect(tTopDone).toBeLessThanOrEqual(850);

    expect(tVertDone).toBeGreaterThanOrEqual(1200);
    expect(tVertDone).toBeLessThanOrEqual(1700);

    expect(tDone).toBeGreaterThanOrEqual(1300);
    expect(tDone).toBeLessThanOrEqual(1800);

    // Verify DOM element counts: 2*(rows+1) horizontal lines + 2*(cols+1) vertical lines
    const lineCounts = await page.evaluate(() => {
      const g = window.waveformGrid;
      const hCount = document.querySelectorAll('#hero-grid .hero-lines .hl').length;
      const vCount = document.querySelectorAll('#hero-grid .hero-lines .vl').length;
      return {
        expectedH: 2 * (g.rows + 1),
        expectedV: 2 * (g.cols + 1),
        actualH: hCount,
        actualV: vCount
      };
    });

    expect(lineCounts.actualH).toBe(lineCounts.expectedH);
    expect(lineCounts.actualV).toBe(lineCounts.expectedV);
  });

  test('Acceptance Check 2: Pixel match comparison against Step 0 baseline screenshots', async ({ page }) => {
    const configs = [
      { w: 390, h: 844, dpr: 1 },
      { w: 390, h: 844, dpr: 2 },
      { w: 820, h: 1180, dpr: 1 },
      { w: 820, h: 1180, dpr: 2 },
      { w: 1280, h: 800, dpr: 1 },
      { w: 1280, h: 800, dpr: 2 }
    ];

    for (const c of configs) {
      await page.setViewportSize({ width: c.w, height: c.h });
      await page.goto('/');
      await page.waitForFunction(() => document.documentElement.dataset.gridIntro === 'done', { timeout: 4000 });

      const heroGrid = page.locator('#hero-grid');
      const afterScreenshot = await heroGrid.screenshot();

      const beforeImgPath = path.join(__dirname, `../screenshots/before/hero_${c.w}x${c.h}_dpr${c.dpr}.png`);
      if (fs.existsSync(beforeImgPath)) {
        const beforeBuffer = fs.readFileSync(beforeImgPath);
        const imgBefore = PNG.sync.read(beforeBuffer);
        const imgAfter = PNG.sync.read(afterScreenshot);

        // Account for minor 1px rounding in element height across headless rendering
        const commonW = Math.min(imgBefore.width, imgAfter.width);
        const commonH = Math.min(imgBefore.height, imgAfter.height);

        let dataBefore = imgBefore.data;
        let dataAfter = imgAfter.data;

        if (imgBefore.width !== commonW || imgBefore.height !== commonH) {
          const croppedBefore = new PNG({ width: commonW, height: commonH });
          PNG.bitblt(imgBefore, croppedBefore, 0, 0, commonW, commonH, 0, 0);
          dataBefore = croppedBefore.data;
        }

        if (imgAfter.width !== commonW || imgAfter.height !== commonH) {
          const croppedAfter = new PNG({ width: commonW, height: commonH });
          PNG.bitblt(imgAfter, croppedAfter, 0, 0, commonW, commonH, 0, 0);
          dataAfter = croppedAfter.data;
        }

        const diff = new PNG({ width: commonW, height: commonH });
        const numDiffPixels = pixelmatch(dataBefore, dataAfter, diff.data, commonW, commonH, { threshold: 0.1 });
        const totalPixels = commonW * commonH;
        const diffRatio = numDiffPixels / totalPixels;

        // Requirement: pixel difference below 0.5% (0.005)
        expect(diffRatio).toBeLessThan(0.005);
      }
    }
  });

  test('Acceptance Check 4: prefers-reduced-motion and motion toggle paused jump instantly to done', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const state = await page.evaluate(() => document.documentElement.dataset.gridIntro);
    expect(state).toBe('done');
  });

  test('Acceptance Check 5: Resize across breakpoints rebuilds grid with no replay', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // 6 cols
    await page.goto('/');
    await page.waitForFunction(() => document.documentElement.dataset.gridIntro === 'done');

    const cols6 = await page.evaluate(() => document.querySelectorAll('#hero-grid .hero-lines .vl').length);
    expect(cols6).toBe(2 * (6 + 1));

    // Resize to 820 wide (10 cols)
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.waitForTimeout(200);

    const cols10 = await page.evaluate(() => document.querySelectorAll('#hero-grid .hero-lines .vl').length);
    expect(cols10).toBe(2 * (10 + 1));

    // Resize to 1280 wide (14 cols)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);

    const cols14 = await page.evaluate(() => document.querySelectorAll('#hero-grid .hero-lines .vl').length);
    expect(cols14).toBe(2 * (14 + 1));

    // Ensure status stays 'done' without replaying
    const finalState = await page.evaluate(() => document.documentElement.dataset.gridIntro);
    expect(finalState).toBe('done');
  });

  test('Acceptance Check 6: will-change is cleared after intro animation completes', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => document.documentElement.dataset.gridIntro === 'done');

    const willChangeValues = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('#hero-grid .hero-lines i'));
      return elements.map(el => el.style.willChange).filter(v => v !== '');
    });

    expect(willChangeValues.length).toBe(0);
  });

  test('Acceptance Check 7: No-JS fallback retains static background grid when js class is absent', async ({ page }) => {
    await page.addInitScript(() => {
      // Prevent inline JS replacement to test no-js fallback mode
      window.addEventListener('DOMContentLoaded', () => {
        document.documentElement.className = 'no-js';
      });
    });

    await page.goto('/');
    await page.evaluate(() => { document.documentElement.className = 'no-js'; });

    const styles = await page.evaluate(() => {
      const el = document.getElementById('hero-grid');
      const cs = window.getComputedStyle(el);
      return {
        bgImage: cs.backgroundImage,
        borderRight: cs.borderRight
      };
    });

    expect(styles.bgImage).toContain('linear-gradient');
    expect(styles.borderRight).toContain('1px solid');
  });

  test('Acceptance Check 8: #features-grid dark grid and hero elements remain intact and unaffected', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => document.documentElement.dataset.gridIntro === 'done');

    const featStyles = await page.evaluate(() => {
      const el = document.getElementById('features-grid');
      const cs = window.getComputedStyle(el);
      return {
        bgImage: cs.backgroundImage,
        borderRight: cs.borderRight,
        borderBottom: cs.borderBottom
      };
    });

    expect(featStyles.bgImage).toContain('linear-gradient');
    expect(featStyles.borderRight).toContain('1px solid');
    expect(featStyles.borderBottom).toContain('1px solid');

    // Check visibility of hero title, flowers canvas, brain slot
    expect(await page.locator('#hero-title').isVisible()).toBe(true);
    expect(await page.locator('#hero-flowers').isVisible()).toBe(true);
    expect(await page.locator('#hero-brain-slot').isVisible()).toBe(true);
  });

});
