const { test, expect } = require('@playwright/test');

test.describe('checkBlobDuration unit and edge case tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('configures video element attributes and source URL correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      let createdVideo = null;
      let createdUrl = null;

      const origCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName) {
        const el = origCreateElement(tagName);
        if (tagName.toLowerCase() === 'video') {
          createdVideo = el;
        }
        return el;
      };

      const origCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = () => {
        createdUrl = 'blob:mock-test-url-1';
        return createdUrl;
      };

      try {
        const mockBlob = new Blob(['fake video data'], { type: 'video/mp4' });
        checkBlobDuration(mockBlob, 10.0);

        return {
          preload: createdVideo.preload,
          muted: createdVideo.muted,
          playsInline: createdVideo.playsInline,
          src: createdVideo.src,
          expectedSrc: createdUrl,
          hasLoadedMetadataHandler: typeof createdVideo.onloadedmetadata === 'function',
          hasErrorHandler: typeof createdVideo.onerror === 'function'
        };
      } finally {
        document.createElement = origCreateElement;
        URL.createObjectURL = origCreateObjectURL;
      }
    });

    expect(result.preload).toBe('metadata');
    expect(result.muted).toBe(true);
    expect(result.playsInline).toBe(true);
    expect(result.src).toBe(result.expectedSrc);
    expect(result.hasLoadedMetadataHandler).toBe(true);
    expect(result.hasErrorHandler).toBe(true);
  });

  test('does not log warning when actual duration matches expected duration within 0.5s tolerance', async ({ page }) => {
    const result = await page.evaluate(() => {
      const warnings = [];
      const origLogWarn = window.logWarn;
      window.logWarn = (...args) => warnings.push(args.join(' '));

      let revokedUrl = null;
      const origCreateObjectURL = URL.createObjectURL;
      const origRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = () => 'blob:mock-matching-url';
      URL.revokeObjectURL = (url) => { revokedUrl = url; };

      let createdVideo = null;
      const origCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName) {
        const el = origCreateElement(tagName);
        if (tagName.toLowerCase() === 'video') {
          createdVideo = el;
        }
        return el;
      };

      try {
        const mockBlob = new Blob(['fake video data'], { type: 'video/mp4' });
        checkBlobDuration(mockBlob, 10.0);

        // Simulate loaded metadata with actual duration = 10.2s (diff = 0.2s <= 0.5s)
        Object.defineProperty(createdVideo, 'duration', { value: 10.2, configurable: true });
        createdVideo.onloadedmetadata();

        return {
          warningsCount: warnings.length,
          revokedUrl: revokedUrl
        };
      } finally {
        window.logWarn = origLogWarn;
        document.createElement = origCreateElement;
        URL.createObjectURL = origCreateObjectURL;
        URL.revokeObjectURL = origRevokeObjectURL;
      }
    });

    expect(result.warningsCount).toBe(0);
    expect(result.revokedUrl).toBe('blob:mock-matching-url');
  });

  test('logs warning when actual duration exceeds expected duration by more than 0.5s', async ({ page }) => {
    const result = await page.evaluate(() => {
      const warnings = [];
      const origLogWarn = window.logWarn;
      window.logWarn = (...args) => warnings.push(args.join(' '));

      let revokedUrl = null;
      const origCreateObjectURL = URL.createObjectURL;
      const origRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = () => 'blob:mock-over-duration-url';
      URL.revokeObjectURL = (url) => { revokedUrl = url; };

      let createdVideo = null;
      const origCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName) {
        const el = origCreateElement(tagName);
        if (tagName.toLowerCase() === 'video') {
          createdVideo = el;
        }
        return el;
      };

      try {
        const mockBlob = new Blob(['fake video data'], { type: 'video/mp4' });
        checkBlobDuration(mockBlob, 10.0);

        // Simulate loaded metadata with actual duration = 12.45s (diff = 2.45s > 0.5s)
        Object.defineProperty(createdVideo, 'duration', { value: 12.45, configurable: true });
        createdVideo.onloadedmetadata();

        return {
          warningMsg: warnings[0],
          revokedUrl: revokedUrl
        };
      } finally {
        window.logWarn = origLogWarn;
        document.createElement = origCreateElement;
        URL.createObjectURL = origCreateObjectURL;
        URL.revokeObjectURL = origRevokeObjectURL;
      }
    });

    expect(result.warningMsg).toContain('Safeguard warning');
    expect(result.warningMsg).toContain('12.45s');
    expect(result.warningMsg).toContain('10.00s');
    expect(result.revokedUrl).toBe('blob:mock-over-duration-url');
  });

  test('logs warning when actual duration is less than expected duration by more than 0.5s', async ({ page }) => {
    const result = await page.evaluate(() => {
      const warnings = [];
      const origLogWarn = window.logWarn;
      window.logWarn = (...args) => warnings.push(args.join(' '));

      let revokedUrl = null;
      const origCreateObjectURL = URL.createObjectURL;
      const origRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = () => 'blob:mock-under-duration-url';
      URL.revokeObjectURL = (url) => { revokedUrl = url; };

      let createdVideo = null;
      const origCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName) {
        const el = origCreateElement(tagName);
        if (tagName.toLowerCase() === 'video') {
          createdVideo = el;
        }
        return el;
      };

      try {
        const mockBlob = new Blob(['fake video data'], { type: 'video/mp4' });
        checkBlobDuration(mockBlob, 10.0);

        // Simulate loaded metadata with actual duration = 5.10s (diff = 4.90s > 0.5s)
        Object.defineProperty(createdVideo, 'duration', { value: 5.1, configurable: true });
        createdVideo.onloadedmetadata();

        return {
          warningMsg: warnings[0],
          revokedUrl: revokedUrl
        };
      } finally {
        window.logWarn = origLogWarn;
        document.createElement = origCreateElement;
        URL.createObjectURL = origCreateObjectURL;
        URL.revokeObjectURL = origRevokeObjectURL;
      }
    });

    expect(result.warningMsg).toContain('Safeguard warning');
    expect(result.warningMsg).toContain('5.10s');
    expect(result.warningMsg).toContain('10.00s');
    expect(result.revokedUrl).toBe('blob:mock-under-duration-url');
  });

  test('logs warning on metadata loading error and revokes object URL', async ({ page }) => {
    const result = await page.evaluate(() => {
      const warnings = [];
      const origLogWarn = window.logWarn;
      window.logWarn = (...args) => warnings.push(args.join(' '));

      let revokedUrl = null;
      const origCreateObjectURL = URL.createObjectURL;
      const origRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = () => 'blob:mock-error-url';
      URL.revokeObjectURL = (url) => { revokedUrl = url; };

      let createdVideo = null;
      const origCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName) {
        const el = origCreateElement(tagName);
        if (tagName.toLowerCase() === 'video') {
          createdVideo = el;
        }
        return el;
      };

      try {
        const mockBlob = new Blob(['fake video data'], { type: 'video/mp4' });
        checkBlobDuration(mockBlob, 10.0);

        // Simulate error event
        createdVideo.onerror();

        return {
          warningMsg: warnings[0],
          revokedUrl: revokedUrl
        };
      } finally {
        window.logWarn = origLogWarn;
        document.createElement = origCreateElement;
        URL.createObjectURL = origCreateObjectURL;
        URL.revokeObjectURL = origRevokeObjectURL;
      }
    });

    expect(result.warningMsg).toBe('Safeguard warning: Could not load metadata to check video duration.');
    expect(result.revokedUrl).toBe('blob:mock-error-url');
  });

  test('handles NaN actual duration gracefully and revokes object URL', async ({ page }) => {
    const result = await page.evaluate(() => {
      const warnings = [];
      const origLogWarn = window.logWarn;
      window.logWarn = (...args) => warnings.push(args.join(' '));

      let revokedUrl = null;
      const origCreateObjectURL = URL.createObjectURL;
      const origRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = () => 'blob:mock-nan-url';
      URL.revokeObjectURL = (url) => { revokedUrl = url; };

      let createdVideo = null;
      const origCreateElement = document.createElement.bind(document);
      document.createElement = function(tagName) {
        const el = origCreateElement(tagName);
        if (tagName.toLowerCase() === 'video') {
          createdVideo = el;
        }
        return el;
      };

      try {
        const mockBlob = new Blob(['fake video data'], { type: 'video/mp4' });
        checkBlobDuration(mockBlob, 10.0);

        // Simulate loaded metadata with actual duration = NaN
        Object.defineProperty(createdVideo, 'duration', { value: NaN, configurable: true });
        createdVideo.onloadedmetadata();

        return {
          warningMsg: warnings[0],
          revokedUrl: revokedUrl
        };
      } finally {
        window.logWarn = origLogWarn;
        document.createElement = origCreateElement;
        URL.createObjectURL = origCreateObjectURL;
        URL.revokeObjectURL = origRevokeObjectURL;
      }
    });

    expect(result.warningMsg).toContain('Safeguard warning');
    expect(result.warningMsg).toContain('NaNs');
    expect(result.warningMsg).toContain('10.00s');
    expect(result.revokedUrl).toBe('blob:mock-nan-url');
  });
});
