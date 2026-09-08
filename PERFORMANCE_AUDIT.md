# Performance Audit Report

**Target URL:** `https://unfollowaman.github.io/visualiser/`
**Capture Date:** September 8, 2026
**Performance Score:** 63 / 100
**Best Practices:** 100 / 100
**SEO:** 90 / 100
*(Accessibility is out of scope for this report)*

---

## Key Core Web Vitals Summary

- **First Contentful Paint (FCP):** 2.6 s
- **Largest Contentful Paint (LCP):** 2.6 s
- **Total Blocking Time (TBT):** 24,320 ms
- **Cumulative Layout Shift (CLS):** 0.02
- **Speed Index:** 2.6 s

---

## Detailed Issue Findings

---

### Issue 1: Minimize Main Thread Work

- **Metric / Impact:** Total main thread work: **41.5 s** (with **40,102 ms** categorized as "Other").
- **Root Cause Investigation:**
  - The 40.1 s of "Other" main thread activity is dominated by non-stop WebGL rendering loops and synchronous audio signal processing running in `flower.js`.
  - Specifically, five `requestAnimationFrame` animation loops run simultaneously for all five flower grid card previews (`startPreviewLoop` / `loop`, `flower.js`, lines 191–209) from the moment the page initializes. Even when the user is not interacting with the flower cards, all five WebGL renderers execute GPU commands, shader uniform updates (`uTime`), and frame sync every 16.6 ms.
  - During video exports, synchronous audio metric extraction (`extractAudioMetrics`, `flower.js`, lines 225–302) and per-frame WebGL rendering (`renderAndExportFlowerVideo`, `flower.js`, lines 318–406) completely block the main thread.
  - **Comparison to Historical Canvas2D Bottleneck:** Previously, flower generation relied on CPU-bound Canvas2D `fillArc` loops for halftone dots. Although `flower.js` now utilizes a WebGL fragment shader pipeline (`createWebGLRenderer`, lines 139–183; `FS_SOURCE`, lines 25–137), running five concurrent WebGL canvas animation loops via `requestAnimationFrame` on the main thread still dominates the browser's "Other" category (GPU driver call overhead, canvas compositor sync, and layout/paint scheduling).
  - **Classification:** Primarily **animation-loop related** (idle preview loops running indefinitely) and secondarily **export-related** (blocking export loops).

- **Exact Code Locations:**
  - `flower.js` (lines 152–189): `initFlowerGrid()` attaches `onload` listeners that immediately launch five simultaneous preview animation loops.
  - `flower.js` (lines 191–209): `startPreviewLoop(idx)` and inner `loop(timestamp)` running `requestAnimationFrame` continuously across five canvases.
  - `flower.js` (lines 225–302): `extractAudioMetrics()` running synchronous RMS and zero-crossing frequency analysis across all audio samples on the main thread.
  - `flower.js` (lines 318–406): `renderAndExportFlowerVideo()` executing tight per-frame WebGL renders and `VideoEncoder` encoding calls.

- **Proposed Fix Approach:**
  - Pause or throttle preview animation loops for flower cards that are offscreen (using `IntersectionObserver`) or when the flower section is not visible/active.
  - Render preview updates only for the currently selected flower card, or lower the preview animation framerate from 60 fps to 15–30 fps during idle states.
  - Yield the main thread during heavy export processing using `await new Promise(r => setTimeout(r, 0))` or `queueMicrotask`.
- **Estimated Effort:** Low to Medium (1–2 hours).
- **Module Scope:** **Flower Module** (`flower.js`).

---

### Issue 2: Avoid Long Main Thread Tasks

- **Metric / Impact:** **20 long tasks** found, ranging from **209 ms to 4,723 ms** in duration, nearly all attributed to `flower.js`.
- **Root Cause Investigation:**
  - The long tasks stem from three distinct phases in `flower.js`:
    1. **Initialization & Image Loading:** When images load, `initFlowerGrid` creates five WebGL rendering contexts and texture bindings synchronously on the main thread (`setTexture`, lines 105–121).
    2. **Idle Preview Animation:** Five active `requestAnimationFrame` loops (`loop`, lines 195–206) executing simultaneously block the main thread queue, creating CPU contention during user scrolling or window resizing.
    3. **Export Processing:** `extractAudioMetrics` (`flower.js`, lines 225–302) performs a single synchronous $O(N \times M)$ iteration over all audio samples to compute RMS amplitude and zero-crossing frequency per frame. For a 3-minute audio file at 60 fps (10,800 frames), this loop processes millions of Float32Array samples in a single blocking pass lasting several seconds.
  - **Frame Budget Impact:** At a 60 fps target, the browser frame budget is **16.6 ms per frame**. Tasks ranging from 209 ms to 4,723 ms exceed the budget by **12.5× to 284×**, causing severe UI freezes, dropped frames, input lag, and a Total Blocking Time (TBT) of **24,320 ms**.

