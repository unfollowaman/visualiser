(function () {
  'use strict';

  function smoothstep(min, max, value) {
    var x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  function build(img, box, d) {
    if (!img) return null;

    var n = Math.max(8, Math.round(box / d));

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
        var rx = -box / 2 + (ix + 0.5) * d;
        var ry = -box / 2 + (iy + 0.5) * d;

        var rQ = ((r >> 5) << 5) + 16;
        var gQ = ((g >> 5) << 5) + 16;
        var bQ = ((b >> 5) << 5) + 16;
        var colorKey = 'rgb(' + rQ + ',' + gQ + ',' + bQ + ')';

        var w0 = ix * 0.11 + iy * 0.08;

        if (!bucketsMap[colorKey]) {
          bucketsMap[colorKey] = [];
        }
        bucketsMap[colorKey].push(rx, ry, base, w0);
      }
    }

    var buckets = [];
    Object.keys(bucketsMap).forEach(function (colorKey) {
      var raw = bucketsMap[colorKey];
      var count = raw.length / 4;
      var rxArr = new Float32Array(count);
      var ryArr = new Float32Array(count);
      var baseArr = new Float32Array(count);
      var w0Arr = new Float32Array(count);

      for (var i = 0; i < count; i++) {
        rxArr[i] = raw[i * 4];
        ryArr[i] = raw[i * 4 + 1];
        baseArr[i] = raw[i * 4 + 2];
        w0Arr[i] = raw[i * 4 + 3];
      }

      buckets.push({
        color: colorKey,
        count: count,
        rx: rxArr,
        ry: ryArr,
        base: baseArr,
        w0: w0Arr
      });
    });

    return {
      d: d,
      buckets: buckets
    };
  }

  function draw(cx, built, cxCenter, cyCenter, t, pulse, near, phaseOffset) {
    if (!built || !built.buckets) return;

    var d = built.d;
    var pOffset = phaseOffset || 0;
    var pVal = pulse || 0;
    var nVal = near || 0;

    built.buckets.forEach(function (bucket) {
      var path = new Path2D();
      var count = bucket.count;

      for (var i = 0; i < count; i++) {
        var bx = cxCenter + bucket.rx[i];
        var by = cyCenter + bucket.ry[i];
        var bBase = bucket.base[i];
        var bw0 = bucket.w0[i];

        var wave = Math.sin(bw0 - t * 1.6 + pOffset);
        var scale = 1 + 0.16 * wave * (1 + 1.2 * nVal + 1.5 * pVal);
        var r = Math.min(d * 0.62, bBase * scale);

        if (r > 0.1) {
          path.moveTo(bx + r, by);
          path.arc(bx, by, r, 0, 6.283185307179586);
        }
      }

      cx.fillStyle = bucket.color;
      cx.fill(path);
    });
  }

  window.WaveformHalftone = {
    build: build,
    draw: draw
  };
})();
