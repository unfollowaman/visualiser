## 2026-09-14 - Replace Google Fonts CSS @import with Preconnect Link Tags

**Learning:** Using `@import` inside inline `<style>` tags in `index.html` causes sequential resource fetching and delays external font discovery until after initial HTML parsing and CSS evaluation. Adding `<link rel="preconnect">` tags for `fonts.googleapis.com` and `fonts.gstatic.com` (with `crossorigin`) along with an explicit `<link rel="stylesheet">` allows early TCP/TLS handshakes and parallel font loading.

**Action:** Always prefer `<link rel="preconnect">` and `<link rel="stylesheet">` over `@import` in HTML `<head>` for critical external assets.

## 2026-09-15 - Memoize Waveform Overview RMS Amplitudes During Trim Handle Dragging

**Learning:** `renderEditState()` is called on every `mousemove` / `touchmove` drag event when adjusting trim handles, which in turn calls `drawOverview(audioBuffer)`. Previously, `drawOverview` recalculated 200 RMS bar amplitudes from scratch on every drag frame by iterating over all PCM audio samples (e.g. 8+ million samples for 3-minute audio). Caching the 200-element `Float32Array` amplitudes per `AudioBuffer` eliminates millions of redundant sample iterations per second during dragging.

**Action:** Separate static signal analysis from interactive canvas redraw loops triggered by user gesture events.

## 2026-09-16 - Hoist Initial Sample Access in PCM Signal Processing Loops

**Learning:** In audio analysis loops over large `Float32Array` PCM buffers (e.g. `extractAudioMetrics` processing millions of samples), executing a conditional check `if (s > startSample)` and accessing `mono[s - 1]` inside the loop adds millions of branch instruction checks and redundant array index lookups. Hoisting the initial sample (`firstVal = mono[startSample]`), initializing `prevVal`, and starting the loop from `startSample + 1` completely removes branch checks and reduces array lookups by 50% in the hot path.

**Action:** Always hoist boundary conditions and prior-element references when processing flat typed arrays in tight mathematical loops.
