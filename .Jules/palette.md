## 2026-09-14 - Keyboard Accessibility & ARIA Slider Semantics for Drag Handles
**Learning:** Custom visual drag handles (like audio waveform trim bounds) must expose `tabindex="0"`, slider ARIA roles (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext`), `:focus-visible` indicators, and keyboard navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`) so keyboard and screen reader users can inspect and adjust values without mouse interaction.
**Action:** Always pair custom interactive drag controls with slider ARIA attributes and keydown event handlers for keyboard precision adjustments.

## 2026-09-16 - ARIA Live Regions & Progress Bar Semantics for Async Processing
**Learning:** Progress indicators and status message containers for async long-running tasks (like WebCodecs video encoding and audio decoding) require explicit `role="progressbar"` with dynamic `aria-valuenow` updates, alongside `role="status"`/`role="alert"` and `aria-live` attributes (`polite`/`assertive`), so screen reader users are notified of state changes without forced polling or focus movement.
**Action:** Always complement visual progress bars and status text with progressbar ARIA attributes and live region semantics.

## 2026-09-18 - ARIA Toggle States (`aria-pressed`) & Collapsible Expansion Controls (`aria-expanded`)
**Learning:** Toggle buttons with state transitions (such as play/stop preview toggles) require dynamic `aria-pressed` ("true"/"false") and explicit `aria-label` updates, while expandable control buttons opening hidden panels require `aria-controls` pointing to the section ID and dynamic `aria-expanded` updates so screen readers accurately announce control state changes.
**Action:** Always pair toggle buttons with dynamic `aria-pressed` / `aria-label` updates and section toggles with `aria-controls` / `aria-expanded`.

## 2026-09-19 - Interactive Card Hover Feedback & Transition Consistency
**Learning:** Custom interactive card controls (such as aspect ratio cards) require subtle background highlights (`background-color: #1a1a1a`) and text color transitions on `:hover:not(.disabled)` and `.selected` states to match existing drag-and-drop zones and offer tactile feedback during pointer interactions.
**Action:** Ensure interactive selection cards consistently implement hover background transitions alongside keyboard `Enter`/`Space` listeners and ARIA state updates.
