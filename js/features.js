(function () {
  'use strict';

  var FLOWER_KEYS = ['rose', 'hibiscus', 'blue-cosmos', 'sunflower'];
  var FLOWER_PATHS = {
    'rose': 'assets/flowers/rose.webp',
    'hibiscus': 'assets/flowers/Hibiscus.webp',
    'blue-cosmos': 'assets/flowers/blue-cosmos.webp',
    'sunflower': 'assets/flowers/sunflower.webp'
  };

  var loadedFlowerImages = {};
  var builtHalftones = {}; // key: flowerKey_size
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var st = {
    hasFile: false,
    flower: false
  };

  var animFrameId = null;
  var isGridIntersecting = true;
  var isHidden = document.hidden;

  // Cache DOM elements
  var featuresGrid = document.getElementById('features-grid');
  var featTitleUpload = document.getElementById('feat-title-upload');
  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');
  var featTitleStyle = document.getElementById('feat-title-style');
  var styleCards = document.getElementById('style-cards');
  var flowerOptions = document.getElementById('flower-options');
  var previewCell = document.getElementById('preview-cell');
  var renderCell = document.getElementById('render-cell');

  var linesBtn = document.querySelector('.style-card[data-style="lines"]');
  var flowerBtn = document.querySelector('.style-card[data-style="flower"]');
  var orbBtn = document.querySelector('.style-card[data-style="orb"]');

  var renderBtn = document.getElementById('renderBtn');
  var renderFlowerBtn = document.getElementById('renderFlowerBtn');
  var renderOrbBtn = document.getElementById('renderOrbBtn');

  var linesPreview = document.querySelector('.canvas-container');
  var flowerPreview = document.getElementById('flower-preview-container');
  var orbPreview = document.getElementById('orb-preview');

  function setCellPos(el, x, y, w, h) {
    if (!el) return;
    el.style.setProperty('--x', x);
    el.style.setProperty('--y', y);
    el.style.setProperty('--w', w);
    el.style.setProperty('--h', h);
  }

  function layoutFeatures(g, state) {
    if (!g || !featuresGrid) return;
    state = state || st;

    var cursor = 0;
    var endY = 0;

    if (g.narrow) {
      featuresGrid.style.setProperty('--hero-font-scale', '0.84');

      setCellPos(featTitleUpload, 0.05, 1, 6, 1);
      setCellPos(dropZone, 0.15, 2.15, 5.7, 2.7);
      setCellPos(featTitleStyle, 0.05, 5.2, 6, 1);

      setCellPos(linesBtn, 0.15, 6.5, 1.8, 1.8);
      setCellPos(flowerBtn, 2.1, 6.5, 1.8, 1.8);
      setCellPos(orbBtn, 4.05, 6.5, 1.8, 1.8);

      cursor = 8.5;

      if (state.flower) {
        setCellPos(flowerOptions, 0.15, cursor, 5.7, 1.2);
        cursor += 1.35;
      }

      setCellPos(previewCell, 0.15, cursor, 5.7, 5.7);
      if (state.hasFile) {
        cursor += 5.85;
      }

      setCellPos(renderCell, 0.15, cursor, 5.7, 0.85);
      endY = cursor + 0.85 + 0.4;
    } else {
      var k = g.cols;
      var cw = Math.round(k * 0.64);
      var size = Math.min(2.4, (cw - 0.9) / 3);
      var gap = (cw - 0.3 - 3 * size) / 2;

      featuresGrid.style.setProperty('--hero-font-scale', '0.9');

      setCellPos(featTitleUpload, 0.1, 0.25, cw, 1);
      setCellPos(dropZone, 0.15, 1.35, cw - 0.3, 2.4);
      setCellPos(featTitleStyle, 0.1, 4, cw, 1);

      setCellPos(linesBtn, 0.15, 5.2, size, size);
      setCellPos(flowerBtn, 0.15 + size + gap, 5.2, size, size);
      setCellPos(orbBtn, 0.15 + 2 * (size + gap), 5.2, size, size);

      var rx = cw + 0.3;
      var rw = k - cw - 0.6;
      cursor = 1.35;

      setCellPos(previewCell, rx, cursor, rw, rw);
      if (state.hasFile) {
        cursor += rw + 0.15;
      }

      if (state.flower) {
        setCellPos(flowerOptions, rx, cursor, rw, 1.2);
        cursor += 1.35;
      }

      var renderY = Math.max(cursor, 5.2 + size - 0.85);
      setCellPos(renderCell, rx, renderY, rw, 0.85);
      endY = renderY + 0.85 + 0.4;
    }

    var frows = Math.max(g.rows, Math.ceil(endY));
    featuresGrid.style.setProperty('--frows', frows);

    // Resize card canvases after layout
    resizeCardCanvases();
  }

  function cardLevel(t) {
    return Math.min(1, Math.max(0, Math.sin(t * 2.3) * Math.sin(t * 0.9 + 1)) * 0.7 + 0.18 + 0.06 * Math.sin(t * 9));
  }

  function drawLinesCard(cx, size, t, lvl) {
    var N = 13, gap = size * 0.08, bw = (size * 0.8 - gap * (N - 1)) / N, cy = size * 0.45;
    var gr = cx.createLinearGradient(0, size * 0.15, 0, size * 0.75);
    gr.addColorStop(0, '#7aa2ff'); gr.addColorStop(1, '#b04dff');
    cx.fillStyle = gr; cx.shadowColor = '#6d6bff'; cx.shadowBlur = size * 0.06;
    for (var i = 0; i < N; i++) {
      var u = (i / (N - 1)) * 2 - 1, env = Math.exp(-u * u * 2.2);
      var v = 0.5 + 0.5 * Math.sin(i * 0.9 - t * 5 + Math.sin(i * 0.3 + t) * 2);
      var bh = size * 0.05 + size * 0.5 * env * lvl * (0.3 + 0.7 * v);
      cx.beginPath();
      if (cx.roundRect) {
        cx.roundRect(size * 0.1 + i * (bw + gap), cy - bh / 2, bw, bh, bw / 2);
      } else {
        cx.rect(size * 0.1 + i * (bw + gap), cy - bh / 2, bw, bh);
      }
      cx.fill();
    }
    cx.shadowBlur = 0;
  }

  function drawOrbCard(cx, size, t, lvl) {
    var R = size * 0.3 * (1 + lvl * 0.07), X = size / 2, Y = size * 0.45;
    cx.save();
    cx.shadowColor = 'rgba(255,120,160,' + (0.25 + lvl * 0.3) + ')'; cx.shadowBlur = size * 0.12;
    var g = cx.createRadialGradient(X - R * 0.3, Y + R * 0.3, R * 0.05, X, Y, R);
    g.addColorStop(0, '#0a0514'); g.addColorStop(0.6, '#1b0f3d'); g.addColorStop(0.88, '#6a3ab8'); g.addColorStop(1, '#ff9a6a');
    cx.fillStyle = g; cx.beginPath(); cx.arc(X, Y, R, 0, 6.2832); cx.fill();
    cx.restore();
    cx.save();
    cx.beginPath(); cx.arc(X, Y, R, 0, 6.2832); cx.clip();
    cx.globalCompositeOperation = 'lighter';
    g = cx.createRadialGradient(X - R * 0.45, Y + R * 0.45, 0, X - R * 0.45, Y + R * 0.45, R * 2);
    g.addColorStop(0, 'rgba(80,140,255,0)'); g.addColorStop(0.55, 'rgba(80,140,255,0)'); g.addColorStop(0.82, 'rgba(80,140,255,0.6)'); g.addColorStop(1, 'rgba(80,140,255,0.6)');
    cx.fillStyle = g; cx.fillRect(0, 0, size, size);
    cx.restore();
    cx.strokeStyle = 'rgba(255,255,255,0.55)'; cx.lineWidth = size * 0.012; cx.lineCap = 'round';
    cx.beginPath(); cx.arc(X, Y, R * 0.93, Math.PI * 1.05, Math.PI * 1.4); cx.stroke();
  }

  function loadFlowerImages() {
    FLOWER_KEYS.forEach(function (key) {
      var img = new Image();
      img.src = FLOWER_PATHS[key];
      img.onload = function () {
        loadedFlowerImages[key] = img;
      };
    });
  }

  function resizeCardCanvases() {
    var cards = [linesBtn, flowerBtn, orbBtn];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    cards.forEach(function (card) {
      if (!card) return;
      var canvas = card.querySelector('canvas');
      if (!canvas) return;

      var rect = card.getBoundingClientRect();
      var w = rect.width || 100;
      var h = rect.height || 100;

      var pw = Math.round(w * dpr);
      var ph = Math.round(h * dpr);

      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
    });
  }

  function renderCardFrames(t) {
    var cards = [
      { btn: linesBtn, style: 'lines' },
      { btn: flowerBtn, style: 'flower' },
      { btn: orbBtn, style: 'orb' }
    ];

    var lvl = cardLevel(t);

    cards.forEach(function (item) {
      if (!item.btn) return;
      var canvas = item.btn.querySelector('canvas');
      if (!canvas || !canvas.width || !canvas.height) return;

      var cx = canvas.getContext('2d');
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var size = canvas.width / dpr;
      cx.clearRect(0, 0, size, size);

      if (item.style === 'lines') {
        drawLinesCard(cx, size, t, lvl);
      } else if (item.style === 'orb') {
        drawOrbCard(cx, size, t, lvl);
      } else if (item.style === 'flower') {
        var idx = prefersReducedMotion ? 0 : Math.floor(t / 2.5) % 4;
        var key = FLOWER_KEYS[idx];
        var img = loadedFlowerImages[key];

        if (img && window.WaveformHalftone) {
          var box = size * 0.72;
          var d = Math.max(3, Math.round(size * 0.03));
          var cacheKey = key + '_' + Math.round(box) + '_' + d;

          if (!builtHalftones[cacheKey]) {
            builtHalftones[cacheKey] = window.WaveformHalftone.build(img, box, d);
          }

          var built = builtHalftones[cacheKey];
          if (built) {
            window.WaveformHalftone.draw(cx, built, size / 2, size * 0.45, t, 0, 0, idx * 1.7);
          }
        }
      }
    });
  }

  function loop(timestamp) {
    if (isHidden || !isGridIntersecting) {
      animFrameId = null;
      return;
    }

    var t = timestamp / 1000;
    renderCardFrames(t);

    if (!prefersReducedMotion) {
      animFrameId = requestAnimationFrame(loop);
    }
  }

  function startLoop() {
    if (!animFrameId && !isHidden && isGridIntersecting) {
      if (prefersReducedMotion) {
        renderCardFrames(2);
      } else {
        animFrameId = requestAnimationFrame(loop);
      }
    }
  }

  function stopLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  function updateVisibility() {
    isHidden = document.hidden;
    var shouldRun = !isHidden && isGridIntersecting;
    if (shouldRun) {
      startLoop();
    } else {
      stopLoop();
    }
  }

  function checkFileState() {
    var hasFile = (fileInput && fileInput.files && fileInput.files.length > 0) || !!window.workingAudioBuffer;
    st.hasFile = hasFile;

    if (dropZone) {
      dropZone.classList.toggle('has-file', hasFile);
    }
    if (previewCell) {
      previewCell.classList.toggle('has-file', hasFile);
    }

    if (window.waveformGrid) {
      layoutFeatures(window.waveformGrid, st);
    }
  }

  function selectStyle(style) {
    var isFlower = (style === 'flower');
    st.flower = isFlower;

    if (linesBtn) linesBtn.setAttribute('aria-pressed', style === 'lines' ? 'true' : 'false');
    if (flowerBtn) flowerBtn.setAttribute('aria-pressed', style === 'flower' ? 'true' : 'false');
    if (orbBtn) orbBtn.setAttribute('aria-pressed', style === 'orb' ? 'true' : 'false');

    if (renderBtn) renderBtn.hidden = (style !== 'lines');
    if (renderFlowerBtn) renderFlowerBtn.hidden = (style !== 'flower');
    if (renderOrbBtn) renderOrbBtn.hidden = (style !== 'orb');

    if (flowerOptions) {
      flowerOptions.hidden = !isFlower;
    }

    if (linesPreview) {
      linesPreview.classList.toggle('is-inactive', style !== 'lines');
    }
    if (flowerPreview) {
      flowerPreview.classList.toggle('is-inactive', style !== 'flower');
    }
    if (orbPreview) {
      orbPreview.classList.toggle('is-inactive', style !== 'orb');
    }

    if (window.waveformGrid) {
      layoutFeatures(window.waveformGrid, st);
    }

    window.dispatchEvent(new CustomEvent('stylechange', { detail: { style: style } }));
  }

  // Setup style card listeners
  [linesBtn, flowerBtn, orbBtn].forEach(function (card) {
    if (!card) return;
    var style = card.dataset.style;
    card.addEventListener('click', function () {
      selectStyle(style);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectStyle(style);
      }
    });
  });

  // File input & dropzone listeners to update state
  if (fileInput) {
    fileInput.addEventListener('change', checkFileState);
  }
  if (dropZone) {
    dropZone.addEventListener('drop', function () {
      setTimeout(checkFileState, 50);
    });
  }

  window.addEventListener('gridchange', function () {
    if (window.waveformGrid) {
      layoutFeatures(window.waveformGrid, st);
    }
  });

  document.addEventListener('visibilitychange', updateVisibility);

  if (featuresGrid && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        isGridIntersecting = entry.isIntersecting;
        updateVisibility();
      });
    }, { threshold: 0.05 });
    observer.observe(featuresGrid);
  }

  // Init
  loadFlowerImages();

  function initFeatures() {
    checkFileState();
    if (window.waveformGrid) {
      layoutFeatures(window.waveformGrid, st);
    }
    startLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeatures);
  } else {
    initFeatures();
  }

  window.layoutFeatures = layoutFeatures;
  window.cardLevel = cardLevel;
})();
