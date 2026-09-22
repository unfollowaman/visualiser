## 2026-09-14 - Replace Google Fonts CSS @import with Preconnect Link Tags

**Learning:** Using `@import` inside inline `<style>` tags in `index.html` causes sequential resource fetching and delays external font discovery until after initial HTML parsing and CSS evaluation. Adding `<link rel="preconnect">` tags for `fonts.googleapis.com` and `fonts.gstatic.com` (with `crossorigin`) along with an explicit `<link rel="stylesheet">` allows early TCP/TLS handshakes and parallel font loading.

**Action:** Always prefer `<link rel="preconnect">` and `<link rel="stylesheet">` over `@import` in HTML `<head>` for critical external assets.

## 2026-09-15 - Memoize Waveform Overview RMS Amplitudes During Trim Handle Dragging

**Learning:** `renderEditState()` is called on every `mousemove` / `touchmove` drag event when adjusting trim handles, which in turn calls `drawOverview(audioBuffer)`. Previously, `drawOverview` recalculated 200 RMS bar amplitudes from scratch on every drag frame by iterating over all PCM audio samples (e.g. 8+ million samples for 3-minute audio). Caching the 200-element `Float32Array` amplitudes per `AudioBuffer` eliminates millions of redundant sample iterations per second during dragging.

**Action:** Separate static signal analysis from interactive canvas redraw loops triggered by user gesture events.

## 2026-09-16 - Hoist Initial Sample Access in PCM Signal Processing Loops

**Learning:** In audio analysis loops over large `Float32Array` PCM buffers (e.g. `extractAudioMetrics` processing millions of samples), executing a conditional check `if (s > startSample)` and accessing `mono[s - 1]` inside the loop adds millions of branch instruction checks and redundant array index lookups. Hoisting the initial sample (`firstVal = mono[startSample]`), initializing `prevVal`, and starting the loop from `startSample + 1` completely removes branch checks and reduces array lookups by 50% in the hot path.

**Action:** Always hoist boundary conditions and prior-element references when processing flat typed arrays in tight mathematical loops.

## 2026-09-17 - Bulk Memory Copy for Audio Buffer Reconstruction using TypedArray.prototype.set()

**Learning:** In `buildWorkingAudioBuffer()`, iterating sample-by-sample in JS and executing function calls (`applyFade()`) over millions of Float32Array PCM samples when constructing trimmed AudioBuffers created significant main-thread execution overhead. Since fade-in and fade-out effects apply only to short 8ms boundary windows (~352 samples at 44.1kHz), the vast majority of samples are copied without alteration. Restructuring the copy loop to perform bulk memory transfers via `Float32Array.prototype.set()` for the middle samples and processing only boundary samples dramatically speeds up audio trimming and buffer construction.

**Action:** Use native `TypedArray.prototype.set()` or `.subarray()` for bulk array segment copies in audio and binary data processing, isolating custom transformations to boundary elements.

## 2026-09-18 - Eliminate Temporary Heap Object Allocations in 60 FPS Canvas Drawing Loops

**Learning:** Creating temporary `{ x, y, width, height, radius }` option objects on every bar inside 60 FPS canvas drawing loops (`drawBars` rendering 48 bars/frame and `drawOverview` rendering 200 bars) allocated over 500,000 temporary heap objects during a single 3-minute video export (10,800 frames). In single-threaded synchronous canvas drawing calls, mutating a single module-level persistent rect object (`reusableBarRect` and `reusableOverviewRect`) and hoisting loop-invariant layout calculations (`radius`, `stepX`, vertical center offsets) completely eliminates heap allocations and GC pressure without affecting rendering accuracy or API compatibility.

**Action:** Re-use mutable persistent objects for option parameter signatures in high-frequency frame drawing loops.

## 2026-09-20 - Pre-multiply Inverse Scaling Factors in 60 FPS Frequency Bin Animation Loops

**Learning:** In `runPreviewLoop()` (`script.js`), calculating `count` using loop increments (`count++`) and executing floating-point divisions (`sum / count / 255`) for each visualizer bar on every `requestAnimationFrame` frame performed thousands of division operations per second. Pre-calculating a composite inverse scaling factor (`1 / (binCount * 255)`) into a `Float32Array` during frequency bin initialization replaces per-bar divisions, branch checks, and counter increments with a single multiplication (`sum * invCount`) in the 60 FPS animation loop.

**Action:** Pre-calculate combined inverse multipliers for static bin structures to eliminate divisions and branch checks in high-frequency animation loops.

## 2026-09-21 - Hoist Boundary Clamping Outside Inner PCM Sample Iteration Loops

**Learning:** In `analyzeAudio()` (`script.js`), the inner sample loop over Float32Array PCM samples (`for (let s = segStart; s < segEnd && s < totalSamples; s++)`) evaluated `s < totalSamples` on every single iteration across all 48 bars per frame (~8,000,000 PCM samples for a 3-minute audio file). Pre-calculating `const sampleLimit = segEnd < totalSamples ? segEnd : totalSamples;` prior to entering the inner loop eliminates millions of redundant boundary check comparisons in the tightest audio signal analysis loop in `script.js`.

**Action:** Hoist array upper bound clamping and range checks outside tight mathematical data processing loops.

## 2026-09-22 - Bypass AudioBuffer Allocation and Sample Fading for Untrimmed Original Audio

**Learning:** `buildWorkingAudioBuffer()` is invoked whenever previewing audio, continuing to render, or initiating video exports. When the user has not edited the audio (or resets it to full length), `keepRanges` spans the entire duration (`keepRanges[0].start === 0 && keepRanges[0].end === decodedAudioBuffer.duration`). Previously, `buildWorkingAudioBuffer()` still allocated a new `AudioBuffer` and copied all channels sample-by-sample. Bypassing buffer construction and returning `decodedAudioBuffer` directly when `keepRanges` is untrimmed eliminates unnecessary memory allocations and Float32Array bulk copies.

**Action:** Check if range parameters cover the full source duration before reconstructing audio or binary data buffers.
