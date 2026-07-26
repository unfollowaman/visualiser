// Web Audio context management
let audioCtx = null;
let decodedAudioBuffer = null;
let frameEnvelopeArray = null; // cached analysis results
let activePreviewSource = null;
let activePreviewAnalyser = null;
let isPreviewPlaying = false;
let previewAnimationId = null;

// UI Elements
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileInfoContainer = document.getElementById("fileInfoContainer");
const fileName = document.getElementById("fileName");
const fileDuration = document.getElementById("fileDuration");
const durationWarning = document.getElementById("durationWarning");
const decodeError = document.getElementById("decodeError");
const previewCanvas = document.getElementById("previewCanvas");
const playPreviewBtn = document.getElementById("playPreviewBtn");
const renderBtn = document.getElementById("renderBtn");
const progressContainer = document.getElementById("progressContainer");
const progressLabel = document.getElementById("progressLabel");
const progressPercentage = document.getElementById("progressPercentage");
const progressBarFill = document.getElementById("progressBarFill");
const statusLine = document.getElementById("statusLine");
const downloadContainer = document.getElementById("downloadContainer");
const download16x9 = document.getElementById("download16x9");
const download9x16 = document.getElementById("download9x16");
const webmNotice = document.getElementById("webmNotice");

// Canvas contexts and configurations
const ctxPreview = previewCanvas.getContext("2d");

// Helper to format duration in mm:ss
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Draw symmetric rounded bars matching the equalizer spec
function drawBars(ctx, amplitudes, w, h) {
  // Fill entire canvas with solid black
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#ffffff";
  const gap = w * 0.006;
  const totalGap = gap * 47;
  const barWidth = (w * 0.82 - totalGap) / 48;
  const startX = (w - (barWidth * 48 + totalGap)) / 2;

  const maxBarHeight = h * 0.78;
  const minBarHeight = h * 0.012;

  for (let i = 0; i < 48; i++) {
    const amp = Math.max(0, Math.min(1, amplitudes[i] || 0));
    const barHeight = Math.max(minBarHeight, amp * maxBarHeight);
    const x = startX + i * (barWidth + gap);
    const y = (h - barHeight) / 2;

    // Draw as rounded rectangle
    const radius = Math.min(barWidth / 2, 6);
    drawRoundedRect(ctx, x, y, barWidth, barHeight, radius);
  }
}

// Helper to draw a rounded rectangle
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

// Generate static idle bars for the preview canvas on start/stop
function drawIdleState() {
  const idleAmplitudes = new Float32Array(48);
  for (let i = 0; i < 48; i++) {
    // Generate a beautiful, symmetric aesthetic wave shape
    const distanceToCenter = Math.abs(i - 23.5) / 24;
    idleAmplitudes[i] = 0.15 + 0.45 * Math.cos(distanceToCenter * Math.PI);
  }
  drawBars(ctxPreview, idleAmplitudes, previewCanvas.width, previewCanvas.height);
}

// Initialize preview canvas with idle bars
drawIdleState();

// Handle reliable file click gesture
dropZone.addEventListener("click", (e) => {
  // Mobile browsers can block file inputs if triggered within async calls
  // Keep this direct synchronous call
  fileInput.click();
});

// Drag and drop events
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");

  if (e.dataTransfer.files.length > 0) {
    handleSelectedFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleSelectedFile(e.target.files[0]);
  }
});

