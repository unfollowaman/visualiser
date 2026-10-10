# Waveform

Waveform is a static web application that turns audio voice notes into responsive visualizer videos in your browser using pure HTML, CSS, and vanilla JavaScript.

## Design System and Grid

The redesign employs a CSS custom property grid system that dynamically calculates grid cell size and row counts based on viewport dimensions.

### Grid Engine Formula and Caps

1. **Cell Size Calculation:**
   - On viewports `< 760px` wide (narrow layout), `cols = 6` and padding `pad = 14px` (if `< 640px`) or `28px`.
   - On viewports `760px` to `1099px` wide, `cols = 10` and `pad = 28px`.
   - On viewports `>= 1100px` wide, `cols = 14` and `pad = 28px`.
   - **Formula:** `S = Math.min(Math.floor((w - 2 * pad) / cols), 112)`.
   - **Cap:** `S` is capped at `112px` to prevent over-expansion on ultra-wide monitors.

2. **CSS Variables:**
   - `--s`: Grid cell unit dimension in pixels (e.g. `60px`, max `112px`).
   - `--cols`: Total active columns (`6`, `10`, or `14`).
   - `--rows`: Hero section height in grid rows (`Math.max(narrow ? 12 : 8, Math.floor((h - 68) / S))`).
   - `--frows`: Features section height in grid rows (dynamically calculated in `js/features.js`).
   - `--gutter`: Outer gap sizing (`Math.max(3, Math.round(S * 0.07))`).

3. **Cell Helper:**
   - Elements positioned on the grid use class `.cell` and CSS variable coordinates:
     - `--x`: Horizontal cell offset.
     - `--y`: Vertical cell offset.
     - `--w`: Width in grid units.
     - `--h`: Height in grid units.

### File Map

- `js/grid.js`: Primary grid engine script computing `--s`, `--cols`, `--rows`, `--gutter` variables and managing window resize listeners.
- `js/hero-type.js`: Hero headline typing sequence controller handling cell layout positioning and caret state.
- `js/hero-flowers.js`: Hero halftone flower animation rendering background halftone assets on canvas.
- `js/halftone.js`: Core halftone particle construction (`WaveformHalftone.build`) and Path2D/Canvas2D drawing engine (`WaveformHalftone.draw`).
- `js/features.js`: Features section layout engine, style selection (Lines, Flower, Orb), and interactive preview card canvas loop controller.
- `js/orb.js`: Orb 3D Fibonacci sphere visualizer style engine, live preview loop, and WebCodecs export pipeline.

### Custom Events

- `gridchange`: Dispatched on `window` whenever viewport resizing recomputes grid parameters (`detail: { S, cols, rows, narrow, w, h }`).
- `herolayout`: Dispatched on `window` when hero element grid positions and flower coordinates are calculated (`detail: { flowers }`).
- `hero:type`: Dispatched on `window` on each character typed in the hero headline.
- `motionchange`: Dispatched on `window` whenever global motion state toggles (`document.documentElement.dataset.motion = 'paused'` or `'on'`).

### Unreferenced Assets To-Do List

The following files exist in the repository but are not actively fetched by the web application:
- `assets/flowers/rose.png`, `assets/flowers/Hibiscus.png`, `assets/flowers/blue-cosmos.png`, `assets/flowers/sunflower.png`, `assets/flowers/white daisy.png` (high-res PNG originals; WEBP versions are used for WebGL/halftone rendering).
- `flower-blue-cosmos.png`, `flower-hibiscus.png`, `flower-rose.png`, `flower-sunflower.png`, `flower-white-daisy.png` (root flower PNG assets).
- `PERFORMANCE_AUDIT.md` (historical phase performance log).
- `test.wav`, `test.js` (local development/testing artifacts).
- `webm-muxer.mjs` (ES module export file; `webm-muxer.js` is loaded dynamically during WebM export).
- **Public URL / Canonical Tag To-Do:** Public URL is not configured via CNAME in the repository; `og:url` and `<link rel="canonical">` are omitted pending production domain setup.
- **Open Graph Image To-Do:** No 1200x630 social preview image currently exists in the repository; `og:image` is omitted until a social card graphic is generated.
