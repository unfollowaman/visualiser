## 2026-09-14 - Keyboard Accessibility & ARIA Slider Semantics for Drag Handles
**Learning:** Custom visual drag handles (like audio waveform trim bounds) must expose `tabindex="0"`, slider ARIA roles (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext`), `:focus-visible` indicators, and keyboard navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`) so keyboard and screen reader users can inspect and adjust values without mouse interaction.
**Action:** Always pair custom interactive drag controls with slider ARIA attributes and keydown event handlers for keyboard precision adjustments.

## 2026-09-16 - ARIA Live Regions & Progress Bar Semantics for Async Processing
**Learning:** Progress indicators and status message containers for async long-running tasks (like WebCodecs video encoding and audio decoding) require explicit `role="progressbar"` with dynamic `aria-valuenow` updates, alongside `role="status"`/`role="alert"` and `aria-live` attributes (`polite`/`assertive`), so screen reader users are notified of state changes without forced polling or focus movement.
**Action:** Always complement visual progress bars and status text with progressbar ARIA attributes and live region semantics.
