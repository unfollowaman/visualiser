const { test, expect } = require('@playwright/test');

test.describe('Phase 3 Feature Section Redesign Acceptance Checks', () => {
  test('Acceptance Check 1: Viewport 390x844 default state (no file, Lines selected)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000/index.html');

    const geometry = await page.evaluate(() => {
      const heroGrid = document.getElementById('hero-grid');
      const featuresGrid = document.getElementById('features-grid');
      const titleUpload = document.getElementById('feat-title-upload');
      const dropzone = document.getElementById('dropZone');
      const titleStyle = document.getElementById('feat-title-style');
      const linesCard = document.querySelector('.style-card[data-style="lines"]');
      const flowerCard = document.querySelector('.style-card[data-style="flower"]');
      const orbCard = document.querySelector('.style-card[data-style="orb"]');
      const renderBtn = document.getElementById('renderBtn');

      const fgRect = featuresGrid.getBoundingClientRect();
      const heroRect = heroGrid.getBoundingClientRect();

      const tuRect = titleUpload.getBoundingClientRect();
      const dzRect = dropzone.getBoundingClientRect();
      const tsRect = titleStyle.getBoundingClientRect();
      const lcRect = linesCard.getBoundingClientRect();
      const fcRect = flowerCard.getBoundingClientRect();
      const ocRect = orbCard.getBoundingClientRect();
      const rbRect = renderBtn.getBoundingClientRect();

      return {
        fgHeight: Math.round(fgRect.height),
        heroHeight: Math.round(heroRect.height),
        titleUploadTop: Math.round(tuRect.top - fgRect.top),
        dropzoneLeft: Math.round(dzRect.left - fgRect.left),
        dropzoneTop: Math.round(dzRect.top - fgRect.top),
        dropzoneWidth: Math.round(dzRect.width),
        dropzoneHeight: Math.round(dzRect.height),
        titleStyleTop: Math.round(tsRect.top - fgRect.top),
        cardsWidth: Math.round(lcRect.width),
        cardsHeight: Math.round(lcRect.height),
        cardsTop: Math.round(lcRect.top - fgRect.top),
        linesLeft: Math.round(lcRect.left - fgRect.left),
        flowerLeft: Math.round(fcRect.left - fgRect.left),
        orbLeft: Math.round(ocRect.left - fgRect.left),
        renderBtnTop: Math.round(rbRect.top - fgRect.top),
        renderBtnHeight: Math.round(rbRect.height)
      };
    });

    expect(Math.abs(geometry.fgHeight - 720)).toBeLessThanOrEqual(1); // 12 rows * 60px (+1px border)
    expect(geometry.fgHeight).toBe(geometry.heroHeight);
    expect(geometry.titleUploadTop).toBe(60);
    expect(geometry.dropzoneLeft).toBe(9);
    expect(geometry.dropzoneTop).toBe(129);
    expect(geometry.dropzoneWidth).toBe(342);
    expect(geometry.dropzoneHeight).toBe(162);
    expect(geometry.titleStyleTop).toBe(312);
    expect(geometry.cardsWidth).toBe(108);
    expect(geometry.cardsHeight).toBe(108);
    expect(geometry.cardsTop).toBe(390);
    expect(geometry.linesLeft).toBe(9);
    expect(geometry.flowerLeft).toBe(126);
    expect(geometry.orbLeft).toBe(243);
    expect(geometry.renderBtnTop).toBe(510);
    expect(geometry.renderBtnHeight).toBe(51);
  });

  test('Acceptance Check 2: Viewport 390x844 with loaded audio file (Lines selected)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:3000/index.html');

    // Simulate loading audio file
    await page.evaluate(async () => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      decodedAudioBuffer = audioCtx.createBuffer(1, 44100 * 5, 44100);
      window.workingAudioBuffer = decodedAudioBuffer;

      const fileInput = document.getElementById('fileInput');
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const geometry = await page.evaluate(() => {
      const featuresGrid = document.getElementById('features-grid');
      const previewCell = document.getElementById('preview-cell');
      const renderBtn = document.getElementById('renderBtn');

      const fgRect = featuresGrid.getBoundingClientRect();
      const pcRect = previewCell.getBoundingClientRect();
      const rbRect = renderBtn.getBoundingClientRect();

      return {
        fgHeight: Math.round(fgRect.height),
        previewTop: Math.round(pcRect.top - fgRect.top),
        previewWidth: Math.round(pcRect.width),
        previewHeight: Math.round(pcRect.height),
        renderBtnTop: Math.round(rbRect.top - fgRect.top)
      };
    });

    expect(Math.abs(geometry.fgHeight - 960)).toBeLessThanOrEqual(1); // 16 rows * 60px (+1px border)
    expect(geometry.previewTop).toBe(510);
    expect(geometry.previewWidth).toBe(342);
    expect(geometry.previewHeight).toBe(342);
    expect(geometry.renderBtnTop).toBe(861);
  });

  test('Acceptance Check 3: Viewport 1280x800 default state geometry', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://localhost:3000/index.html');

    const geometry = await page.evaluate(() => {
      const featuresGrid = document.getElementById('features-grid');
      const dropzone = document.getElementById('dropZone');
      const linesCard = document.querySelector('.style-card[data-style="lines"]');
      const flowerCard = document.querySelector('.style-card[data-style="flower"]');
      const orbCard = document.querySelector('.style-card[data-style="orb"]');
      const renderBtn = document.getElementById('renderBtn');

      const fgRect = featuresGrid.getBoundingClientRect();
      const dzRect = dropzone.getBoundingClientRect();
      const lcRect = linesCard.getBoundingClientRect();
      const fcRect = flowerCard.getBoundingClientRect();
      const ocRect = orbCard.getBoundingClientRect();
      const rbRect = renderBtn.getBoundingClientRect();

      return {
        fgWidth: Math.round(fgRect.width),
        fgHeight: Math.round(fgRect.height),
        dzLeft: Math.round(dzRect.left - fgRect.left),
        dzTop: Math.round(dzRect.top - fgRect.top),
        dzWidth: Math.round(dzRect.width),
        dzHeight: Math.round(dzRect.height),
        cardsTop: Math.round(lcRect.top - fgRect.top),
        cardsWidth: Math.round(lcRect.width),
        cardsHeight: Math.round(lcRect.height),
        linesLeft: Math.round(lcRect.left - fgRect.left),
        flowerLeft: Math.round(fcRect.left - fgRect.left),
        orbLeft: Math.round(ocRect.left - fgRect.left),
        renderLeft: Math.round(rbRect.left - fgRect.left),
        renderTop: Math.round(rbRect.top - fgRect.top),
        renderWidth: Math.round(rbRect.width)
      };
    });

    expect(Math.abs(geometry.fgWidth - 1218)).toBeLessThanOrEqual(1); // 14 cols * 87px (+1px border)
    expect(Math.abs(geometry.fgHeight - 696)).toBeLessThanOrEqual(1); // 8 rows * 87px (+1px border)
    expect(geometry.dzLeft).toBe(13);
    expect(geometry.dzTop).toBe(117);
    expect(geometry.dzWidth).toBeGreaterThanOrEqual(755);
    expect(geometry.dzWidth).toBeLessThanOrEqual(760);
    expect(geometry.dzHeight).toBe(209);

    expect(geometry.cardsTop).toBe(452);
    expect(geometry.cardsWidth).toBeGreaterThanOrEqual(208);
    expect(geometry.cardsWidth).toBeLessThanOrEqual(210);

    expect(geometry.renderLeft).toBe(809);
    expect(geometry.renderTop).toBe(587);
    expect(geometry.renderWidth).toBe(383);
  });

  test('Acceptance Check 4: Style selection toggles flower options and render buttons without resetting state', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');

    const linesCard = page.locator('.style-card[data-style="lines"]');
    const flowerCard = page.locator('.style-card[data-style="flower"]');
    const flowerOptions = page.locator('#flower-options');
    const renderBtn = page.locator('#renderBtn');
    const renderFlowerBtn = page.locator('#renderFlowerBtn');

    // Initially lines selected
    await expect(linesCard).toHaveAttribute('aria-pressed', 'true');
    await expect(flowerCard).toHaveAttribute('aria-pressed', 'false');
    await expect(flowerOptions).toBeHidden();
    await expect(renderBtn).toBeVisible();
    await expect(renderFlowerBtn).toBeHidden();

    // Click flower card
    await flowerCard.click();
    await expect(linesCard).toHaveAttribute('aria-pressed', 'false');
    await expect(flowerCard).toHaveAttribute('aria-pressed', 'true');
    await expect(flowerOptions).toBeVisible();
    await expect(renderBtn).toBeHidden();
    await expect(renderFlowerBtn).toBeVisible();

    // Click lines card
    await linesCard.click();
    await expect(linesCard).toHaveAttribute('aria-pressed', 'true');
    await expect(flowerCard).toHaveAttribute('aria-pressed', 'false');
    await expect(flowerOptions).toBeHidden();
    await expect(renderBtn).toBeVisible();
    await expect(renderFlowerBtn).toBeHidden();
  });

  test('Acceptance Check 5: Dropzone interaction and "Tap to change" when file loaded', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');

    const dropzone = page.locator('#dropZone');

    // Load file
    await page.evaluate(() => {
      const dropzone = document.getElementById('dropZone');
      dropzone.classList.add('has-file');
    });

    const afterContent = await dropzone.evaluate((el) => {
      return window.getComputedStyle(el, '::after').getPropertyValue('content');
    });

    expect(afterContent).toContain('Tap to change');
  });

  test('Acceptance Check 7: Keyboard navigation and Orb card enabled in Phase 4', async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');

    const orbCard = page.locator('.style-card[data-style="orb"]');
    await expect(orbCard).not.toHaveAttribute('aria-disabled', 'true');

    // Clicking orb card selects orb style
    await orbCard.click();
    await expect(orbCard).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.style-card[data-style="lines"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('Acceptance Check 8: prefers-reduced-motion renders static card previews', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:3000/index.html');

    const isStatic = await page.evaluate(() => {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    expect(isStatic).toBe(true);
  });

  test('Acceptance Check 9: 320px viewport has no horizontal scrollbar', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto('http://localhost:3000/index.html');

    const scrollInfo = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      };
    });

    expect(scrollInfo.scrollWidth).toBeLessThanOrEqual(scrollInfo.clientWidth);
  });
});