// Process Selected File
function handleSelectedFile(file) {
  // Reset previous state
  stopPreview();
  decodedAudioBuffer = null;
  frameEnvelopeArray = null;

  fileInfoContainer.classList.add("hidden");
  durationWarning.classList.add("hidden");
  decodeError.classList.add("hidden");
  playPreviewBtn.disabled = true;
  renderBtn.disabled = true;
  progressContainer.classList.add("hidden");
  downloadContainer.classList.add("hidden");
  statusLine.classList.add("hidden");

  // Show selected info placeholder
  fileName.textContent = file.name;
  fileDuration.textContent = "Decoding...";
  fileInfoContainer.classList.remove("hidden");

  // Read as ArrayBuffer
  const reader = new FileReader();
  reader.onload = function (e) {
    const arrayBuffer = e.target.result;

    // Create AudioContext lazily
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    audioCtx.decodeAudioData(arrayBuffer, (audioBuffer) => {
      decodedAudioBuffer = audioBuffer;
      const duration = audioBuffer.duration;
      fileDuration.textContent = formatDuration(duration);

      // Warn if duration is > 150 seconds
      if (duration > 150) {
        durationWarning.classList.remove("hidden");
      } else {
        durationWarning.classList.add("hidden");
      }

      // Enable relevant actions
      playPreviewBtn.disabled = false;
      renderBtn.disabled = false;
    }, (err) => {
      console.error("Decode Audio Data Error: ", err);
      fileInfoContainer.classList.add("hidden");
      decodeError.classList.remove("hidden");
    });
  };

  reader.onerror = function (err) {
    console.error("FileReader Error: ", err);
    fileInfoContainer.classList.add("hidden");
    decodeError.classList.remove("hidden");
  };

  reader.readAsArrayBuffer(file);
}

// Mix channels to mono and run robust Root Mean Square (RMS) frame extraction
function analyzeAudio(audioBuffer) {
  const duration = audioBuffer.duration;
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = audioBuffer.length;

  // Mix down channels to single mono Float32Array
  const monoSamples = new Float32Array(totalSamples);
  const channels = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  for (let s = 0; s < totalSamples; s++) {
    let sum = 0;
    for (let c = 0; c < numChannels; c++) {
      sum += channels[c][s];
    }
    monoSamples[s] = sum / numChannels;
  }

  // 60 frames per second logic
  const fps = 60;
  const totalFrames = Math.ceil(duration * fps);
  const samplesPerFrame = sampleRate / fps;

  // Step 1: Compute raw RMS values for 48 bars per frame
  const rawFrames = [];
  let globalMax = 0;

  for (let f = 0; f < totalFrames; f++) {
    const frameAmps = new Float32Array(48);
    const frameStartSample = Math.floor(f * samplesPerFrame);
    const nextFrameStartSample = Math.floor((f + 1) * samplesPerFrame);
    const frameSamplesCount = nextFrameStartSample - frameStartSample;

    // Split the slice into 48 equal segments
    const segmentLength = frameSamplesCount / 48;

    for (let barIdx = 0; barIdx < 48; barIdx++) {
      const segStart = Math.floor(frameStartSample + barIdx * segmentLength);
      const segEnd = Math.floor(frameStartSample + (barIdx + 1) * segmentLength);

      let sumSquares = 0;
      let count = 0;
      for (let s = segStart; s < segEnd && s < totalSamples; s++) {
        const val = monoSamples[s];
        sumSquares += val * val;
        count++;
      }

      // Root Mean Square
      const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
      frameAmps[barIdx] = rms;

      if (rms > globalMax) {
        globalMax = rms;
      }
    }
    rawFrames.push(frameAmps);
  }

  if (globalMax === 0) {
    globalMax = 1;
  }

  // Step 2: Temporal smoothing window: [f-2, f-1, f, f+1, f+2] per bar, normalized by globalMax
  const smoothedFrames = [];
  for (let f = 0; f < totalFrames; f++) {
    const smoothAmps = new Float32Array(48);
    for (let barIdx = 0; barIdx < 48; barIdx++) {
      let sum = 0;
      let count = 0;

      for (let offset = -2; offset <= 2; offset++) {
        const targetFrame = f + offset;
        if (targetFrame >= 0 && targetFrame < totalFrames) {
          sum += rawFrames[targetFrame][barIdx];
          count++;
        }
      }

      const averagedRms = sum / count;
      smoothAmps[barIdx] = averagedRms / globalMax;
    }
    smoothedFrames.push(smoothAmps);
  }

  return smoothedFrames;
}

// Live Preview Logic
playPreviewBtn.addEventListener("click", () => {
  if (isPreviewPlaying) {
    stopPreview();
  } else {
    startPreview();
  }
});

