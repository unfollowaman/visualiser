const { test, expect } = require('@playwright/test');

test.describe('Aspect Ratio Section & Download UX enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('aspect ratio section contains eyebrow header and descriptive tooltips', async ({ page }) => {
    const eyebrow = page.locator('#aspectRatioSection .eyebrow');
    await expect(eyebrow).toBeVisible({ visible: false }); // hidden by default until decoded, but in DOM
    await expect(eyebrow).toHaveText('ASPECT RATIO');

    const card16x9 = page.locator('#card16x9');
    const card9x16 = page.locator('#card9x16');

    await expect(card16x9).toHaveAttribute('title', '16:9 Landscape format (1280x720)');
    await expect(card9x16).toHaveAttribute('title', '9:16 Vertical format (720x1280)');
  });

  test('render flower button has initial tooltip', async ({ page }) => {
    const renderFlowerBtn = page.locator('#renderFlowerBtn');
    await expect(renderFlowerBtn).toHaveAttribute('title', 'Load an audio file and choose aspect ratio to render flower video');
  });

  test('clicking download links updates status line feedback', async ({ page }) => {
    // Reveal download containers and test click handlers
    await page.evaluate(() => {
      document.getElementById('downloadContainer').classList.remove('hidden');
      document.getElementById('flowerDownloadContainer').classList.remove('hidden');
    });

    const downloadVideo = page.locator('#downloadVideo');
    const statusLine = page.locator('#statusLine');

    await downloadVideo.click();
    await expect(statusLine).toBeVisible();
    await expect(statusLine).toHaveText('Download started!');

    const flowerDownloadVideo = page.locator('#flowerDownloadVideo');
    const flowerStatusLine = page.locator('#flowerStatusLine');

    await flowerDownloadVideo.click();
    await expect(flowerStatusLine).toBeVisible();
    await expect(flowerStatusLine).toHaveText('Download started!');
  });
});
