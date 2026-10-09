(function () {
  'use strict';

  // Orb Geometry Parameters
  let POINT_COUNT = 2400; // Default 2400 points on Fibonacci sphere
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

  function generateFibonacciSphere(count) {
    const points = new Array(count);
    for (let i = 0; i < count; i++) {
      const y = 1 - (2 * i + 1) / count;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = (i * GOLDEN_ANGLE) % (Math.PI * 2);
      const theta = Math.acos(Math.max(-1, Math.min(1, y)));
      points[i] = {
        i,
        y,
        r,
        theta,
        phi,
        ux: r * Math.cos(phi),
        uy: y,
        uz: r * Math.sin(phi)
      };
    }
    return points;
  }

  let fibonacciPoints = generateFibonacciSphere(POINT_COUNT);

  function setPointCount(newCount) {
    POINT_COUNT = newCount;
    fibonacciPoints = generateFibonacciSphere(POINT_COUNT);
  }

  window.setOrbPointCount = setPointCount;
  window.getOrbPointCount = function () { return POINT_COUNT; };

  // Radix-2 FFT helper
  function fftRadix2(re, im) {
    const n = re.length;
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
      if (i < j) {
        const tr = re[i]; re[i] = re[j]; re[j] = tr;
        const ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
      let k = n >> 1;
      while (k <= j) { j -= k; k >>= 1; }
      j += k;
    }
    for (let len = 2; len <= n; len <<= 1) {
      const halfLen = len >> 1;
      const angle = -2 * Math.PI / len;
      const wstepR = Math.cos(angle);
      const wstepI = Math.sin(angle);
      for (let i = 0; i < n; i += len) {
        let wR = 1, wI = 0;
        for (let k = 0; k < halfLen; k++) {
          const pos = i + k;
          const match = pos + halfLen;
          const uR = re[pos], uI = im[pos];
          const vR = re[match] * wR - im[match] * wI;
          const vI = re[match] * wI + im[match] * wR;
          re[pos] = uR + vR; im[pos] = uI + vI;
          re[match] = uR - vR; im[match] = uI - vI;
          const nextWR = wR * wstepR - wI * wstepI;
          const nextWI = wR * wstepI + wI * wstepR;
          wR = nextWR; wI = nextWI;
        }
      }
    }
  }

  function yieldToMain() {
    if (typeof requestIdleCallback === "function") {
      return new Promise((resolve) => {
        requestIdleCallback(() => resolve(), { timeout: 50 });
      });
    }
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Precalculated Audio Metrics Extraction
  async function extractOrbAudioMetrics(audioBuffer, totalFrames, fps = 60) {
    if (!audioBuffer) {
      const empty = [];
      for (let f = 0; f < totalFrames; f++) {
        empty.push({ amplitude: 0, bass: 0, mid: 0, treble: 0 });
      }
      return empty;
    }

    const sampleRate = audioBuffer.sampleRate;
    const totalSamples = audioBuffer.length;
    const samplesPerFrame = sampleRate / fps;

    let mono;
    if (audioBuffer.numberOfChannels === 1) {
      mono = audioBuffer.getChannelData(0);
    } else {
      mono = new Float32Array(totalSamples);
      const c0 = audioBuffer.getChannelData(0);
      const c1 = audioBuffer.getChannelData(1);
      for (let i = 0; i < totalSamples; i++) {
        mono[i] = (c0[i] + c1[i]) * 0.5;
      }
    }

    const rawAmp = new Float32Array(totalFrames);
    const rawBass = new Float32Array(totalFrames);
    const rawMid = new Float32Array(totalFrames);
    const rawTreble = new Float32Array(totalFrames);

    let maxAmp = 0.0001;
    let maxBass = 0.0001;
    let maxMid = 0.0001;
    let maxTreble = 0.0001;

    const fftSize = 2048;
    const re = new Float32Array(fftSize);
    const im = new Float32Array(fftSize);

    const hann = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / fftSize));
    }

    let lastYield = performance.now();

    for (let f = 0; f < totalFrames; f++) {
      if ((f & 15) === 0 && performance.now() - lastYield > 25) {
        await yieldToMain();
        lastYield = performance.now();
      }

      const centerSample = Math.floor(f * samplesPerFrame);
      const startSample = centerSample - (fftSize >> 1);

      let sumSq = 0;
      for (let k = 0; k < fftSize; k++) {
        const sIdx = startSample + k;
        const val = (sIdx >= 0 && sIdx < totalSamples) ? mono[sIdx] : 0;
        sumSq += val * val;
        re[k] = val * hann[k];
        im[k] = 0;
      }

      const rms = Math.sqrt(sumSq / fftSize);
      rawAmp[f] = rms;
      if (rms > maxAmp) maxAmp = rms;

      fftRadix2(re, im);

      const minBassBin = Math.max(0, Math.floor(20 * fftSize / sampleRate));
      const maxBassBin = Math.min(fftSize / 2, Math.ceil(250 * fftSize / sampleRate));

      const minMidBin = Math.max(0, Math.floor(250 * fftSize / sampleRate));
      const maxMidBin = Math.min(fftSize / 2, Math.ceil(2000 * fftSize / sampleRate));

      const minTrebleBin = Math.max(0, Math.floor(2000 * fftSize / sampleRate));
      const maxTrebleBin = Math.min(fftSize / 2, Math.ceil(8000 * fftSize / sampleRate));

      let bSum = 0, bCount = 0;
      for (let b = minBassBin; b <= maxBassBin; b++) {
        bSum += Math.sqrt(re[b] * re[b] + im[b] * im[b]) / fftSize;
        bCount++;
      }
      const bVal = bCount > 0 ? bSum / bCount : 0;
      rawBass[f] = bVal;
      if (bVal > maxBass) maxBass = bVal;

      let mSum = 0, mCount = 0;
      for (let m = minMidBin; m <= maxMidBin; m++) {
        mSum += Math.sqrt(re[m] * re[m] + im[m] * im[m]) / fftSize;
        mCount++;
      }
      const mVal = mCount > 0 ? mSum / mCount : 0;
      rawMid[f] = mVal;
      if (mVal > maxMid) maxMid = mVal;

      let tSum = 0, tCount = 0;
      for (let tr = minTrebleBin; tr <= maxTrebleBin; tr++) {
        tSum += Math.sqrt(re[tr] * re[tr] + im[tr] * im[tr]) / fftSize;
        tCount++;
      }
      const tVal = tCount > 0 ? tSum / tCount : 0;
      rawTreble[f] = tVal;
      if (tVal > maxTreble) maxTreble = tVal;
    }

    const metrics = new Array(totalFrames);
    for (let f = 0; f < totalFrames; f++) {
      metrics[f] = {
        amplitude: Math.min(1, rawAmp[f] / maxAmp),
        bass: Math.min(1, rawBass[f] / maxBass),
        mid: Math.min(1, rawMid[f] / maxMid),
        treble: Math.min(1, rawTreble[f] / maxTreble)
      };
    }

    return metrics;
  }

  const analysisCache = new WeakMap();

  async function analyzeOrbAudio(audioBuffer) {
    if (!audioBuffer) return null;
    if (analysisCache.has(audioBuffer)) {
      return analysisCache.get(audioBuffer);
    }

    const fps = 60;
    const duration = audioBuffer.duration;
    const totalFrames = Math.ceil(duration * fps);
    const metrics = await extractOrbAudioMetrics(audioBuffer, totalFrames, fps);

    function features(t) {
      if (totalFrames === 0) return { amplitude: 0, level: 0, bass: 0, mid: 0, treble: 0 };
      const frameFloat = t * fps;
      const idx0 = Math.max(0, Math.min(totalFrames - 1, Math.floor(frameFloat)));
      const idx1 = Math.max(0, Math.min(totalFrames - 1, idx0 + 1));
      const frac = frameFloat - Math.floor(frameFloat);

      const m0 = metrics[idx0];
      const m1 = metrics[idx1];

      const amp = m0.amplitude + (m1.amplitude - m0.amplitude) * frac;
      const bass = m0.bass + (m1.bass - m0.bass) * frac;
      const mid = m0.mid + (m1.mid - m0.mid) * frac;
      const treble = m0.treble + (m1.treble - m0.treble) * frac;

      return {
        amplitude: amp,
        level: amp,
        bass,
        mid,
        treble
      };
    }

    const result = {
      totalFrames,
      metrics,
      features,
      onsets: [],
      duration
    };

    analysisCache.set(audioBuffer, result);
    return result;
  }

  window.analyzeOrbAudio = analyzeOrbAudio;

  // Draw Orb Frame
  // Renders 2400 points on a Fibonacci sphere with perspective projection,
  // audio reactivity (radial displacement & overall lerped scale),
  // Y-axis rotation + fixed X tilt (0.35 rad), depth sorting, and back-to-front dot drawing.
  function drawOrbFrame(ctx, size, t, audioMetrics, onsets) {
    const width = typeof size === 'number' ? size : (ctx.canvas ? ctx.canvas.width : 1080);
    const height = typeof size === 'number' ? size : (ctx.canvas ? ctx.canvas.height : 1080);

    const amp = Math.min(1, Math.max(0, (audioMetrics && (audioMetrics.amplitude !== undefined ? audioMetrics.amplitude : audioMetrics.level)) || 0));
    const bass = Math.min(1, Math.max(0, (audioMetrics && audioMetrics.bass) || 0));
    const mid = Math.min(1, Math.max(0, (audioMetrics && audioMetrics.mid) || 0));
    const treble = Math.min(1, Math.max(0, (audioMetrics && audioMetrics.treble) || 0));

    const baseRadius = 330 * (width / 1080);
    const focalLength = 900 * (width / 1080);
    const cameraDistance = 900 * (width / 1080);
    const tiltX = 0.35; // fixed X tilt of 0.35 rad

    // Y rotation: 0.25 rad/s base + amplitude * 0.6 rad/s
    const rotY = (audioMetrics && audioMetrics.rotationY !== undefined)
      ? audioMetrics.rotationY
      : (0.25 + amp * 0.6) * t;

    // Overall scale: 1 + amplitude * 0.18 (smoothed lerp 0.2 per frame if provided, or direct)
    const scale = (audioMetrics && audioMetrics.scale !== undefined)
      ? audioMetrics.scale
      : 1 + amp * 0.18;

    const cosTilt = Math.cos(tiltX);
    const sinTilt = Math.sin(tiltX);
    const cosRotY = Math.cos(rotY);
    const sinRotY = Math.sin(rotY);

    const centerX = width / 2;
    const centerY = height / 2;

    // Background: solid black #000000
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Ensure no glow, no blur, no shadows, no composite operations
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalCompositeOperation = 'source-over';

    const pointsCount = fibonacciPoints.length;
    const renderPoints = new Array(pointsCount);

    let minZ = Infinity;
    let maxZ = -Infinity;

    for (let i = 0; i < pointsCount; i++) {
      const p = fibonacciPoints[i];
      const theta = p.theta;
      const phi = p.phi;

      // Radial displacement per dot
      const disp = 1 + bass * 0.12 * Math.sin(3 * theta + t)
                     + mid * 0.08 * Math.sin(5 * phi - t * 1.3)
                     + treble * 0.05 * Math.sin(9 * (theta + phi) + t * 2.0);

      const R = baseRadius * scale * disp;

      const x0 = R * p.ux;
      const y0 = R * p.uy;
      const z0 = R * p.uz;

      // Rotation about Y axis
      const x1 = x0 * cosRotY + z0 * sinRotY;
      const y1 = y0;
      const z1 = -x0 * sinRotY + z0 * cosRotY;

      // Fixed X tilt (0.35 rad)
      const x2 = x1;
      const y2 = y1 * cosTilt - z1 * sinTilt;
      const z2 = y1 * sinTilt + z1 * cosTilt;

      if (z2 < minZ) minZ = z2;
      if (z2 > maxZ) maxZ = z2;

      renderPoints[i] = { x: x2, y: y2, z: z2 };
    }

    const zRange = (maxZ - minZ) || 1;

    // Draw back to front (sort by z ascending)
    renderPoints.sort((a, b) => a.z - b.z);

    const scaleRatio = width / 1080;

    for (let i = 0; i < pointsCount; i++) {
      const pt = renderPoints[i];
      const P = focalLength / (cameraDistance + pt.z);
      const sx = centerX + pt.x * P;
      const sy = centerY + pt.y * P;

      // Depth is 0 at the back and 1 at the front
      const depth = Math.min(1, Math.max(0, (pt.z - minZ) / zRange));

      const dotRadius = (1.2 + depth * 2.4) * scaleRatio;
      const alpha = 0.25 + 0.75 * depth;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  window.drawOrbFrame = drawOrbFrame;

  // Live Preview Loop
  const orbCanvas = document.getElementById('orb-preview');
  let isOrbSelected = false;
  let isOrbVisible = true;
  let isPageHidden = document.hidden;
  let animFrameId = null;
  let currentAnalysis = null;
  let lastFrameTime = performance.now();
  let liveRotationY = 0;
  let liveScale = 1.0;

  // Performance tracking for stage-gate measurement
  let totalDrawTime = 0;
  let drawFrameCount = 0;

  function resetPerformanceStats() {
    totalDrawTime = 0;
    drawFrameCount = 0;
  }

  function getAverageDrawTimeMs() {
    return drawFrameCount > 0 ? totalDrawTime / drawFrameCount : 0;
  }

  window.getOrbAverageDrawTimeMs = getAverageDrawTimeMs;
  window.resetOrbPerformanceStats = resetPerformanceStats;

  function ensureCanvasResolution() {
    if (!orbCanvas) return;
    if (orbCanvas.width !== 1080 || orbCanvas.height !== 1080) {
      orbCanvas.width = 1080;
      orbCanvas.height = 1080;
    }
  }

  function getIdleFeatures(t) {
    const lvl = (typeof window.cardLevel === 'function')
      ? window.cardLevel(t)
      : (Math.sin(t * 2.3) * Math.sin(t * 0.9 + 1) * 0.35 + 0.25);
    return {
      amplitude: lvl,
      level: lvl,
      bass: lvl * 0.8,
      mid: 0.3 + 0.2 * Math.sin(t * 1.3),
      treble: 0.2 + 0.15 * Math.sin(t * 2.1)
    };
  }

  function renderPreviewFrame(timestamp) {
    if (!orbCanvas) return;
    ensureCanvasResolution();

    const cx = orbCanvas.getContext('2d');
    const t = timestamp / 1000;
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    let f;
    const audioBuffer = window.workingAudioBuffer;

    if (audioBuffer && currentAnalysis) {
      let playbackTime = 0;
      if (window.audioCtx && window.isPreviewPlaying && window.activePreviewSource) {
        const elapsed = window.audioCtx.currentTime - (window.previewStartTime || 0);
        playbackTime = elapsed;
        if (window.keepRanges && window.keepRanges.length > 0) {
          let accumulated = 0;
          let found = false;
          for (let r = 0; r < window.keepRanges.length; r++) {
            const range = window.keepRanges[r];
            const rangeDur = range.end - range.start;
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
      }
      f = currentAnalysis.features(playbackTime);
    } else {
      f = getIdleFeatures(t);
    }

    const amp = f.amplitude !== undefined ? f.amplitude : (f.level || 0);
    liveRotationY += (0.25 + amp * 0.6) * dt;
    const targetScale = 1 + amp * 0.18;
    liveScale += 0.2 * (targetScale - liveScale);

    const drawMetrics = {
      amplitude: amp,
      bass: f.bass || 0,
      mid: f.mid || 0,
      treble: f.treble || 0,
      rotationY: liveRotationY,
      scale: liveScale
    };

    const t0 = performance.now();
    drawOrbFrame(cx, 1080, t, drawMetrics);
    const t1 = performance.now();

    totalDrawTime += (t1 - t0);
    drawFrameCount++;
  }

  function loop(timestamp) {
    if (!isOrbSelected || isPageHidden || !isOrbVisible) {
      animFrameId = null;
      return;
    }
    renderPreviewFrame(timestamp);
    animFrameId = requestAnimationFrame(loop);
  }

  function startPreviewLoop() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = null;
    lastFrameTime = performance.now();
    if (isOrbSelected && !isPageHidden && isOrbVisible) {
      animFrameId = requestAnimationFrame(loop);
    }
  }

  function stopPreviewLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  async function updateAudioAnalysis() {
    const audioBuffer = window.workingAudioBuffer;
    if (audioBuffer) {
      currentAnalysis = await analyzeOrbAudio(audioBuffer);
    } else {
      currentAnalysis = null;
    }
    if (isOrbSelected) {
      startPreviewLoop();
    }
  }

  window.addEventListener('stylechange', function (e) {
    const selectedStyle = e.detail ? e.detail.style : null;
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
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
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

  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      setTimeout(updateAudioAnalysis, 100);
    });
  }

  // Render Button State Synchronization
  const renderOrbBtn = document.getElementById('renderOrbBtn');
  const aspectRatioSection = document.getElementById('aspectRatioSection');

  function setButtonDisabled(btn, isDisabled, disabledTitle, enabledTitle) {
    if (!btn) return;
    btn.disabled = isDisabled;
    btn.setAttribute("aria-disabled", isDisabled ? "true" : "false");
    const title = isDisabled ? disabledTitle : enabledTitle;
    if (title) {
      btn.setAttribute("title", title);
    } else {
      btn.removeAttribute("title");
    }
  }

  if (aspectRatioSection && renderOrbBtn) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
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

  // Export MP4 Render Function
  let orbMp4MuxerPromise = null;

  async function renderOrbFormat(analysisData, width, height, progressCallback, audioBuffer) {
    if (!orbMp4MuxerPromise) {
      orbMp4MuxerPromise = import('./mp4-muxer.js').catch(() => import('../mp4-muxer.js'));
    }
    const mp4MuxerModule = await orbMp4MuxerPromise;
    const Mp4Muxer = mp4MuxerModule.Mp4Muxer || mp4MuxerModule.default || window.Mp4Muxer;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 1080;
    exportCanvas.height = 1080;
    const exportCtx = exportCanvas.getContext("2d");

    const fps = 60;
    const frameDurationMicros = 1_000_000 / fps;
    const totalFrames = analysisData.totalFrames;

    // Silent MP4 export (NO audio track)
    const muxerOptions = {
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: 1080,
        height: 1080
      },
      fastStart: 'in-memory'
    };

    const muxer = new Mp4Muxer.Muxer(muxerOptions);

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error("Orb VideoEncoder error:", e)
    });

    videoEncoder.configure({
      codec: 'avc1.420034',
      width: 1080,
      height: 1080,
      bitrate: 8_000_000,
      framerate: fps
    });

    let accumulatedRotY = 0;
    let lerpedScale = 1.0;

    for (let i = 0; i < totalFrames; i++) {
      while (videoEncoder.encodeQueueSize > 2) {
        await new Promise((resolve) => {
          videoEncoder.addEventListener("dequeue", resolve, { once: true });
        });
      }

      const t = i / fps;
      const m = (analysisData.metrics && analysisData.metrics[i]) || analysisData.features(t);
      const amp = m.amplitude !== undefined ? m.amplitude : (m.level || 0);

      const rotYRate = 0.25 + amp * 0.6;
      if (i > 0) {
        accumulatedRotY += rotYRate * (1 / fps);
      } else {
        accumulatedRotY = 0;
      }

      const targetScale = 1 + amp * 0.18;
      if (i > 0) {
        lerpedScale += 0.2 * (targetScale - lerpedScale);
      } else {
        lerpedScale = targetScale;
      }

      const frameMetrics = {
        amplitude: amp,
        bass: m.bass || 0,
        mid: m.mid || 0,
        treble: m.treble || 0,
        rotationY: accumulatedRotY,
        scale: lerpedScale
      };

      drawOrbFrame(exportCtx, 1080, t, frameMetrics);

      const frame = new VideoFrame(exportCanvas, {
        timestamp: i * frameDurationMicros,
        duration: frameDurationMicros
      });

      videoEncoder.encode(frame, { keyFrame: i % 60 === 0 });
      frame.close();

      if (i % 15 === 0) {
        const progress = Math.min(100, Math.round((i / totalFrames) * 100));
        if (progressCallback) progressCallback(progress);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    if (progressCallback) progressCallback(100);

    await videoEncoder.flush();
    videoEncoder.close();
    muxer.finalize();

    const buffer = muxer.target.buffer;
    return new Blob([buffer], { type: 'video/mp4' });
  }

  window.renderOrbFormat = renderOrbFormat;

  // Click handler for #renderOrbBtn
  if (renderOrbBtn) {
    renderOrbBtn.addEventListener('click', async function () {
      const audioBuffer = window.workingAudioBuffer;
      if (!audioBuffer || renderOrbBtn.disabled) return;

      stopPreviewLoop();
      setButtonDisabled(renderOrbBtn, true, "Orb video rendering in progress...");

      const progressContainer = document.getElementById("progressContainer");
      const progressLabel = document.getElementById("progressLabel");
      const progressPercentage = document.getElementById("progressPercentage");
      const progressBarFill = document.getElementById("progressBarFill");
      const statusLine = document.getElementById("statusLine");
      const downloadContainer = document.getElementById("downloadContainer");
      const downloadVideo = document.getElementById("downloadVideo");

      if (progressContainer) progressContainer.classList.remove("hidden");
      if (downloadContainer) downloadContainer.classList.add("hidden");
      if (statusLine) statusLine.classList.add("hidden");

      if (progressLabel) progressLabel.textContent = "RENDERING ORB FORMAT...";
      if (progressBarFill) progressBarFill.style.width = "0%";
      if (progressPercentage) progressPercentage.textContent = "0%";

      try {
        const analysis = await analyzeOrbAudio(audioBuffer);

        const blob = await renderOrbFormat(
          analysis,
          1080,
          1080,
          function (progress) {
            if (progressBarFill) progressBarFill.style.width = `${progress}%`;
            if (progressPercentage) progressPercentage.textContent = `${progress}%`;
            if (progressContainer) progressContainer.setAttribute("aria-valuenow", progress.toString());
          },
          audioBuffer
        );

        if (progressContainer) progressContainer.classList.add("hidden");

        const url = URL.createObjectURL(blob);
        if (downloadVideo) {
          downloadVideo.href = url;
          downloadVideo.download = "orb-1x1.mp4";
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

})();
