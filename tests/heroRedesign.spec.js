import { test, expect } from '@playwright/test';

test.describe('Phase 2 Hero Content Redesign', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('Acceptance Check 1: Viewport 390x844 layout geometry and grid placement', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForTimeout(200);

    const titlePos = await page.evaluate(() => {
      const el = document.getElementById('hero-title');
      const rect = el.getBoundingClientRect();
      const parentRect = document.getElementById('hero-grid').getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        left: Math.round(rect.left - parentRect.left),
        top: Math.round(rect.top - parentRect.top),
        fontSize: parseFloat(style.fontSize),
        width: rect.width
      };
    });

    expect(titlePos.left).toBe(0);
    expect(titlePos.top).toBe(120);
    expect(titlePos.fontSize).toBeCloseTo(50.4, 1);
    expect(titlePos.width).toBeLessThanOrEqual(360);

    const descPos = await page.evaluate(() => {
      const el = document.getElementById('hero-desc');
      const rect = el.getBoundingClientRect();
      const parentRect = document.getElementById('hero-grid').getBoundingClientRect();
      return {
        top: Math.round(rect.top - parentRect.top),
        width: Math.round(rect.width)
      };
    });

    expect(descPos.top).toBe(540);
    expect(descPos.width).toBe(312);

    const ctaPos = await page.evaluate(() => {
      const el = document.getElementById('hero-cta');
      const rect = el.getBoundingClientRect();
      const parentRect = document.getElementById('hero-grid').getBoundingClientRect();
      return {
        top: Math.round(rect.top - parentRect.top)
      };
    });

    expect(ctaPos.top).toBe(636);

    const brainPos = await page.evaluate(() => {
      const el = document.getElementById('hero-brain-slot');
      const rect = el.getBoundingClientRect();
      const parentRect = document.getElementById('hero-grid').getBoundingClientRect();
      return {
        left: Math.round(rect.left - parentRect.left),
        top: Math.round(rect.top - parentRect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    });

    expect(brainPos.left).toBe(90);
    expect(brainPos.top).toBe(282);
    expect(brainPos.width).toBe(270);
    expect(brainPos.height).toBe(240);

    const layout = await page.evaluate(() => window.waveformHeroLayout);
    expect(layout.flowers).toHaveLength(4);
  });

  test('Acceptance Check 2: Viewport 1280x800 layout geometry', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForTimeout(200);

    const titlePos = await page.evaluate(() => {
      const el = document.getElementById('hero-title');
      const rect = el.getBoundingClientRect();
      const parentRect = document.getElementById('hero-grid').getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        left: Math.round(rect.left - parentRect.left),
        top: Math.round(rect.top - parentRect.top),
        fontSize: parseFloat(style.fontSize)
      };
    });

    expect(titlePos.left).toBe(85);
    expect(titlePos.top).toBe(87);
    expect(titlePos.fontSize).toBeCloseTo(78.3, 1);

    const descPos = await page.evaluate(() => {
      const el = document.getElementById('hero-desc');
      const rect = el.getBoundingClientRect();
      const parentRect = document.getElementById('hero-grid').getBoundingClientRect();
      return {
        top: Math.round(rect.top - parentRect.top),
        width: Math.round(rect.width)
      };
    });

    expect(descPos.top).toBe(461);
    expect(descPos.width).toBe(438);

    const ctaPos = await page.evaluate(() => {
      const el = document.getElementById('hero-cta');
      const rect = el.getBoundingClientRect();
      const parentRect = document.getElementById('hero-grid').getBoundingClientRect();
      return {
        top: Math.round(rect.top - parentRect.top)
      };
    });

    expect(ctaPos.top).toBe(574);
  });

  test('Acceptance Check 3: Viewport 320px wide has no horizontal scrollbar and Articulated fits', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForTimeout(200);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    const titleWidth = await page.evaluate(() => {
      const el = document.getElementById('hero-title');
      return el.getBoundingClientRect().width;
    });

    const gridWidth = await page.evaluate(() => {
      const el = document.getElementById('hero-grid');
      return el.getBoundingClientRect().width;
    });

    expect(titleWidth).toBeLessThanOrEqual(gridWidth);
  });

  test('Acceptance Check 4: Typing loop sequence and fixed height', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));

    const initialHeight = await page.evaluate(() => {
      return document.getElementById('hero-title').getBoundingClientRect().height;
    });

    // Wait for typing phrase 0 to complete
    await page.waitForTimeout(2500);

    const text1 = await page.evaluate(() => {
      const lines = document.querySelectorAll('#hero-typed .line');
      return Array.from(lines).map(l => l.childNodes[0]?.nodeValue || '').join(' ').trim();
    });
    expect(text1).toContain('Voices in My Head');

    const heightDuringPhrase0 = await page.evaluate(() => {
      return document.getElementById('hero-title').getBoundingClientRect().height;
    });
    expect(heightDuringPhrase0).toBe(initialHeight);

    // Wait for delete + phrase 1 typing
    await page.waitForTimeout(3000);

    const heightDuringPhrase1 = await page.evaluate(() => {
      return document.getElementById('hero-title').getBoundingClientRect().height;
    });
    expect(heightDuringPhrase1).toBe(initialHeight);
  });

  test('Acceptance Check 5: Accessibility single H1 and keyboard CTA', async ({ page }) => {
    const h1Count = await page.evaluate(() => document.querySelectorAll('h1').length);
    expect(h1Count).toBe(1);

    const h1Label = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return {
        id: h1.id,
        ariaLabel: h1.getAttribute('aria-label')
      };
    });

    expect(h1Label.id).toBe('hero-title');
    expect(h1Label.ariaLabel).toBe('Voices in my head. Needs to be articulated.');

    const legacyHeading = await page.evaluate(() => {
      const title = document.querySelector('#legacy-tool .title');
      return {
        tag: title.tagName.toLowerCase(),
        role: title.getAttribute('role'),
        ariaLevel: title.getAttribute('aria-level')
      };
    });

    expect(legacyHeading.tag).toBe('div');
    expect(legacyHeading.role).toBe('heading');
    expect(legacyHeading.ariaLevel).toBe('2');

    // Test CTA button focus
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement.tagName.toLowerCase());
    const focusedHref = await page.evaluate(() => document.activeElement.getAttribute('href'));
    expect(focusedHref === '#top' || focusedHref === '#features').toBeTruthy();
  });

  test('Acceptance Check 6: Reduced motion state', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html');
    await page.waitForTimeout(300);

    const hasCaret = await page.evaluate(() => {
      return !!document.querySelector('.type-caret');
    });
    expect(hasCaret).toBeFalsy();

    const staticText = await page.evaluate(() => {
      const lines = document.querySelectorAll('#hero-typed .line');
      return Array.from(lines).map(l => l.textContent).join(' ');
    });
    expect(staticText).toBe('Voices in My Head');
  });
});