- **Exact Code Locations:**
  - `flower.js` (lines 152–189): `initFlowerGrid()` synchronous WebGL context creation and image texture initialization.
  - `flower.js` (lines 191–209): `startPreviewLoop()` and `loop()` callbacks running continuous WebGL renders.
  - `flower.js` (lines 225–302): `extractAudioMetrics()` monolithic audio metrics loop.
  - `flower.js` (lines 345–388): `renderAndExportFlowerVideo()` video frame generation loop.

- **Proposed Fix Approach:**
  - Break down `extractAudioMetrics()` into chunked asynchronous passes using `setTimeout` or `requestIdleCallback` yields to keep main thread tasks under 50 ms.
  - Pause inactive preview animation loops when the flower section is collapsed or not in viewport.
- **Estimated Effort:** Medium (2–3 hours).
- **Module Scope:** **Flower Module** (`flower.js`).

---

### Issue 3: Avoid Enormous Network Payloads

- **Metric / Impact:** Total payload size: **8,904 KiB (~8.7 MB)**. The five flower source images account for **8,812 KiB** (~99% of total transfer).
- **Root Cause Investigation:**
  - All five flower assets are stored as raw, uncompressed 24-bit PNG files with alpha channels at **1254 × 1254** pixels resolution.
  - **Asset Breakdown:**
    - `assets/flowers/Hibiscus.png`: PNG format, **1254 × 1254 px**, **2,094,545 bytes** (~2,046 KiB)
    - `assets/flowers/blue-cosmos.png`: PNG format, **1254 × 1254 px**, **1,802,049 bytes** (~1,761 KiB)
    - `assets/flowers/sunflower.png`: PNG format, **1254 × 1254 px**, **1,778,240 bytes** (~1,737 KiB)
    - `assets/flowers/rose.png`: PNG format, **1254 × 1254 px**, **1,717,632 bytes** (~1,678 KiB)
    - `assets/flowers/white daisy.png`: PNG format, **1254 × 1254 px**, **1,627,076 bytes** (~1,590 KiB)
    - **Total Image Size:** **9,019,542 bytes** (~8,808 KiB)
  - **Sizing vs. Display Analysis:**
    - The grid preview cards render at **256 × 256 px** (`PREVIEW_SIZE = 256` in `flower.js`, line 159). The 1254 × 1254 images are nearly **5× oversized in each dimension** (24× pixel area overkill) for preview display.
    - The maximum export resolution for flower videos is **1080 × 1080 px** (`width = 1080; height = 1080;` in `flower.js`, lines 324–325). The 1254 × 1254 images exceed even the highest resolution export target.
    - Storing these assets as uncompressed PNGs rather than optimized **WebP** or **JPEG** images creates extreme network bloat.

- **Exact Code Locations:**
  - `flower.js` (lines 2–8): `FLOWERS` configuration array referencing `assets/flowers/*.png`.
  - File directory: `assets/flowers/` (all 5 PNG source assets).

- **Proposed Fix Approach:**
  - Convert all five flower images from PNG to modern **WebP** or lossy WebP/JPEG format, resized to **1080 × 1080 px** (matching max export resolution).
  - Expected reduction: Converts 8,812 KiB down to **< 600 KiB total** (> 93% payload savings) without any visible quality degradation in WebGL shaders.
- **Estimated Effort:** Low (30 minutes).
- **Module Scope:** **Flower Module** (`flower.js` / `assets/flowers/`).

---

### Issue 4: Use Efficient Cache Lifetimes

