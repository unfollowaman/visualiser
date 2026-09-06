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

  test('clicking flower preview card updates selectedFlowerIndex and CSS selection classes', async ({ page }) => {
    const selectionInfo = await page.evaluate(() => {
      const cards = document.querySelectorAll('.flower-preview-card');

      // Click card at index 2 (Blue Cosmos)
      cards[2].click();

      const newIndex = selectedFlowerIndex;
      const card0Selected = cards[0].classList.contains('selected');
      const card2Selected = cards[2].classList.contains('selected');

      return {
        newIndex,
        card0Selected,
        card2Selected
      };
    });

    expect(selectionInfo.newIndex).toBe(2);
    expect(selectionInfo.card0Selected).toBe(false);
    expect(selectionInfo.card2Selected).toBe(true);
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
});
