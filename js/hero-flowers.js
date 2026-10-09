(function () {
  'use strict';

  var FLOWER_IMAGES = {
    'rose': 'assets/flowers/rose.webp',
    'hibiscus': 'assets/flowers/Hibiscus.webp',
    'blue-cosmos': 'assets/flowers/blue-cosmos.webp',
    'sunflower': 'assets/flowers/sunflower.webp'
  };

  var loadedImages = {};
  var isImagesLoaded = false;
  var isReadyFired = false;

  var canvas = document.getElementById('hero-flowers');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var pulse = 0;
  var pointerX = -9999;
  var pointerY = -9999;
  var pointerStrength = 0;

  var isHidden = document.hidden;
  var isIntersecting = true;
  var animFrameId = null;
  var lastTime = 0;

  var flowerDataList = [];

  function smoothstep(min, max, value) {
    var x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  function loadImages(callback) {
    var keys = Object.keys(FLOWER_IMAGES);
    var remaining = keys.length;

    keys.forEach(function (key) {
      var img = new Image();
      img.src = FLOWER_IMAGES[key];
      img.onload = function () {
        loadedImages[key] = img;
        remaining--;
        if (remaining === 0) {
          isImagesLoaded = true;
          callback();
        }
      };
      img.onerror = function () {
        // Fallback if webp fails or loading error
        remaining--;
        if (remaining === 0) {
          isImagesLoaded = true;
          callback();
        }
      };
    });
  }

  function processFlower(img, col, row, S, flowerIndex) {
    if (!img) return null;

    var box = S * 0.9;
    var d = Math.max(3, Math.round(S * 0.045));
    var cellCenterX = (col + 0.5) * S;
    var cellCenterY = (row + 0.5) * S;

    var built = window.WaveformHalftone ? window.WaveformHalftone.build(img, box, d) : null;
    if (!built) return null;

    return {
      cellCenterX: cellCenterX,
      cellCenterY: cellCenterY,
      flowerIndex: flowerIndex,
      built: built
    };
  }

  function rebuildFlowers() {
    if (!isImagesLoaded) return;

    var heroGrid = document.getElementById('hero-grid');
    if (!heroGrid) return;

    var gridRect = heroGrid.getBoundingClientRect();
    var cssW = gridRect.width || heroGrid.clientWidth;
    var cssH = gridRect.height || heroGrid.clientHeight;

    if (!cssW || !cssH) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    var layout = window.waveformHeroLayout;
    var g = window.waveformGrid;
    if (!layout || !layout.flowers || !g) return;

    flowerDataList = [];
    layout.flowers.forEach(function (f, idx) {
      var col = f[0], row = f[1], key = f[2];
      var img = loadedImages[key];
      var data = processFlower(img, col, row, g.S, idx);
      if (data) flowerDataList.push(data);
    });

    drawFrame(prefersReducedMotion ? 3 : (performance.now() / 1000));

    if (!isReadyFired) {
      isReadyFired = true;
      canvas.classList.add('is-ready');
    }
  }

  function drawFrame(t) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var gridW = canvas.width / dpr;
    var gridH = canvas.height / dpr;
    ctx.clearRect(0, 0, gridW, gridH);

    var g = window.waveformGrid;
    var S = g ? g.S : 60;

    flowerDataList.forEach(function (flower) {
      var dx = pointerX - flower.cellCenterX;
      var dy = pointerY - flower.cellCenterY;
      var distSq = dx * dx + dy * dy;
      var radiusRef = S * 2.6;
      var near = Math.exp(-distSq / (radiusRef * radiusRef)) * pointerStrength;

      if (window.WaveformHalftone) {
        window.WaveformHalftone.draw(
          ctx,
          flower.built,
          flower.cellCenterX,
          flower.cellCenterY,
          t,
          pulse,
          near,
          flower.flowerIndex * 1.7
        );
      }
    });
  }

  function tick(timestamp) {
    if (isHidden || !isIntersecting) {
      animFrameId = null;
      return;
    }

    if (!lastTime) lastTime = timestamp;
    var dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (dt > 0.1) dt = 0.1; // clamp dt spike

    pulse = pulse * Math.pow(0.93, dt * 60);
    pointerStrength = Math.max(0, pointerStrength - 0.01);

    drawFrame(timestamp / 1000);

    animFrameId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (prefersReducedMotion) return;
    if (!animFrameId && !isHidden && isIntersecting && isImagesLoaded) {
      lastTime = 0;
      animFrameId = requestAnimationFrame(tick);
    }
  }

  function stopLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  window.addEventListener('hero:type', function () {
    pulse = 1;
  });

  window.addEventListener('pointermove', function (e) {
    var rect = canvas.getBoundingClientRect();
    pointerX = e.clientX - rect.left;
    pointerY = e.clientY - rect.top;
    pointerStrength = 1;
  });

  window.addEventListener('herolayout', function () {
    rebuildFlowers();
  });

  function updateVisibility() {
    isHidden = document.hidden;
    var shouldRun = !isHidden && isIntersecting;

    if (shouldRun) {
      startLoop();
    } else {
      stopLoop();
    }
  }

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

  // Start image loading inside requestIdleCallback
  function startInit() {
    loadImages(function () {
      rebuildFlowers();
      if (!prefersReducedMotion) {
        startLoop();
      }
    });
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(startInit);
  } else {
    setTimeout(startInit, 200);
  }
})();