- **Metric / Impact:** Estimated potential savings: **8,109 KiB**. Current cache Time-To-Live (TTL) is **10 minutes** (`max-age=600`) on all first-party static assets.
- **Root Cause Investigation:**
  - The web application is hosted on GitHub Pages (`https://unfollowaman.github.io/visualiser/`).
  - GitHub Pages sets a fixed default HTTP response header of `Cache-Control: max-age=600` (10 minutes) on all static assets.
  - GitHub Pages does not support custom server configuration files (such as `.htaccess` or Netlify `_headers`) to customize `Cache-Control` max-age values.
  - Because assets retain the same URLs (`script.js`, `flower.js`, `style.css`, `mp4-muxer.js`, image paths) across deployments, browsers are forced to revalidate or re-download 8.8 MB of assets every 10 minutes.
  - **Cache-Busting Strategy Analysis:** A build step or file renaming strategy (e.g. content-hash filenames like `script.a8f2c.js` or build query parameters like `script.js?v=1.0.1`) would allow setting longer effective caching or relying on cache-busting when assets change.

- **Exact Code Locations:**
  - `index.html` (lines 18, 189–191): Static asset references (`style.css`, `mp4-muxer.js`, `script.js`, `flower.js`).
  - `flower.js` (lines 2–8): Asset path references (`assets/flowers/*.png`).

- **Proposed Fix Approach:**
  - Implement a lightweight build script (e.g., using a simple Node.js build step or query-string versioning) to append content hashes to asset filenames or URLs during deployment.
- **Estimated Effort:** Low to Medium (1 hour).
- **Module Scope:** **Shared Infrastructure** (`index.html`, `flower.js`, build setup).

---

### Issue 5: Render Blocking Requests

- **Metric / Impact:** Estimated potential savings: **1,760 ms**.
- **Root Cause Investigation:**
  - PageSpeed Insights identifies four blocking resources requested during initial document load:
    1. `style.css`: 2.7 KiB, ~150 ms load time
    2. `script.js`: 11.2 KiB (41.4 KiB raw), ~600 ms load time
    3. `mp4-muxer.js`: 15.5 KiB (72.2 KiB raw), ~600 ms load time
    4. `flower.js`: 5.3 KiB (15.1 KiB raw), ~600 ms load time
  - **Script Tag Placement:** In `index.html` (lines 189–191), script tags are placed at the end of `<body>` without `defer`, `async`, or `type="module"` attributes:
    ```html
    <script src="mp4-muxer.js"></script>
    <script src="script.js"></script>
    <script src="flower.js"></script>
    ```
  - **First Paint Analysis:**
    - `style.css` is legitimately required for styling initial HTML content.
    - `script.js` manages core UI handlers and file drop zones, but does not render initial DOM HTML. Adding `defer` or `type="module"` prevents parser blocking.
    - `mp4-muxer.js` is **only** required during video export operations (`renderFormat` in `script.js` and `renderAndExportFlowerVideo` in `flower.js`). It is completely unnecessary during initial page load and First Paint.
    - `flower.js` manages the flower generator module located lower on the page. It is not required for rendering the primary Waveform UI on First Paint.

- **Exact Code Locations:**
  - `index.html` (line 18): `<link rel="stylesheet" href="style.css">`
  - `index.html` (lines 189–191): Synchronous blocking `<script>` tags.

- **Proposed Fix Approach:**
  - Add `defer` attributes to `<script>` tags in `index.html`.
  - Lazy-load `mp4-muxer.js` via dynamic `import()` or load it on-demand only when the user initiates a render/export.
  - Mark `flower.js` as `defer` or dynamically load it when the user scrolls to the flower section.
- **Estimated Effort:** Low (30 minutes).
- **Module Scope:** **Shared Infrastructure** (`index.html`, `script.js`, `flower.js`, `mp4-muxer.js`).

---

### Issue 6: Minify JavaScript

- **Metric / Impact:** Estimated potential savings: **~7–26 KiB** payload reduction.
- **Root Cause Investigation:**
  - All JavaScript source files in production are unminified, retaining comments, whitespace, and full variable names.
  - **Current vs. Estimated Minified File Sizes:**
    - `script.js`: Current **42,437 bytes (~41.4 KiB)** $\rightarrow$ Estimated Minified **~33,599 bytes (~32.8 KiB)** (Savings: **~8.6 KiB / 20.8%**)
    - `mp4-muxer.js`: Current **73,921 bytes (~72.2 KiB)** $\rightarrow$ Estimated Minified **~58,194 bytes (~56.8 KiB)** (Savings: **~15.4 KiB / 21.3%**)
    - `flower.js`: Current **15,489 bytes (~15.1 KiB)** $\rightarrow$ Estimated Minified **~13,351 bytes (~13.0 KiB)** (Savings: **~2.1 KiB / 13.8%**)
  - Total raw JS payload is **~128.7 KiB**, which minifies to **~102.1 KiB** (total savings: **~26.6 KiB** uncompressed).

