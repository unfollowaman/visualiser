(function () {
  'use strict';

  var phrases = [
    ["Voices", "in", "My", "Head"],
    ["Needs", "to Be", "Articulated", ""]
  ];

  function setCellProps(el, x, y, w, h) {
    if (!el) return;
    el.style.setProperty('--x', x);
    el.style.setProperty('--y', y);
    el.style.setProperty('--w', w);
    el.style.setProperty('--h', h);
  }

  function applyHeroLayout(g) {
    g = g || window.waveformGrid;
    if (!g) return;

    var heroGrid = document.getElementById('hero-grid');
    var heroTitle = document.getElementById('hero-title');
    var heroBrain = document.getElementById('hero-brain-slot');
    var heroDesc = document.getElementById('hero-desc');
    var heroCta = document.getElementById('hero-cta');

    var fontScale;
    var flowers;

    if (g.narrow) {
      fontScale = 0.84;
      setCellProps(heroTitle, 0, 2, 6, 4);
      setCellProps(heroBrain, 1.5, 4.7, 4.5, 4);
      setCellProps(heroDesc, 0, 9, 5.2, 2);
      setCellProps(heroCta, 0, 10.6, 3, 1);
      flowers = [
        [3, 1, 'rose'],
        [1, 0, 'hibiscus'],
        [0, 6, 'sunflower'],
        [5, 9, 'blue-cosmos']
      ];
    } else {
      var k = g.cols;
      fontScale = 0.9;
      setCellProps(heroTitle, k * 0.07, 1, k * 0.5, 4);
      setCellProps(heroBrain, k * 0.5, 0.6, k * 0.47, k * 0.4);
      setCellProps(heroDesc, k * 0.07, 5.3, k * 0.36, 2);
      setCellProps(heroCta, k * 0.07, 6.6, 3, 1);
      flowers = [
        [Math.round(k * 0.4), 0, 'rose'],
        [k - 1, 6, 'hibiscus'],
        [Math.round(k * 0.43), 6, 'blue-cosmos'],
        [0, 3, 'sunflower']
      ];
    }

    if (heroGrid) {
      heroGrid.style.setProperty('--hero-font-scale', fontScale);
    }

    window.waveformHeroLayout = { flowers: flowers };
    window.dispatchEvent(new CustomEvent('herolayout', { detail: { flowers: flowers } }));
  }

  window.addEventListener('gridchange', function (e) {
    applyHeroLayout(e.detail || window.waveformGrid);
  });

  // Init layout
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      applyHeroLayout(window.waveformGrid);
    });
  } else {
    applyHeroLayout(window.waveformGrid);
  }

  // --- Typed Headline ---
  var heroTyped = document.getElementById('hero-typed');
  if (!heroTyped) return;

  var lineDivs = heroTyped.querySelectorAll('.line');
  if (lineDivs.length < 4) return;

  var caret = document.createElement('span');
  caret.className = 'type-caret';
  caret.setAttribute('aria-hidden', 'true');

  var currentPhraseIndex = 0;
  var currentCharIndex = 0;
  var state = 'type'; // 'type', 'hold', 'delete', 'pause'
  var timeoutId = null;
  var isHidden = document.hidden;
  var isIntersecting = true;

  function getTotalChars(phrase) {
    var total = 0;
    for (var i = 0; i < phrase.length; i++) {
      total += phrase[i].length;
    }
    return total;
  }

  function renderPhraseState(phrase, count) {
    var remaining = count;
    var lastActiveLine = 0;

    for (var i = 0; i < 4; i++) {
      var lineStr = phrase[i] || '';
      var lineLen = lineStr.length;
      var visibleLen = Math.min(lineLen, Math.max(0, remaining));
      lineDivs[i].textContent = lineStr.substring(0, visibleLen);
      remaining -= visibleLen;
      if (visibleLen > 0) {
        lastActiveLine = i;
      }
    }

    lineDivs[lastActiveLine].appendChild(caret);
  }

  function scheduleNextStep(delay) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(step, delay);
  }

  function step() {
    if (isHidden || !isIntersecting) {
      timeoutId = null;
      return;
    }

    var phrase = phrases[currentPhraseIndex];
    var totalChars = getTotalChars(phrase);

    if (state === 'type') {
      currentCharIndex++;
      renderPhraseState(phrase, currentCharIndex);
      window.dispatchEvent(new Event('hero:type'));

      if (currentCharIndex >= totalChars) {
        state = 'hold';
        scheduleNextStep(1900);
      } else {
        scheduleNextStep(95);
      }
    } else if (state === 'hold') {
      state = 'delete';
      scheduleNextStep(38);
    } else if (state === 'delete') {
      currentCharIndex--;
      renderPhraseState(phrase, currentCharIndex);

      if (currentCharIndex <= 0) {
        state = 'pause';
        scheduleNextStep(450);
      } else {
        scheduleNextStep(38);
      }
    } else if (state === 'pause') {
      currentPhraseIndex = (currentPhraseIndex + 1) % phrases.length;
      currentCharIndex = 0;
      state = 'type';
      scheduleNextStep(95);
    }
  }

  function renderPausedState() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    var fullPhrase = phrases[0];
    for (var i = 0; i < 4; i++) {
      lineDivs[i].textContent = fullPhrase[i] || '';
    }
    if (caret.parentNode) {
      caret.parentNode.removeChild(caret);
    }
  }

  function updateVisibility() {
    var isPaused = document.documentElement.dataset.motion === 'paused';
    if (isPaused) {
      renderPausedState();
      return;
    }

    var shouldRun = !document.hidden && isIntersecting;
    isHidden = document.hidden;

    if (shouldRun) {
      if (!timeoutId) {
        step();
      }
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  }

  window.addEventListener('motionchange', function () {
    var isPaused = document.documentElement.dataset.motion === 'paused';
    if (isPaused) {
      renderPausedState();
    } else {
      currentPhraseIndex = 0;
      currentCharIndex = 0;
      state = 'type';
      renderPhraseState(phrases[0], 0);
      scheduleNextStep(95);
    }
  });

  document.addEventListener('visibilitychange', updateVisibility);

  var heroGrid = document.getElementById('hero-grid');
  if (heroGrid && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        isIntersecting = entry.isIntersecting;
        updateVisibility();
      });
    }, { threshold: 0.05 });
    observer.observe(heroGrid);
  }

  // Start typing loop or render paused state based on initial motion state
  if (document.documentElement.dataset.motion === 'paused') {
    renderPausedState();
  } else {
    renderPhraseState(phrases[0], 0);
    scheduleNextStep(95);
  }
})();