function startPreview() {
  if (!decodedAudioBuffer) return;

  // Context must be in running state (mobile gesture safety)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  // Set up source node
  activePreviewSource = audioCtx.createBufferSource();
  activePreviewSource.buffer = decodedAudioBuffer;

  // Set up analyser
  activePreviewAnalyser = audioCtx.createAnalyser();
  activePreviewAnalyser.fftSize = 256; // 128 frequency bins

  // Connect components
  activePreviewSource.connect(activePreviewAnalyser);
  activePreviewAnalyser.connect(audioCtx.destination);

  isPreviewPlaying = true;
  playPreviewBtn.textContent = "STOP PREVIEW";

  // Revert preview on natural audio completion
  activePreviewSource.onended = () => {
    if (isPreviewPlaying) {
      stopPreview();
    }
  };

  activePreviewSource.start(0);
  runPreviewLoop();
}

function stopPreview() {
  isPreviewPlaying = false;
  playPreviewBtn.textContent = "PLAY PREVIEW";

  if (activePreviewSource) {
    try {
      activePreviewSource.stop();
    } catch (e) {
      // already stopped or not started
    }
    activePreviewSource = null;
  }

  if (activePreviewAnalyser) {
    activePreviewAnalyser = null;
  }

  if (previewAnimationId) {
    cancelAnimationFrame(previewAnimationId);
    previewAnimationId = null;
  }

  drawIdleState();
}

function runPreviewLoop() {
  if (!isPreviewPlaying || !activePreviewAnalyser) return;

  // Frequency analysis details: get Byte Frequency Data
  const bufferLength = activePreviewAnalyser.frequencyBinCount; // 128
  const dataArray = new Uint8Array(bufferLength);
  activePreviewAnalyser.getByteFrequencyData(dataArray);

  // Group frequency bins (0 to 128) into 48 visualizer bars
  const visualAmplitudes = new Float32Array(48);
  const binsPerBar = bufferLength / 48; // ~2.66 bins per bar

  for (let i = 0; i < 48; i++) {
    const binStart = Math.floor(i * binsPerBar);
    const binEnd = Math.floor((i + 1) * binsPerBar);

    let sum = 0;
    let count = 0;
    for (let b = binStart; b < binEnd && b < bufferLength; b++) {
      sum += dataArray[b];
      count++;
    }

    const averageVal = count > 0 ? sum / count : 0;
    // Scale 0-255 byte value to 0-1 amplitude representation
    visualAmplitudes[i] = averageVal / 255;
  }

  drawBars(ctxPreview, visualAmplitudes, previewCanvas.width, previewCanvas.height);

  previewAnimationId = requestAnimationFrame(runPreviewLoop);
}

// MediaRecorder mime types prioritization logic
function getSupportedMimeType() {
  const mimeTypes = [
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm"
  ];
  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return null;
}

// Render loop that executes manually-triggered canvas capture
function renderFormat(envelope, width, height, mimeType, progressCallback) {
  return new Promise((resolve, reject) => {
    try {
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      const offscreenCtx = offscreenCanvas.getContext("2d");

      // Set stream using 0 to completely rely on manual requestFrame triggering
      const stream = offscreenCanvas.captureStream(0);
      const track = stream.getVideoTracks()[0];

      const options = {
        mimeType: mimeType,
        videoBitsPerSecond: 8000000
      };

      const recorder = new MediaRecorder(stream, options);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };

      recorder.onerror = (err) => {
        reject(err);
      };

      // Start the manual frame timing loop using requestAnimationFrame
      recorder.start();

      const totalFrames = envelope.length;
      let frameIndex = 0;
      const startTime = performance.now();

      function tick() {
        if (frameIndex >= totalFrames) {
          // Finish recording beautifully: wait 100 milliseconds then call recorder.stop() to flush
          setTimeout(() => {
            recorder.stop();
          }, 100);
          return;
        }

        const elapsed = performance.now() - startTime;
        const targetFrameIndex = Math.floor(elapsed / (1000 / 60));

        // Draw and capture up to the target frame index to prevent frame drops
        while (frameIndex <= targetFrameIndex && frameIndex < totalFrames) {
          const frameEnvelope = envelope[frameIndex];

          // Render frame on offscreen context
          drawBars(offscreenCtx, frameEnvelope, width, height);

          // Force precise track capture
          track.requestFrame();

          frameIndex++;
        }

        // Send progress updates
        const progress = Math.round((frameIndex / totalFrames) * 100);
        progressCallback(progress);

        requestAnimationFrame(tick);
      }

      // Kickoff manual loop
      requestAnimationFrame(tick);
    } catch (err) {
      reject(err);
    }
  });
}

