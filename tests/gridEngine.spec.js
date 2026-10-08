import { test, expect } from '@playwright/test';

test.describe('Grid Engine and Phase 1 Shell Foundation acceptance tests', () => {
  test('Viewport 390x844 produces --s 60px, --cols 6, --rows 12, hero grid 360px x 720px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('index.html');

    const vars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const hero = document.getElementById('hero-grid');
      const computed = getComputedStyle(hero);
      return {
        s: style.getPropertyValue('--s').trim(),
        cols: style.getPropertyValue('--cols').trim(),
        rows: style.getPropertyValue('--rows').trim(),
        clientWidth: hero.clientWidth,
        clientHeight: hero.clientHeight,
        computedWidth: computed.width,
        computedHeight: computed.height
      };
    });

    expect(vars.s).toBe('60px');
    expect(vars.cols).toBe('6');
    expect(vars.rows).toBe('12');
    expect(vars.clientWidth).toBe(360);
    expect(vars.clientHeight).toBe(720);
    expect(vars.computedWidth).toBe('360px');
    expect(vars.computedHeight).toBe('720px');
  });

  test('Viewport 1280x800 produces --cols 14, --s 87px, --rows 8, hero grid 1218px x 696px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('index.html');

    const vars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const hero = document.getElementById('hero-grid');
      const computed = getComputedStyle(hero);
      return {
        s: style.getPropertyValue('--s').trim(),
        cols: style.getPropertyValue('--cols').trim(),
        rows: style.getPropertyValue('--rows').trim(),
        clientWidth: hero.clientWidth,
        clientHeight: hero.clientHeight,
        computedWidth: computed.width,
        computedHeight: computed.height
      };
    });

    expect(vars.cols).toBe('14');
    expect(vars.s).toBe('87px');
    expect(vars.rows).toBe('8');
    expect(vars.clientWidth).toBe(1218);
    expect(vars.clientHeight).toBe(696);
    expect(vars.computedWidth).toBe('1218px');
    expect(vars.computedHeight).toBe('696px');
  });

  test('Viewport 820x1180 produces --cols 10, --s 76px, --rows 14', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto('index.html');

    const vars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        s: style.getPropertyValue('--s').trim(),
        cols: style.getPropertyValue('--cols').trim(),
        rows: style.getPropertyValue('--rows').trim()
      };
    });

    expect(vars.cols).toBe('10');
    expect(vars.s).toBe('76px');
    expect(vars.rows).toBe('14');
  });

  test('Viewport 320px wide produces --s 48px and no horizontal scrollbar', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('index.html');

    const result = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      return {
        s: style.getPropertyValue('--s').trim(),
        hasHorizontalScrollbar: scrollWidth > clientWidth
      };
    });

    expect(result.s).toBe('48px');
    expect(result.hasHorizontalScrollbar).toBe(false);
  });

  test('Resizing updates variables and hero grid & features grid always have identical width and height', async ({ page }) => {
    await page.goto('index.html');

    await page.setViewportSize({ width: 1000, height: 700 });
    await page.waitForTimeout(100);

    const dims1 = await page.evaluate(() => {
      const hero = document.getElementById('hero-grid');
      const features = document.getElementById('features-grid');
      return {
        heroW: hero.clientWidth,
        heroH: hero.clientHeight,
        featW: features.clientWidth,
        featH: features.clientHeight
      };
    });

    expect(dims1.heroW).toBe(dims1.featW);
    expect(dims1.heroH).toBe(dims1.featH);

    await page.setViewportSize({ width: 500, height: 900 });
    await page.waitForTimeout(100);

    const dims2 = await page.evaluate(() => {
      const hero = document.getElementById('hero-grid');
      const features = document.getElementById('features-grid');
      return {
        heroW: hero.clientWidth,
        heroH: hero.clientHeight,
        featW: features.clientWidth,
        featH: features.clientHeight
      };
    });

    expect(dims2.heroW).toBe(dims2.featW);
    expect(dims2.heroH).toBe(dims2.featH);
    expect(dims2.heroW).not.toBe(dims1.heroW);
  });
});
