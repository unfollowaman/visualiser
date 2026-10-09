(function () {
  'use strict';

  // Pure function drawOrbFrame as specified in instructions
  function drawOrbFrame(cx, size, t, f, onsets) {
    const X = size / 2, Y = size / 2;
    const R = size * 0.27 * (1 + 0.14 * f.bass + 0.05 * f.level);
    cx.globalCompositeOperation = 'source-over';
    cx.fillStyle = '#000000'; cx.fillRect(0, 0, size, size);
    let g = cx.createRadialGradient(X, Y, R * 0.8, X, Y, R * 2.1);
    const ga = 0.14 + 0.38 * f.level;
    g.addColorStop(0, 'rgba(255,120,160,' + ga.toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,120,160,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, size, size);
    for (let k = 0; k < onsets.length; k++) {
      const p = (t - onsets[k]) / 1.2;
      if (p < 0 || p > 1) continue;
      const e = 1 - (1 - p) * (1 - p);
      cx.strokeStyle = 'rgba(255,170,200,' + (0.5 * (1 - p) * (1 - p)).toFixed(3) + ')';
      cx.lineWidth = size * 0.004 * (1 - p) + 1;
      cx.beginPath(); cx.arc(X, Y, R * (1.05 + 0.85 * e), 0, 6.2832); cx.stroke();
    }
    const N = 96;
    const blob = function () {
      cx.beginPath();
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * 6.2832;
        const r = R * (1 + 0.045 * f.mid * Math.sin(3 * th + t * 1.4) + 0.03 * f.treble * Math.sin(7 * th - t * 2.1) + 0.012 * Math.sin(2 * th + t * 0.6));
        const x = X + Math.cos(th) * r, y = Y + Math.sin(th) * r;
        if (i) cx.lineTo(x, y); else cx.moveTo(x, y);
      }
      cx.closePath();
    };
    g = cx.createRadialGradient(X - R * 0.3, Y + R * 0.3, R * 0.05, X, Y, R * 1.05);
    g.addColorStop(0, '#0a0514'); g.addColorStop(0.6, '#1b0f3d'); g.addColorStop(0.88, '#6a3ab8'); g.addColorStop(1, '#ff9a6a');
    blob(); cx.fillStyle = g; cx.fill();
    cx.save();
    blob(); cx.clip();
    cx.globalCompositeOperation = 'lighter';
    g = cx.createRadialGradient(X - R * 0.45, Y + R * 0.45, 0, X - R * 0.45, Y + R * 0.45, R * 2);
    g.addColorStop(0, 'rgba(80,140,255,0)'); g.addColorStop(0.55, 'rgba(80,140,255,0)'); g.addColorStop(0.82, 'rgba(80,140,255,0.6)'); g.addColorStop(1, 'rgba(80,140,255,0.6)');
    cx.fillStyle = g; cx.fillRect(0, 0, size, size);
    cx.restore();
    cx.globalCompositeOperation = 'source-over';
    cx.strokeStyle = 'rgba(255,255,255,0.55)'; cx.lineWidth = size * 0.012; cx.lineCap = 'round';
    cx.beginPath(); cx.arc(X, Y, R * 0.93, Math.PI * 1.05, Math.PI * 1.4); cx.stroke();
  }

  window.drawOrbFrame = drawOrbFrame;

  // Standard iterative radix-2 FFT (40 lines)
  function fftRadix2(re, im) {
    var n = re.length;
    var j = 0;
    for (var i = 0; i < n - 1; i++) {
      if (i < j) {
        var tr = re[i]; re[i] = re[j]; re[j] = tr;
        var ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
      var k = n >> 1;
      while (k <= j) { j -= k; k >>= 1; }
      j += k;
    }
    for (var len = 2; len <= n; len <<= 1) {
      var halfLen = len >> 1;
      var angle = -2 * Math.PI / len;
      var wstepR = Math.cos(angle);
      var wstepI = Math.sin(angle);
      for (var i = 0; i < n; i += len) {
        var wR = 1, wI = 0;
        for (var k = 0; k < halfLen; k++) {
          var pos = i + k;
          var match = pos + halfLen;
          var uR = re[pos], uI = im[pos];
          var vR = re[match] * wR - im[match] * wI;
          var vI = re[match] * wI + im[match] * wR;
          re[pos] = uR + vR; im[pos] = uI + vI;
          re[match] = uR - vR; im[match] = uI - vI;
          var nextWR = wR * wstepR - wI * wstepI;
          var nextWI = wR * wstepI + wI * wstepR;
          wR = nextWR; wI = nextWI;
        }
      }
    }
  }

  // Pre-computed Hann window for size 2048
  var fftSize = 2048;
  var hannWindow = new Float32Array(fftSize);
  for (var i = 0; i < fftSize; i++) {
    hannWindow[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
  }

  // Helper to mix audioBuffer to mono Float32Array
  function mixToMono(audioBuffer) {
    if (!audioBuffer) return new Float32Array(0);
    var numChannels = audioBuffer.numberOfChannels;
    var totalSamples = audioBuffer.length;
    if (numChannels === 1) {
      return audioBuffer.getChannelData(0);
    }
    var mono = new Float32Array(totalSamples);
    var c0 = audioBuffer.getChannelData(0);
    var c1 = audioBuffer.getChannelData(1);
    for (var s = 0; s < totalSamples; s++) {
      mono[s] = (c0[s] + c1[s]) * 0.5;
    }
    return mono;
  }

  // Calculate 95th percentile helper
  function getPercentile95(arr) {
    if (!arr || arr.length === 0) return 0;
    var sorted = Array.from(arr).sort(function (a, b) { return a - b; });
    var idx = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(idx, sorted.length - 1)];
  }

  var analysisCache = new WeakMap();

  async function analyzeOrbAudio(audioBuffer) {
    if (!audioBuffer) return null;
    if (analysisCache.has(audioBuffer)) {
      return analysisCache.get(audioBuffer);
    }

    var sampleRate = audioBuffer.sampleRate;
    var duration = audioBuffer.duration;
    var mono = mixToMono(audioBuffer);
    var totalSamples = mono.length;

    var fps = 60;
    var hopSamples = sampleRate / fps;
    var totalHops = Math.ceil(duration * fps);

    var rawLevel = new Float32Array(totalHops);
    var rawBass = new Float32Array(totalHops);
    var rawMid = new Float32Array(totalHops);
    var rawTreble = new Float32Array(totalHops);

    var re = new Float32Array(fftSize);
    var im = new Float32Array(fftSize);

    var chunkSize = 100;
    var currentHop = 0;

    while (currentHop < totalHops) {
      var endHop = Math.min(totalHops, currentHop + chunkSize);

      for (var h = currentHop; h < endHop; h++) {
        var centerSample = Math.floor(h * hopSamples);
        var startSample = centerSample - (fftSize >> 1);

        var sumSq = 0;
        for (var k = 0; k < fftSize; k++) {
          var sampleIdx = startSample + k;
          var val = (sampleIdx >= 0 && sampleIdx < totalSamples) ? mono[sampleIdx] : 0;
          sumSq += val * val;
          re[k] = val * hannWindow[k];
          im[k] = 0;
        }

        rawLevel[h] = Math.sqrt(sumSq / fftSize);

        fftRadix2(re, im);

        // Bin frequencies: bin * sampleRate / 2048
        // Bass: 30 to 150 Hz -> binRange
        var minBassBin = Math.max(0, Math.floor(30 * fftSize / sampleRate));
        var maxBassBin = Math.min(fftSize / 2, Math.ceil(150 * fftSize / sampleRate));

        var minMidBin = Math.max(0, Math.floor(150 * fftSize / sampleRate));
        var maxMidBin = Math.min(fftSize / 2, Math.ceil(2000 * fftSize / sampleRate));

        var minTrebleBin = Math.max(0, Math.floor(2000 * fftSize / sampleRate));
        var maxTrebleBin = Math.min(fftSize / 2, Math.ceil(8000 * fftSize / sampleRate));

        var bassSum = 0, bassCount = 0;
        for (var b = minBassBin; b <= maxBassBin; b++) {
          bassSum += Math.sqrt(re[b] * re[b] + im[b] * im[b]) / fftSize;
          bassCount++;
        }
        rawBass[h] = bassCount > 0 ? bassSum / bassCount : 0;

        var midSum = 0, midCount = 0;
        for (var m = minMidBin; m <= maxMidBin; m++) {
          midSum += Math.sqrt(re[m] * re[m] + im[m] * im[m]) / fftSize;
          midCount++;
        }
        rawMid[h] = midCount > 0 ? midSum / midCount : 0;

        var trebleSum = 0, trebleCount = 0;
        for (var tr = minTrebleBin; tr <= maxTrebleBin; tr++) {
          trebleSum += Math.sqrt(re[tr] * re[tr] + im[tr] * im[tr]) / fftSize;
          trebleCount++;
        }
        rawTreble[h] = trebleCount > 0 ? trebleSum / trebleCount : 0;
      }

      currentHop = endHop;
      if (currentHop < totalHops) {
        await new Promise(function (resolve) { setTimeout(resolve, 0); });
      }
    }

    // Percentile 95 normalization
    var p95Level = getPercentile95(rawLevel);
    var p95Bass = getPercentile95(rawBass);
    var p95Mid = getPercentile95(rawMid);
    var p95Treble = getPercentile95(rawTreble);

    var normLevel = new Float32Array(totalHops);
    var normBass = new Float32Array(totalHops);
    var normMid = new Float32Array(totalHops);
    var normTreble = new Float32Array(totalHops);

    for (var i = 0; i < totalHops; i++) {
      normLevel[i] = p95Level > 0 ? Math.min(1, rawLevel[i] / p95Level) : 0;
      normBass[i] = p95Bass > 0 ? Math.min(1, rawBass[i] / p95Bass) : 0;
      normMid[i] = p95Mid > 0 ? Math.min(1, rawMid[i] / p95Mid) : 0;
      normTreble[i] = p95Treble > 0 ? Math.min(1, rawTreble[i] / p95Treble) : 0;
    }

    // Onset detection on normalized unsmoothed bass series normBass
    var onsets = [];
    var lastOnsetSec = -1;
    var lookbackFrames = Math.round(0.5 * fps); // 30 frames for 0.5s

    for (var i = 0; i < totalHops; i++) {
      var tSec = i / fps;
      var bVal = normBass[i];

      // Mean over previous 0.5s
      var startF = Math.max(0, i - lookbackFrames);
      var sumPrev = 0, countPrev = 0;
      for (var p = startF; p < i; p++) {
        sumPrev += normBass[p];
        countPrev++;
      }
      var meanPrev = countPrev > 0 ? sumPrev / countPrev : 0;

      var condThreshold = bVal > 1.35 * meanPrev + 0.08;
      var condIncreasing = (i > 0) && (bVal > normBass[i - 1]);
      var condTime = (tSec - lastOnsetSec) >= 0.18;

      if (condThreshold && condIncreasing && condTime) {
        onsets.push(tSec);
        lastOnsetSec = tSec;
      }
    }

    // Envelope follower smoothing
    var smoothLevel = new Float32Array(totalHops);
    var smoothBass = new Float32Array(totalHops);
    var smoothMid = new Float32Array(totalHops);
    var smoothTreble = new Float32Array(totalHops);

    var dt = 1 / fps;
    var tauAttack = 0.04;
    var tauRelease = 0.25;

    var alphaAttack = 1 - Math.exp(-dt / tauAttack);
    var alphaRelease = 1 - Math.exp(-dt / tauRelease);

    function smoothSeries(normArr, smoothArr) {
      if (normArr.length === 0) return;
      smoothArr[0] = normArr[0];
      for (var i = 1; i < normArr.length; i++) {
        var x = normArr[i];
        var prev = smoothArr[i - 1];
        var alpha = x > prev ? alphaAttack : alphaRelease;
        smoothArr[i] = prev + (x - prev) * alpha;
      }
    }

    smoothSeries(normLevel, smoothLevel);
    smoothSeries(normBass, smoothBass);
    smoothSeries(normMid, smoothMid);
    smoothSeries(normTreble, smoothTreble);

    function features(t) {
      if (totalHops === 0) {
        return { level: 0, bass: 0, mid: 0, treble: 0 };
      }
      var frameFloat = t * fps;
      if (frameFloat <= 0) {
        return {
          level: smoothLevel[0],
          bass: smoothBass[0],
          mid: smoothMid[0],
          treble: smoothTreble[0]
        };
      }
      if (frameFloat >= totalHops - 1) {
        var last = totalHops - 1;
        return {
          level: smoothLevel[last],
          bass: smoothBass[last],
          mid: smoothMid[last],
          treble: smoothTreble[last]
        };
      }
      var idx0 = Math.floor(frameFloat);
      var idx1 = idx0 + 1;
      var frac = frameFloat - idx0;

      return {
        level: smoothLevel[idx0] + (smoothLevel[idx1] - smoothLevel[idx0]) * frac,
        bass: smoothBass[idx0] + (smoothBass[idx1] - smoothBass[idx0]) * frac,
        mid: smoothMid[idx0] + (smoothMid[idx1] - smoothMid[idx0]) * frac,
        treble: smoothTreble[idx0] + (smoothTreble[idx1] - smoothTreble[idx0]) * frac
      };
    }

    var result = {
      totalFrames: totalHops,
      features: features,
      onsets: onsets,
      duration: duration
    };

    analysisCache.set(audioBuffer, result);
    return result;
  }

  // Preview management
  var orbCanvas = document.getElementById('orb-preview');
  var isOrbSelected = false;
  var isOrbVisible = true;
  var isPageHidden = document.hidden;
  var animFrameId = null;
  var currentAnalysis = null;
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function cardLevelFallback(t) {
    if (typeof window.cardLevel === 'function') {
      return window.cardLevel(t);
    }
    return Math.min(1, Math.max(0, Math.sin(t * 2.3) * Math.sin(t * 0.9 + 1)) * 0.7 + 0.18 + 0.06 * Math.sin(t * 9));
  }

  function getIdleFeatures(t) {
    var cLvl = cardLevelFallback(t);
    return {
      level: cLvl,
      bass: cLvl * 0.8,
      mid: 0.4 + 0.3 * Math.sin(t * 1.3),
      treble: 0.3 + 0.2 * Math.sin(t * 2.1)
    };
  }

  function syncCanvasSize() {
    if (!orbCanvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = orbCanvas.getBoundingClientRect();
    var cssW = rect.width || 300;
    var cssH = rect.height || 300;
    var targetSize = Math.round(Math.min(cssW, cssH) * dpr);

    if (orbCanvas.width !== targetSize || orbCanvas.height !== targetSize) {
      orbCanvas.width = targetSize;
      orbCanvas.height = targetSize;
    }
  }

  if (orbCanvas && 'ResizeObserver' in window) {
    var ro = new ResizeObserver(syncCanvasSize);
    ro.observe(orbCanvas);
  }

  function renderFrame(timestamp) {
    if (!orbCanvas) return;
    syncCanvasSize();

    var cx = orbCanvas.getContext('2d');
    var size = orbCanvas.width;
    if (!size) return;

    var t = timestamp / 1000;
    var f, onsets;

    var audioBuffer = window.workingAudioBuffer;

    if (audioBuffer && currentAnalysis) {
      // Map live playback time
      var playbackTime = t;
      if (window.audioCtx && window.isPreviewPlaying && window.activePreviewSource) {
        var elapsed = window.audioCtx.currentTime - (window.previewStartTime || 0);
        playbackTime = elapsed;
        if (window.keepRanges && window.keepRanges.length > 0) {
          var accumulated = 0;
          var found = false;
          for (var r = 0; r < window.keepRanges.length; r++) {
            var range = window.keepRanges[r];
            var rangeDur = range.end - range.start;
            if (elapsed <= accumulated + rangeDur) {
              playbackTime = range.start + (elapsed - accumulated);
              found = true;
              break;
            }
            accumulated += rangeDur;
          }
          if (!found) {
            playbackTime = window.keepRanges[window.keepRanges.length - 1].end;
          }
        }
      } else {
        playbackTime = 0;
      }

      f = currentAnalysis.features(playbackTime);
      onsets = currentAnalysis.onsets;
      t = playbackTime;
    } else {
      f = getIdleFeatures(t);
      onsets = [];
    }

    drawOrbFrame(cx, size, t, f, onsets);
  }

  function loop(timestamp) {
    if (!isOrbSelected || isPageHidden || !isOrbVisible) {
      animFrameId = null;
      return;
    }

    renderFrame(timestamp);

    if (!prefersReducedMotion) {
      animFrameId = requestAnimationFrame(loop);
    }
  }

  function startPreviewLoop() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = null;

    if (isOrbSelected && !isPageHidden && isOrbVisible) {
      if (prefersReducedMotion) {
        renderFrame(2000); // static frame at t=2
      } else {
        animFrameId = requestAnimationFrame(loop);
      }
    }
  }

  function stopPreviewLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  async function updateAudioAnalysis() {
    var audioBuffer = window.workingAudioBuffer;
    if (audioBuffer) {
      currentAnalysis = await analyzeOrbAudio(audioBuffer);
    } else {
      currentAnalysis = null;
    }
    if (isOrbSelected) {
      startPreviewLoop();
    }
  }

  // Event Listeners
  window.addEventListener('stylechange', function (e) {
    var selectedStyle = e.detail ? e.detail.style : null;
    isOrbSelected = (selectedStyle === 'orb');
    if (isOrbSelected) {
      updateAudioAnalysis();
      startPreviewLoop();
    } else {
      stopPreviewLoop();
    }
  });

  document.addEventListener('visibilitychange', function () {
    isPageHidden = document.hidden;
    if (!isPageHidden && isOrbSelected) {
      startPreviewLoop();
    } else {
      stopPreviewLoop();
    }
  });

  if (orbCanvas && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        isOrbVisible = entry.isIntersecting;
        if (isOrbVisible && isOrbSelected) {
          startPreviewLoop();
        } else if (!isOrbVisible) {
          stopPreviewLoop();
        }
      });
    }, { threshold: 0.05 });
    io.observe(orbCanvas);
  }

  // Wire file updates
  var fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function () {
      setTimeout(updateAudioAnalysis, 100);
    });
  }

  // Observe aspectRatioSection to enable renderOrbBtn when audio is loaded
  var renderOrbBtn = document.getElementById('renderOrbBtn');
  var aspectRatioSection = document.getElementById('aspectRatioSection');

  function setButtonDisabled(btn, isDisabled, disabledTitle, enabledTitle) {
    if (!btn) return;
    btn.disabled = isDisabled;
    btn.setAttribute("aria-disabled", isDisabled ? "true" : "false");
    var title = isDisabled ? disabledTitle : enabledTitle;
    if (title) {
      btn.setAttribute("title", title);
    } else {
      btn.removeAttribute("title");
    }
  }

  if (aspectRatioSection && renderOrbBtn) {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.attributeName === 'class') {
          if (!aspectRatioSection.classList.contains('hidden')) {
            if (window.workingAudioBuffer) {
              setButtonDisabled(renderOrbBtn, false, "", "Render orb video and download");
            }
          }
        }
      });
    });
    observer.observe(aspectRatioSection, { attributes: true });
  }

  // Render Export flow
  if (renderOrbBtn) {
    renderOrbBtn.addEventListener('click', async function () {
      var audioBuffer = window.workingAudioBuffer;
      var chosenWidth = window.chosenWidth || 1280;
      var chosenHeight = window.chosenHeight || 720;

      if (!audioBuffer || renderOrbBtn.disabled) return;

      stopPreviewLoop();

      setButtonDisabled(renderOrbBtn, true, "Orb video rendering in progress...");

      var progressContainer = document.getElementById("progressContainer");
      var progressLabel = document.getElementById("progressLabel");
      var progressPercentage = document.getElementById("progressPercentage");
      var progressBarFill = document.getElementById("progressBarFill");
      var statusLine = document.getElementById("statusLine");
      var downloadContainer = document.getElementById("downloadContainer");
      var downloadVideo = document.getElementById("downloadVideo");

      if (progressContainer) progressContainer.classList.remove("hidden");
      if (downloadContainer) downloadContainer.classList.add("hidden");
      if (statusLine) statusLine.classList.add("hidden");

      var ratioLabel = chosenWidth === 1280 ? "16:9" : "9:16";
      if (progressLabel) progressLabel.textContent = `RENDERING ${ratioLabel} ORB FORMAT...`;
      if (progressBarFill) progressBarFill.style.width = "0%";
      if (progressPercentage) progressPercentage.textContent = "0%";

      try {
        var analysis = await analyzeOrbAudio(audioBuffer);

        var blob = await window.renderOrbFormat(
          analysis,
          chosenWidth,
          chosenHeight,
          function (progress) {
            if (progressBarFill) progressBarFill.style.width = `${progress}%`;
            if (progressPercentage) progressPercentage.textContent = `${progress}%`;
            if (progressContainer) progressContainer.setAttribute("aria-valuenow", progress.toString());
          },
          audioBuffer
        );

        if (progressContainer) progressContainer.classList.add("hidden");

        var url = URL.createObjectURL(blob);
        var filenameLabel = chosenWidth === 1280 ? "16x9" : "9x16";

        if (downloadVideo) {
          downloadVideo.href = url;
          downloadVideo.download = `orb-${filenameLabel}.mp4`;
          downloadVideo.textContent = "DOWNLOAD VIDEO (MP4)";
        }

        if (downloadContainer) downloadContainer.classList.remove("hidden");
        if (statusLine) {
          statusLine.textContent = "Rendering completed successfully!";
          statusLine.classList.remove("hidden");
        }
        if (downloadVideo) downloadVideo.focus();

      } catch (err) {
        console.error("Orb Export Error:", err);
        if (statusLine) {
          statusLine.textContent = `Error: ${err.message || err}`;
          statusLine.classList.remove("hidden");
        }
        if (progressContainer) progressContainer.classList.add("hidden");
      } finally {
        setButtonDisabled(renderOrbBtn, false, "", "Render orb video and download");
        if (isOrbSelected) startPreviewLoop();
      }
    });
  }

  // Export internal functions for unit tests
  window.analyzeOrbAudio = analyzeOrbAudio;
})();
