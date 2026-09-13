const { test, expect } = require('@playwright/test');

test.describe('flower.js unit and integration tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('FLOWERS array and initFlowerGrid setup flower preview cards', async ({ page }) => {
    const gridInfo = await page.evaluate(() => {
      const cards = document.querySelectorAll('.flower-preview-card');
      const card0Selected = cards[0].classList.contains('selected');
      const card1Selected = cards[1].classList.contains('selected');

      return {
        flowersLength: FLOWERS.length,
        cardsLength: cards.length,
        selectedFlowerIndex,
        card0Selected,
        card1Selected,
        flowerCanvasesCount: flowerCanvases.length,
        flowerRenderersCount: flowerRenderers.length
      };
    });

    expect(gridInfo.flowersLength).toBe(5);
    expect(gridInfo.cardsLength).toBe(5);
    expect(gridInfo.selectedFlowerIndex).toBe(0);
    expect(gridInfo.card0Selected).toBe(true);
    expect(gridInfo.card1Selected).toBe(false);
    expect(gridInfo.flowerCanvasesCount).toBe(5);
    expect(gridInfo.flowerRenderersCount).toBe(5);
  });

  test('clicking flower preview card updates selectedFlowerIndex, ARIA attributes, and CSS selection classes', async ({ page }) => {
    const selectionInfo = await page.evaluate(() => {
      const cards = document.querySelectorAll('.flower-preview-card');

      // Click card at index 2 (Blue Cosmos)
      cards[2].click();

      const newIndex = selectedFlowerIndex;
      const card0Selected = cards[0].classList.contains('selected');
      const card2Selected = cards[2].classList.contains('selected');
      const card0AriaPressed = cards[0].getAttribute('aria-pressed');
      const card2AriaPressed = cards[2].getAttribute('aria-pressed');

      return {
        newIndex,
        card0Selected,
        card2Selected,
        card0AriaPressed,
        card2AriaPressed
      };
    });

    expect(selectionInfo.newIndex).toBe(2);
    expect(selectionInfo.card0Selected).toBe(false);
    expect(selectionInfo.card2Selected).toBe(true);
    expect(selectionInfo.card0AriaPressed).toBe('false');
    expect(selectionInfo.card2AriaPressed).toBe('true');
  });

  test('keyboard interactions (Enter/Space) select flower preview cards and update ARIA attributes', async ({ page }) => {
    const keyInfo = await page.evaluate(() => {
      const cards = document.querySelectorAll('.flower-preview-card');

      // Dispatch Enter key event on card 1 (Hibiscus)
      cards[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      const indexAfterEnter = selectedFlowerIndex;
      const card1SelectedAfterEnter = cards[1].classList.contains('selected');
      const card1AriaPressedEnter = cards[1].getAttribute('aria-pressed');

      // Dispatch Space key event on card 3 (Sunflower)
      cards[3].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      const indexAfterSpace = selectedFlowerIndex;
      const card3SelectedAfterSpace = cards[3].classList.contains('selected');
      const card3AriaPressedSpace = cards[3].getAttribute('aria-pressed');

      return {
        indexAfterEnter,
        card1SelectedAfterEnter,
        card1AriaPressedEnter,
        indexAfterSpace,
        card3SelectedAfterSpace,
        card3AriaPressedSpace
      };
    });

    expect(keyInfo.indexAfterEnter).toBe(1);
    expect(keyInfo.card1SelectedAfterEnter).toBe(true);
    expect(keyInfo.card1AriaPressedEnter).toBe('true');

    expect(keyInfo.indexAfterSpace).toBe(3);
    expect(keyInfo.card3SelectedAfterSpace).toBe(true);
    expect(keyInfo.card3AriaPressedSpace).toBe('true');
  });

  test('createWebGLRenderer creates WebGL context, shaders, and renders frames', async ({ page }) => {
    const rendererResult = await page.evaluate(() => {
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 256;
      testCanvas.height = 256;

      const renderer = createWebGLRenderer(testCanvas);
      if (!renderer) {
        return { success: false, reason: 'Renderer created null' };
      }

      // Render a frame with sample time and audio metrics
      renderer.render(1.5, 0.5, 0.8);

      // Create a small mock 2x2 image canvas to test setTexture
      const imgCanvas = document.createElement('canvas');
      imgCanvas.width = 2;
      imgCanvas.height = 2;
      const ctx = imgCanvas.getContext('2d');
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 2, 2);

      renderer.setTexture(imgCanvas);
      renderer.render(2.0, 0.2, 0.4);

      return {
        success: true,
        hasGl: !!renderer.gl,
        glWidth: renderer.gl.drawingBufferWidth,
        glHeight: renderer.gl.drawingBufferHeight
      };
    });

    expect(rendererResult.success).toBe(true);
    expect(rendererResult.hasGl).toBe(true);
    expect(rendererResult.glWidth).toBe(256);
    expect(rendererResult.glHeight).toBe(256);
  });

  test('createWebGLRenderer returns null when WebGL context is not supported', async ({ page }) => {
    const nullResult = await page.evaluate(() => {
      const dummyCanvas = document.createElement('canvas');
      // Mock getContext to return null (simulating missing WebGL support)
      dummyCanvas.getContext = () => null;

      const renderer = createWebGLRenderer(dummyCanvas);
      return { renderer };
    });

    expect(nullResult.renderer).toBeNull();
  });

  test('stopAllPreviews and startAllPreviews control preview animation loops', async ({ page }) => {
    // Scroll flower grid into view so IntersectionObserver marks cards visible
    await page.locator('#flowerGrid').scrollIntoViewIfNeeded();

    // Wait briefly for IntersectionObserver entries to be processed
    await page.waitForTimeout(100);

    const previewInfo = await page.evaluate(() => {
      // Stop all previews
      stopAllPreviews();

      // Start all previews
      startAllPreviews();

      const activeIdsCount = previewAnimationIds.filter(id => id !== undefined && id !== null).length;

      return {
        totalFlowers: FLOWERS.length,
        activeIdsCount
      };
    });

    expect(previewInfo.activeIdsCount).toBe(previewInfo.totalFlowers);
  });

  test('mutation observer enables renderFlowerBtn when aspectRatioSection becomes visible and workingAudioBuffer exists', async ({ page }) => {
    const observerResult = await page.evaluate(async () => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      window.workingAudioBuffer = audioCtx.createBuffer(1, 44100, 44100);

      const renderBtn = document.getElementById('renderFlowerBtn');
      renderBtn.disabled = true;

      const aspectRatioSection = document.getElementById('aspectRatioSection');
      aspectRatioSection.classList.remove('hidden');

      // Wait a microtask tick for MutationObserver callback
      await new Promise(resolve => setTimeout(resolve, 50));

      return {
        btnDisabled: renderBtn.disabled
      };
    });

    expect(observerResult.btnDisabled).toBe(false);
  });

  test('renderAndExportFlowerVideo returns early if renderFlowerBtn is disabled or workingAudioBuffer is missing', async ({ page }) => {
    const result = await page.evaluate(async () => {
      window.workingAudioBuffer = null;
      const renderBtn = document.getElementById('renderFlowerBtn');
      renderBtn.disabled = true;

      const progressContainer = document.getElementById('flowerProgressContainer');
      const wasHiddenBefore = progressContainer.classList.contains('hidden');

      await renderAndExportFlowerVideo();

      const isHiddenAfter = progressContainer.classList.contains('hidden');

      return {
        wasHiddenBefore,
        isHiddenAfter
      };
    });

    expect(result.wasHiddenBefore).toBe(true);
    expect(result.isHiddenAfter).toBe(true);
  });

  test('catches Error objects in renderAndExportFlowerVideo and resets UI state gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const mockBuffer = {
        duration: 2.0,
        sampleRate: 44100,
        numberOfChannels: 1,
        length: 88200,
        getChannelData: () => new Float32Array(88200)
      };
      window.workingAudioBuffer = mockBuffer;

      const renderFlowerBtn = document.getElementById('renderFlowerBtn');
      const flowerProgressContainer = document.getElementById('flowerProgressContainer');
      const flowerStatusLine = document.getElementById('flowerStatusLine');

      renderFlowerBtn.disabled = false;

      // Mock extractAudioMetrics to throw an Error object
      const originalExtract = extractAudioMetrics;
      extractAudioMetrics = async () => {
        throw new Error('Flower audio metrics extraction failed due to corrupted audio data');
      };

      try {
        await renderAndExportFlowerVideo();
      } finally {
        extractAudioMetrics = originalExtract;
      }

      return {
        statusText: flowerStatusLine.textContent,
        statusHidden: flowerStatusLine.classList.contains('hidden'),
        progressHidden: flowerProgressContainer.classList.contains('hidden'),
        btnDisabled: renderFlowerBtn.disabled
      };
    });

    expect(result.statusText).toBe('Error: Flower audio metrics extraction failed due to corrupted audio data');
    expect(result.statusHidden).toBe(false);
    expect(result.progressHidden).toBe(true);
    expect(result.btnDisabled).toBe(false);
  });

  test('catches non-Error string exceptions in renderAndExportFlowerVideo and resets UI state gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const mockBuffer = {
        duration: 2.0,
        sampleRate: 44100,
        numberOfChannels: 1,
        length: 88200,
        getChannelData: () => new Float32Array(88200)
      };
      window.workingAudioBuffer = mockBuffer;

      const renderFlowerBtn = document.getElementById('renderFlowerBtn');
      const flowerProgressContainer = document.getElementById('flowerProgressContainer');
      const flowerStatusLine = document.getElementById('flowerStatusLine');

      renderFlowerBtn.disabled = false;

      // Mock extractAudioMetrics to throw a non-Error string exception
      const originalExtract = extractAudioMetrics;
      extractAudioMetrics = async () => {
        throw 'Uncaught string exception in flower video pipeline';
      };

      try {
        await renderAndExportFlowerVideo();
      } finally {
        extractAudioMetrics = originalExtract;
      }

      return {
        statusText: flowerStatusLine.textContent,
        statusHidden: flowerStatusLine.classList.contains('hidden'),
        progressHidden: flowerProgressContainer.classList.contains('hidden'),
        btnDisabled: renderFlowerBtn.disabled
      };
    });

    expect(result.statusText).toBe('Error: Uncaught string exception in flower video pipeline');
    expect(result.statusHidden).toBe(false);
    expect(result.progressHidden).toBe(true);
    expect(result.btnDisabled).toBe(false);
  });
});
