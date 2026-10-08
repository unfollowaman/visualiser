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
    var n = Math.max(8, Math.round(box / d));

    var cellCenterX = (col + 0.5) * S;
    var cellCenterY = (row + 0.5) * S;

    // 1) Offscreen 128x128
    var off128 = document.createElement('canvas');
    off128.width = 128;
    off128.height = 128;
    var ctx128 = off128.getContext('2d');
    ctx128.drawImage(img, 0, 0, 128, 128);
    var imgData128 = ctx128.getImageData(0, 0, 128, 128);
    var data128 = imgData128.data;

    var minX = 128, minY = 128, maxX = -1, maxY = -1;
    for (var y = 0; y < 128; y++) {
      for (var x = 0; x < 128; x++) {
        var idx = (y * 128 + x) * 4;
        var maxRGB = Math.max(data128[idx], data128[idx + 1], data128[idx + 2]);
        if (maxRGB >= 40) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      minX = 0; minY = 0; maxX = 127; maxY = 127;
    }

    var bw = maxX - minX + 1;
    var bh = maxY - minY + 1;
    var x0 = minX - 0.04 * bw;
    var x1 = maxX + 0.04 * bw;
    var y0 = minY - 0.04 * bh;
    var y1 = maxY + 0.04 * bh;

    var wExp = x1 - x0;
    var hExp = y1 - y0;
    var side = Math.max(wExp, hExp);

    var cx = (x0 + x1) / 2;
    var cy = (y0 + y1) / 2;

    var squareX0 = cx - side / 2;
    var squareY0 = cy - side / 2;

    var sx = Math.max(0, Math.min(128 - side, squareX0));
    var sy = Math.max(0, Math.min(128 - side, squareY0));
    var sSize = Math.min(side, 128 - sx, 128 - sy);

    // 2) Draw cropped square into n x n offscreen canvas
    var offN = document.createElement('canvas');
    offN.width = n;
    offN.height = n;
    var ctxN = offN.getContext('2d');
    ctxN.imageSmoothingQuality = 'high';
    ctxN.drawImage(off128, sx, sy, sSize, sSize, 0, 0, n, n);
    var imgDataN = ctxN.getImageData(0, 0, n, n);
    var dataN = imgDataN.data;

    // 3) Group dots into buckets by quantized color
    var bucketsMap = {};

    for (var iy = 0; iy < n; iy++) {
      for (var ix = 0; ix < n; ix++) {
        var pIdx = (iy * n + ix) * 4;
        var r = dataN[pIdx];
        var g = dataN[pIdx + 1];
        var b = dataN[pIdx + 2];

        var lum = Math.max(r, g, b) / 255;
        var m = smoothstep(0.06, 0.16, lum);
        if (m <= 0.02) continue;

        var base = d * 0.55 * m * (0.6 + 0.4 * lum);
        var dotX = cellCenterX - box / 2 + (ix + 0.5) * d;
        var dotY = cellCenterY - box / 2 + (iy + 0.5) * d;

        var rQ = ((r >> 5) << 5) + 16;
        var gQ = ((g >> 5) << 5) + 16;
        var bQ = ((b >> 5) << 5) + 16;
        var colorKey = 'rgb(' + rQ + ',' + gQ + ',' + bQ + ')';

        var w0 = ix * 0.11 + iy * 0.08;

        if (!bucketsMap[colorKey]) {
          bucketsMap[colorKey] = [];
        }
        bucketsMap[colorKey].push(dotX, dotY, base, w0);
      }
    }

    var buckets = [];
    Object.keys(bucketsMap).forEach(function (colorKey) {
      var raw = bucketsMap[colorKey];
      var count = raw.length / 4;
      var xArr = new Float32Array(count);
      var yArr = new Float32Array(count);
      var baseArr = new Float32Array(count);
      var w0Arr = new Float32Array(count);

      for (var i = 0; i < count; i++) {
        xArr[i] = raw[i * 4];
        yArr[i] = raw[i * 4 + 1];
        baseArr[i] = raw[i * 4 + 2];
        w0Arr[i] = raw[i * 4 + 3];
      }

      buckets.push({
        color: colorKey,
        count: count,
        x: xArr,
        y: yArr,
        base: baseArr,
        w0: w0Arr
      });
    });

    return {
      cellCenterX: cellCenterX,
      cellCenterY: cellCenterY,
      d: d,
      flowerIndex: flowerIndex,
      buckets: buckets
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

      flower.buckets.forEach(function (bucket) {
        var path = new Path2D();
        var count = bucket.count;
        var d = flower.d;
        var flowerIndex = flower.flowerIndex;

        for (var i = 0; i < count; i++) {
          var bx = bucket.x[i];
          var by = bucket.y[i];
          var bBase = bucket.base[i];
          var bw0 = bucket.w0[i];

          var wave = Math.sin(bw0 - t * 1.6 + flowerIndex * 1.7);
          var scale = 1 + 0.16 * wave * (1 + 1.2 * near + 1.5 * pulse);
          var r = Math.min(d * 0.62, bBase * scale);

          if (r > 0.1) {
            path.moveTo(bx + r, by);
            path.arc(bx, by, r, 0, 6.283185307179586);
          }
        }

        ctx.fillStyle = bucket.color;
        ctx.fill(path);
      });
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
