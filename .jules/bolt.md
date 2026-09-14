## 2026-09-14 - Replace Google Fonts CSS @import with Preconnect Link Tags

**Learning:** Using `@import` inside inline `<style>` tags in `index.html` causes sequential resource fetching and delays external font discovery until after initial HTML parsing and CSS evaluation. Adding `<link rel="preconnect">` tags for `fonts.googleapis.com` and `fonts.gstatic.com` (with `crossorigin`) along with an explicit `<link rel="stylesheet">` allows early TCP/TLS handshakes and parallel font loading.

**Action:** Always prefer `<link rel="preconnect">` and `<link rel="stylesheet">` over `@import` in HTML `<head>` for critical external assets.