- **Exact Code Locations:**
  - `script.js` (entire file, 41.4 KiB raw)
  - `mp4-muxer.js` (entire file, 72.2 KiB raw)
  - `flower.js` (entire file, 15.1 KiB raw)

- **Proposed Fix Approach:**
  - Add a minification step (using Terser, esbuild, or UglifyJS) to the deployment pipeline to generate minified `.min.js` production assets.
- **Estimated Effort:** Low (30 minutes).
- **Module Scope:** **Shared Infrastructure** (`script.js`, `mp4-muxer.js`, `flower.js`).

---

### Issue 7: Network Dependency Tree

- **Metric / Impact:** Maximum critical path latency: **148 ms**.
- **Root Cause Investigation:**
  - The current critical request chain from PageSpeed Insights shows:
    1. `index.html` (Initial Document)
    2. Parallel requests for `style.css`, `mp4-muxer.js`, `script.js`, `flower.js`
    3. External Google Fonts CSS from `fonts.googleapis.com` requested via CSS `@import`
    4. External font files from `fonts.gstatic.com`
  - In `index.html` (line 15), Google Fonts are imported inside an inline `<style>` tag using CSS `@import`:
    ```html
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
    </style>
    ```
  - **Preconnect Missing Analysis:** Using CSS `@import` delays font discovery until after `index.html` is parsed and CSS is evaluated. `index.html` lacks `<link rel="preconnect" href="https://fonts.googleapis.com">` and `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` tags. As a result, PageSpeed Insights found no preconnect candidates despite cross-origin font dependencies.

- **Exact Code Locations:**
  - `index.html` (lines 14–16): Inline `@import` declaration for Google Fonts.

- **Proposed Fix Approach:**
  - Remove inline CSS `@import` from `index.html`.
  - Add standard preconnect `<link>` elements to `<head>`:
    ```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap">
    ```
- **Estimated Effort:** Low (15 minutes).
- **Module Scope:** **Shared Infrastructure** (`index.html`).

---

## Prioritized Action Plan

The issues below are ordered by estimated **user-facing impact versus implementation effort**:

1. **Issue 3: Avoid Enormous Network Payloads** *(Flower Module / Assets)*
   - **Impact:** High (Saves ~8.2 MB network transfer, drastically improving LCP and initial page load on mobile networks).
   - **Effort:** Low (Convert 5 PNGs to 1080×1080 WebP images).

2. **Issue 1 & Issue 2: Minimize Main Thread Work & Long Tasks** *(Flower Module)*
   - **Impact:** High (Eliminates 24,320 ms of Total Blocking Time and addresses 40.1 s of 'Other' main thread work by pausing background preview loops and chunking audio metrics extraction).
   - **Effort:** Medium (Add `IntersectionObserver` / pause idle previews; chunk `extractAudioMetrics`).

3. **Issue 5: Render Blocking Requests** *(Shared Infrastructure)*
   - **Impact:** Medium (Saves ~1,760 ms blocking delay before initial paint).
   - **Effort:** Low (Add `defer` attributes to script tags; lazy-load `mp4-muxer.js`).

4. **Issue 7: Network Dependency Tree & Font Preconnect** *(Shared Infrastructure)*
   - **Impact:** Medium (Eliminates critical path latency for font fetching).
   - **Effort:** Low (Replace CSS `@import` with preconnect `<link>` tags in `index.html`).

5. **Issue 6: Minify JavaScript** *(Shared Infrastructure)*
   - **Impact:** Low to Medium (Saves ~26 KiB transfer size).
   - **Effort:** Low (Integrate minification step into build pipeline).

6. **Issue 4: Use Efficient Cache Lifetimes** *(Shared Infrastructure)*
   - **Impact:** Low to Medium (Prevents redundant asset downloads on return visits within GitHub Pages limits).
   - **Effort:** Low to Medium (Implement asset versioning/cache-busting query strings).
