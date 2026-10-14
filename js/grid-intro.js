(function () {
  try {
    const T = { delay: 200, top: 650, vert: 800, fade: 160 };

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function inv(p) {
      return p < 0.5 ? Math.cbrt(p / 4) : 1 - Math.cbrt(2 * (1 - p)) / 2;
    }

    function clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    }

    let container = null;
    let hLines = [];
    let vLines = [];
    let animFrameId = null;
    let isRunning = false;
    let isCompleted = false;

    // Flags for firing custom events exactly once
    let startFired = false;
    let topDoneFired = false;
    let verticalsDoneFired = false;
    let doneFired = false;

    function dispatch(name) {
      window.dispatchEvent(new CustomEvent(name));
    }

    function getGrid() {
      return window.waveformGrid || { S: 60, cols: 6, rows: 12 };
    }

    function buildLines() {
      if (!container) {
        container = document.querySelector('#hero-grid .hero-lines');
      }
      if (!container) return;

      container.innerHTML = '';
      hLines = [];
      vLines = [];

      const { S, cols, rows } = getGrid();
      const gutter = Math.max(3, Math.round(S * 0.07));

      // Horizontal line pairs: rows + 1 boundaries
      for (let i = 0; i <= rows; i++) {
        let y0 = i * S;
        let y1 = i * S + gutter;
        if (i === rows) {
          y0 = rows * S - gutter - 1;
          y1 = rows * S - 1;
        }

        const el0 = document.createElement('i');
        el0.className = 'hl m0';
        el0.style.top = y0 + 'px';

        const el1 = document.createElement('i');
        el1.className = 'hl m1';
        el1.style.top = y1 + 'px';

        container.appendChild(el0);
        container.appendChild(el1);
        hLines.push({ row: i, y0, y1, el0, el1 });
      }

      // Vertical line pairs: cols + 1 boundaries
      for (let i = 0; i <= cols; i++) {
        let x0 = i * S;
        let x1 = i * S + gutter;
        if (i === cols) {
          x0 = cols * S - gutter - 1;
          x1 = cols * S - 1;
        }

        const el0 = document.createElement('i');
        el0.className = 'vl m0';
        el0.style.left = x0 + 'px';

        const el1 = document.createElement('i');
        el1.className = 'vl m1';
        el1.style.left = x1 + 'px';

        container.appendChild(el0);
        container.appendChild(el1);
        vLines.push({ col: i, x0, x1, el0, el1 });
      }
    }

    function applyWillChange(active) {
      const val = active ? 'transform, opacity' : '';
      if (!container) return;
      const elements = container.querySelectorAll('i');
      elements.forEach(function (el) {
        el.style.willChange = val;
      });
    }

    function jumpToFinalState() {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      isRunning = false;
      isCompleted = true;

      buildLines();

      if (!container) return;
      const elements = container.querySelectorAll('i');
      elements.forEach(function (el) {
        el.style.transform = '';
        el.style.opacity = '';
        el.style.willChange = '';
      });

      document.documentElement.dataset.gridIntro = 'done';

      if (!startFired) {
        startFired = true;
        dispatch('gridintro:start');
      }
      if (!topDoneFired) {
        topDoneFired = true;
        dispatch('gridintro:top-done');
      }
      if (!verticalsDoneFired) {
        verticalsDoneFired = true;
        dispatch('gridintro:verticals-done');
      }
      if (!doneFired) {
        doneFired = true;
        dispatch('gridintro:done');
      }
    }

    function shouldSkipAnimation() {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const isPaused = document.documentElement.dataset.motion === 'paused';
      return prefersReduced || isPaused;
    }

    function startIntroAnimation() {
      if (shouldSkipAnimation()) {
        jumpToFinalState();
        return;
      }

      buildLines();
      applyWillChange(true);

      isRunning = true;
      document.documentElement.dataset.gridIntro = 'running';

      let zero = null;

      function frame(timestamp) {
        if (!zero) {
          zero = timestamp + T.delay;
        }

        const elapsed = timestamp - zero;

        if (elapsed >= 0 && !startFired) {
          startFired = true;
          dispatch('gridintro:start');
        }

        if (elapsed < 0) {
          // Before time zero: all lines hidden
          hLines.forEach(function (item) {
            item.el0.style.transform = 'scaleX(0)';
            item.el1.style.transform = 'scaleX(0)';
            item.el0.style.opacity = '0';
            item.el1.style.opacity = '0';
          });
          vLines.forEach(function (item) {
            item.el0.style.transform = 'scaleY(0)';
            item.el1.style.transform = 'scaleY(0)';
            item.el0.style.opacity = '0';
            item.el1.style.opacity = '0';
          });
          animFrameId = requestAnimationFrame(frame);
          return;
        }

        // Stage 1: Top pair outward growth (0 <= elapsed <= T.top)
        const topProgress = clamp(elapsed / T.top, 0, 1);
        const topScaleX = easeInOutCubic(topProgress);

        const topPair = hLines[0];
        if (topPair) {
          topPair.el0.style.transform = 'scaleX(' + topScaleX + ')';
          topPair.el1.style.transform = 'scaleX(' + topScaleX + ')';
          topPair.el0.style.opacity = '1';
          topPair.el1.style.opacity = '1';
        }

        if (elapsed >= T.top && !topDoneFired) {
          topDoneFired = true;
          dispatch('gridintro:top-done');
        }

        // Stage 2: Vertical lines downward growth (elapsed >= T.top)
        const vertProgress = clamp((elapsed - T.top) / T.vert, 0, 1);
        const vertScaleY = easeInOutCubic(vertProgress);

        vLines.forEach(function (item) {
          item.el0.style.transform = 'scaleY(' + vertScaleY + ')';
          item.el1.style.transform = 'scaleY(' + vertScaleY + ')';
          item.el0.style.opacity = vertProgress > 0 ? '1' : '0';
          item.el1.style.opacity = vertProgress > 0 ? '1' : '0';
        });

        if (elapsed >= T.top + T.vert && !verticalsDoneFired) {
          verticalsDoneFired = true;
          dispatch('gridintro:verticals-done');
        }

        // Intermediate & Bottom horizontal lines fade in as vertical front crosses them
        const rows = getGrid().rows;
        for (let r = 1; r <= rows; r++) {
          const item = hLines[r];
          if (!item) continue;

          const f = r / rows;
          const tc = T.top + T.vert * inv(f);
          const opacity = clamp((elapsed - (tc - T.fade / 2)) / T.fade, 0, 1);

          item.el0.style.transform = 'none';
          item.el1.style.transform = 'none';
          item.el0.style.opacity = opacity.toString();
          item.el1.style.opacity = opacity.toString();
        }

        // End condition
        if (elapsed >= T.top + T.vert + T.fade / 2) {
          jumpToFinalState();
          return;
        }

        animFrameId = requestAnimationFrame(frame);
      }

      animFrameId = requestAnimationFrame(frame);
    }

    function init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startIntroAnimation);
      } else {
        startIntroAnimation();
      }

      window.addEventListener('motionchange', function () {
        if (isRunning) {
          jumpToFinalState();
        }
      });

      window.addEventListener('resize', function () {
        if (isRunning) {
          jumpToFinalState();
        }
      });

      window.addEventListener('gridchange', function () {
        if (isRunning) {
          jumpToFinalState();
        } else if (isCompleted) {
          buildLines();
        }
      });
    }

    init();
  } catch (err) {
    if (console && console.error) {
      console.error('Grid intro error:', err);
    }
    document.documentElement.className = document.documentElement.className.replace(/\bjs\b/, 'no-js');
  }
})();
