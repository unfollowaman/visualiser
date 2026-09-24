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

## 2026-09-21 - Focus Management Across Collapsible Panel Toggles and Export Completion
**Learning:** When expanding or collapsing UI panels (`display: none`) or revealing download links after async task completion, explicit DOM element focus (`.focus()`) must be set on newly revealed interactive controls (e.g. preview controls, aspect cards, or download links). Otherwise, hiding the currently focused trigger element causes browser focus to drop to `document.body`, forcing keyboard and screen reader users to lose their place in the document flow.
**Action:** Always shift focus programmatically to the primary interactive element in newly revealed sections or completed export containers.

## 2026-09-22 - Visual Tooltip & Readout Visibility on Keyboard Focus
**Learning:** Hover-triggered visual tooltips or data readouts attached to interactive controls (like audio trim handle timestamp readouts) must trigger on `:focus` and `:focus-visible` in CSS, and be positioned inside parent boundaries or with high `z-index` so keyboard users tabbing or adjusting values via keyboard can inspect readouts in real-time without clipping.
**Action:** Always include `:focus` and `:focus-visible` states alongside `:hover` for interactive control readouts and tooltips.

## 2026-09-23 - Keyboard Shortcut Ergonomics (`Ctrl+Z` / `⌘Z`) & ARIA Shortcut Hints
**Learning:** Destructive or reversible interactive UI actions (such as audio editing undos) need global keyboard shortcut support (`Ctrl+Z` / `Cmd+Z`) paired with explicit input-element guards (`isInput` checks) and clear shortcut hints in `title` tooltips and `aria-label` attributes (`Undo last audio edit (Ctrl+Z / ⌘Z)`). This makes web editing interactions feel like native desktop software while preserving screen reader and keyboard clarity.
**Action:** Always pair reversible action buttons with standard desktop keyboard shortcuts (`Ctrl+Z`), checking for input element focus, and include shortcut hints in `title` tooltips and `aria-label` descriptions.