// Main Controller Render Trigger
renderBtn.addEventListener("click", async () => {
  if (!decodedAudioBuffer) return;

  // Stop active preview
  stopPreview();

  // Reset progress and disable actions during render
  renderBtn.disabled = true;
  playPreviewBtn.disabled = true;
  progressContainer.classList.remove("hidden");
  downloadContainer.classList.add("hidden");
  statusLine.classList.add("hidden");

  try {
    // Step 1: Run analytical audio decoder (cached or first-time)
    if (!frameEnvelopeArray) {
      statusLine.textContent = "Analyzing audio frequencies...";
      statusLine.classList.remove("hidden");

      // Let layout update before blocking CPU slightly
      await new Promise(r => setTimeout(r, 50));
      frameEnvelopeArray = analyzeAudio(decodedAudioBuffer);
    }

    // Determine target format
    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      throw new Error("No supported MediaRecorder video formats found in this browser.");
    }

    const isMp4 = mimeType.includes("video/mp4");
    const fileExtension = isMp4 ? ".mp4" : ".webm";

    // Setup WebM notice if fallback used
    if (!isMp4) {
      webmNotice.classList.remove("hidden");
    } else {
      webmNotice.classList.add("hidden");
    }

    // Step 2: Render 16:9
    progressLabel.textContent = "RENDERING 16:9 FORMAT...";
    progressBarFill.style.width = "0%";
    progressPercentage.textContent = "0%";
    statusLine.classList.add("hidden");

    const blob16x9 = await renderFormat(
      frameEnvelopeArray,
      1280,
      720,
      mimeType,
      (progress) => {
        progressBarFill.style.width = `${progress}%`;
        progressPercentage.textContent = `${progress}%`;
      }
    );

    // Step 3: Render 9:16
    progressLabel.textContent = "RENDERING 9:16 FORMAT...";
    progressBarFill.style.width = "0%";
    progressPercentage.textContent = "0%";

    const blob9x16 = await renderFormat(
      frameEnvelopeArray,
      720,
      1280,
      mimeType,
      (progress) => {
        progressBarFill.style.width = `${progress}%`;
        progressPercentage.textContent = `${progress}%`;
      }
    );

    // Render Completed successfully!
    progressContainer.classList.add("hidden");

    // Create Download Links
    const url16x9 = URL.createObjectURL(blob16x9);
    const url9x16 = URL.createObjectURL(blob9x16);

    download16x9.href = url16x9;
    download16x9.download = `visualizer-16x9${fileExtension}`;
    download16x9.textContent = `DOWNLOAD 16:9 ${fileExtension.substring(1).toUpperCase()}`;

    download9x16.href = url9x16;
    download9x16.download = `visualizer-9x16${fileExtension}`;
    download9x16.textContent = `DOWNLOAD 9:16 ${fileExtension.substring(1).toUpperCase()}`;

    downloadContainer.classList.remove("hidden");
    statusLine.textContent = "Rendering completed successfully!";
    statusLine.classList.remove("hidden");

  } catch (err) {
    console.error("Export Error: ", err);
    statusLine.textContent = `Error: ${err.message || err}`;
    statusLine.classList.remove("hidden");
    progressContainer.classList.add("hidden");
  } finally {
    // Graceful recovery
    renderBtn.disabled = false;
    playPreviewBtn.disabled = false;
  }
});
