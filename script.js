// Web Audio context management
let audioCtx = null;
let decodedAudioBuffer = null;
let frameEnvelopeArray = null; // cached analysis results
let activePreviewSource = null;
let activePreviewAnalyser = null;
let isPreviewPlaying = false;
let previewAnimationId = null;
let previewStartTime = 0;

// Edit State
window.workingAudioBuffer = null;
let keepRanges = []; // Array of {start: 0, end: 0}
let editHistory = [];

// Aspect Ratio Config
let chosenWidth = null;
let chosenHeight = null;

// UI Elements
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileInfoContainer = document.getElementById("fileInfoContainer");
const fileName = document.getElementById("fileName");
const fileDuration = document.getElementById("fileDuration");
const durationWarning = document.getElementById("durationWarning");
const decodeError = document.getElementById("decodeError");
const previewCanvas = document.getElementById("previewCanvas");
const showEditBtn = document.getElementById("showEditBtn");

// Edit UI Elements
const editSection = document.getElementById("editSection");
const originalLengthEl = document.getElementById("originalLength");
const editedLengthEl = document.getElementById("editedLength");
const editDurationWarning = document.getElementById("editDurationWarning");
const editorContainer = document.getElementById("editorContainer");
const overviewCanvas = document.getElementById("overviewCanvas");
const selectionHighlight = document.getElementById("selectionHighlight");
const leftTrimHandle = document.getElementById("leftTrimHandle");
const rightTrimHandle = document.getElementById("rightTrimHandle");
const leftTrimReadout = document.getElementById("leftTrimReadout");
const rightTrimReadout = document.getElementById("rightTrimReadout");
const playheadLine = document.getElementById("playheadLine");
const cutSelectedBtn = document.getElementById("cutSelectedBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");
const continueBtn = document.getElementById("continueBtn");

const ctxOverview = overviewCanvas.getContext("2d");
const playPreviewBtn = document.getElementById("playPreviewBtn");
const renderBtn = document.getElementById("renderBtn");
const progressContainer = document.getElementById("progressContainer");
const progressLabel = document.getElementById("progressLabel");
const progressPercentage = document.getElementById("progressPercentage");
const progressBarFill = document.getElementById("progressBarFill");
const statusLine = document.getElementById("statusLine");
const downloadContainer = document.getElementById("downloadContainer");
const downloadVideo = document.getElementById("downloadVideo");

// Aspect Ratio Cards UI
const aspectRatioSection = document.getElementById("aspectRatioSection");
const card16x9 = document.getElementById("card16x9");
const card9x16 = document.getElementById("card9x16");

// Canvas contexts and configurations
const ctxPreview = previewCanvas.getContext("2d");

// Helper to format duration in mm:ss
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Helper to format duration in mm:ss.s for trim handles
function formatDurationDetailed(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  const ms = Math.floor((seconds % 1) * 10).toString();
  return `${m}:${s}.${ms}`;
}

// Build the working audio buffer from decodedAudioBuffer based on keepRanges
function buildWorkingAudioBuffer() {
  if (!decodedAudioBuffer) return null;
  if (keepRanges.length === 0) return decodedAudioBuffer;

  const sampleRate = decodedAudioBuffer.sampleRate;
  const numChannels = decodedAudioBuffer.numberOfChannels;

  // Calculate total samples needed
  let totalKeptSamples = 0;
  for (const range of keepRanges) {
    const rangeDuration = range.end - range.start;
    totalKeptSamples += Math.floor(rangeDuration * sampleRate);
  }

  // Create new AudioBuffer
  const newBuffer = audioCtx.createBuffer(numChannels, totalKeptSamples, sampleRate);
  const fadeDuration = 0.008; // 8ms fade
  const fadeSamples = Math.floor(fadeDuration * sampleRate);

  for (let c = 0; c < numChannels; c++) {
    const channelData = decodedAudioBuffer.getChannelData(c);
    const newChannelData = newBuffer.getChannelData(c);

    let destOffset = 0;
    for (const range of keepRanges) {
      const startSample = Math.floor(range.start * sampleRate);
      const endSample = Math.floor(range.end * sampleRate);
      const rangeSamples = endSample - startSample;

      for (let i = 0; i < rangeSamples; i++) {
        let sample = channelData[startSample + i];

        // Apply fade-in
        if (i < fadeSamples) {
          sample *= (i / fadeSamples);
        }
        // Apply fade-out
        else if (i > rangeSamples - fadeSamples - 1) {
          const fadeIndex = rangeSamples - 1 - i;
          sample *= (fadeIndex / fadeSamples);
        }

        newChannelData[destOffset++] = sample;
      }
    }
  }

  return newBuffer;
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

// Draw static overview for edit section (200 bars)
function drawOverview(audioBuffer) {
  const w = overviewCanvas.width;
  const h = overviewCanvas.height;

  ctxOverview.fillStyle = "#000000";
  ctxOverview.fillRect(0, 0, w, h);

  const duration = audioBuffer.duration;
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = audioBuffer.length;

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

  const numBars = 200;
  const samplesPerBar = totalSamples / numBars;
  const amplitudes = new Float32Array(numBars);
  let globalMax = 0;

  for (let i = 0; i < numBars; i++) {
    const startSample = Math.floor(i * samplesPerBar);
    const endSample = Math.floor((i + 1) * samplesPerBar);

    let sumSquares = 0;
    let count = 0;
    for (let s = startSample; s < endSample && s < totalSamples; s++) {
      const val = monoSamples[s];
      sumSquares += val * val;
      count++;
    }
    const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
    amplitudes[i] = rms;
    if (rms > globalMax) globalMax = rms;
  }

  if (globalMax === 0) globalMax = 1;

  const gap = w * 0.003;
  const totalGap = gap * (numBars - 1);
  const barWidth = (w - totalGap) / numBars;
  const maxBarHeight = h * 0.8;
  const minBarHeight = h * 0.05;

  for (let i = 0; i < numBars; i++) {
    const amp = amplitudes[i] / globalMax;
    const barHeight = Math.max(minBarHeight, amp * maxBarHeight);
    const x = i * (barWidth + gap);
    const y = (h - barHeight) / 2;

    // Check if bar is in kept ranges
    const barStartTime = (i / numBars) * duration;
    const barEndTime = ((i + 1) / numBars) * duration;
    const barCenterTime = (barStartTime + barEndTime) / 2;

    let isKept = false;
    for (const range of keepRanges) {
      if (barCenterTime >= range.start && barCenterTime <= range.end) {
        isKept = true;
        break;
      }
    }

    ctxOverview.fillStyle = isKept ? "#ffffff" : "#7a7a76";

    const radius = Math.min(barWidth / 2, 2);
    drawRoundedRect(ctxOverview, x, y, barWidth, barHeight, radius);
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

// Set initial size of preview canvas to 1280x720 and draw idle state
previewCanvas.width = 1280;
previewCanvas.height = 720;
drawIdleState();

// Card selection handling
function selectAspectRatio(width, height, cardToSelect, cardToDeselect) {
  if (renderBtn.disabled && decodedAudioBuffer === null) return; // Do not select if rendering or not loaded

  chosenWidth = width;
  chosenHeight = height;

  cardToDeselect.classList.remove("selected");
  cardToSelect.classList.add("selected");

  // Re-size preview canvas and draw immediately
  previewCanvas.width = chosenWidth;
  previewCanvas.height = chosenHeight;
  drawIdleState();

  // Enable Render Button if we have audio decoded
  if (decodedAudioBuffer) {
    renderBtn.disabled = false;
  }
}

card16x9.addEventListener("click", () => {
  if (card16x9.classList.contains("disabled")) return;
  selectAspectRatio(1280, 720, card16x9, card9x16);
});

card9x16.addEventListener("click", () => {
  if (card9x16.classList.contains("disabled")) return;
  selectAspectRatio(720, 1280, card9x16, card16x9);
});

// Edit Interaction Logic
let isDraggingLeftHandle = false;
let isDraggingRightHandle = false;
let isDraggingSelection = false;
let selectionStartX = null;
let selectionEndX = null;

function updateEditStats() {
  if (!decodedAudioBuffer) return;
  const originalDuration = decodedAudioBuffer.duration;
  let editedDuration = 0;
  for (const range of keepRanges) {
    editedDuration += (range.end - range.start);
  }

  originalLengthEl.textContent = formatDuration(originalDuration);
  editedLengthEl.textContent = formatDuration(editedDuration);

  if (editedDuration > 150) {
    editDurationWarning.classList.remove("hidden");
  } else {
    editDurationWarning.classList.add("hidden");
  }
}

function updateTrimHandles() {
  if (!decodedAudioBuffer || keepRanges.length === 0) return;
  const duration = decodedAudioBuffer.duration;
  const w = editorContainer.clientWidth;

  const firstRange = keepRanges[0];
  const lastRange = keepRanges[keepRanges.length - 1];

  const leftPx = (firstRange.start / duration) * w;
  const rightPx = (lastRange.end / duration) * w;

  leftTrimHandle.style.left = `${leftPx}px`;
  rightTrimHandle.style.left = `${rightPx}px`;

  leftTrimReadout.textContent = formatDurationDetailed(firstRange.start);
  rightTrimReadout.textContent = formatDurationDetailed(lastRange.end);
}

function renderEditState() {
  updateEditStats();
  updateTrimHandles();
  drawOverview(decodedAudioBuffer);

  undoBtn.disabled = editHistory.length === 0;

  // Disable reset if keepRanges is exactly one range covering full length
  const isFull = keepRanges.length === 1 &&
                 keepRanges[0].start === 0 &&
                 keepRanges[0].end === decodedAudioBuffer.duration;
  resetBtn.disabled = isFull;

  if (decodedAudioBuffer) {
    continueBtn.disabled = false;
    playPreviewBtn.disabled = false;
  }
}

function saveEditState() {
  editHistory.push(JSON.parse(JSON.stringify(keepRanges)));
}

// Mouse / Touch Handlers for Editor
function getCanvasX(e) {
  const rect = editorContainer.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return Math.max(0, Math.min(clientX - rect.left, rect.width));
}

// Left Handle Drag
leftTrimHandle.addEventListener("mousedown", (e) => {
  isDraggingLeftHandle = true;
  leftTrimHandle.classList.add("dragging");
  e.stopPropagation();
});
leftTrimHandle.addEventListener("touchstart", (e) => {
  isDraggingLeftHandle = true;
  leftTrimHandle.classList.add("dragging");
  e.stopPropagation();
});

// Right Handle Drag
rightTrimHandle.addEventListener("mousedown", (e) => {
  isDraggingRightHandle = true;
  rightTrimHandle.classList.add("dragging");
  e.stopPropagation();
});
rightTrimHandle.addEventListener("touchstart", (e) => {
  isDraggingRightHandle = true;
  rightTrimHandle.classList.add("dragging");
  e.stopPropagation();
});

// Selection Drag
editorContainer.addEventListener("mousedown", (e) => {
  if (isDraggingLeftHandle || isDraggingRightHandle) return;
  isDraggingSelection = true;
  selectionStartX = getCanvasX(e);
  selectionEndX = selectionStartX;
  updateSelectionHighlight();
});
editorContainer.addEventListener("touchstart", (e) => {
  if (isDraggingLeftHandle || isDraggingRightHandle) return;
  isDraggingSelection = true;
  selectionStartX = getCanvasX(e);
  selectionEndX = selectionStartX;
  updateSelectionHighlight();
});

function updateSelectionHighlight() {
  if (selectionStartX === null || selectionEndX === null) {
    selectionHighlight.classList.add("hidden");
    cutSelectedBtn.disabled = true;
    return;
  }

  const minX = Math.min(selectionStartX, selectionEndX);
  const maxX = Math.max(selectionStartX, selectionEndX);
  const width = maxX - minX;

  if (width > 0) {
    selectionHighlight.style.left = `${minX}px`;
    selectionHighlight.style.width = `${width}px`;
    selectionHighlight.classList.remove("hidden");
    cutSelectedBtn.disabled = false;
  } else {
    selectionHighlight.classList.add("hidden");
    cutSelectedBtn.disabled = true;
  }
}

window.addEventListener("mousemove", (e) => {
  if (!decodedAudioBuffer) return;
  const x = getCanvasX(e);
  const duration = decodedAudioBuffer.duration;
  const w = editorContainer.clientWidth;
  let timePos = (x / w) * duration;
  timePos = Math.max(0, Math.min(timePos, duration));

  let totalDurationWithoutFirst = 0;
  for (let i = 1; i < keepRanges.length; i++) {
    totalDurationWithoutFirst += keepRanges[i].end - keepRanges[i].start;
  }

  let totalDurationWithoutLast = 0;
  for (let i = 0; i < keepRanges.length - 1; i++) {
    totalDurationWithoutLast += keepRanges[i].end - keepRanges[i].start;
  }

  if (isDraggingLeftHandle) {
    let maxStart = keepRanges[0].end - (1 - totalDurationWithoutFirst);
    if (keepRanges.length === 1) {
       maxStart = keepRanges[0].end - 1;
    }
    // Also enforce that the handle doesn't cross the end of its own range
    maxStart = Math.min(maxStart, keepRanges[0].end - 0.05); // ensure start < end
    const newStart = Math.min(timePos, maxStart);
    keepRanges[0].start = Math.max(0, newStart);

    // Auto-update while dragging without saving history
    renderEditState();
  } else if (isDraggingRightHandle) {
    let minEnd = keepRanges[keepRanges.length - 1].start + (1 - totalDurationWithoutLast);
    if (keepRanges.length === 1) {
       minEnd = keepRanges[0].start + 1;
    }
    // Also enforce that the handle doesn't cross the start of its own range
    minEnd = Math.max(minEnd, keepRanges[keepRanges.length - 1].start + 0.05); // ensure end > start
    const newEnd = Math.max(timePos, minEnd);
    keepRanges[keepRanges.length - 1].end = Math.min(duration, newEnd);

    // Auto-update while dragging without saving history
    renderEditState();
  } else if (isDraggingSelection) {
    selectionEndX = x;
    updateSelectionHighlight();
  }
});

window.addEventListener("touchmove", (e) => {
  // exact same logic as mousemove
  if (!decodedAudioBuffer) return;
  const x = getCanvasX(e);
  const duration = decodedAudioBuffer.duration;
  const w = editorContainer.clientWidth;
  let timePos = (x / w) * duration;
  timePos = Math.max(0, Math.min(timePos, duration));

  let totalDurationWithoutFirst = 0;
  for (let i = 1; i < keepRanges.length; i++) {
    totalDurationWithoutFirst += keepRanges[i].end - keepRanges[i].start;
  }

  let totalDurationWithoutLast = 0;
  for (let i = 0; i < keepRanges.length - 1; i++) {
    totalDurationWithoutLast += keepRanges[i].end - keepRanges[i].start;
  }

  if (isDraggingLeftHandle) {
    let maxStart = keepRanges[0].end - (1 - totalDurationWithoutFirst);
    if (keepRanges.length === 1) {
       maxStart = keepRanges[0].end - 1;
    }
    // Also enforce that the handle doesn't cross the end of its own range
    maxStart = Math.min(maxStart, keepRanges[0].end - 0.05); // ensure start < end
    const newStart = Math.min(timePos, maxStart);
    keepRanges[0].start = Math.max(0, newStart);
    renderEditState();
  } else if (isDraggingRightHandle) {
    let minEnd = keepRanges[keepRanges.length - 1].start + (1 - totalDurationWithoutLast);
    if (keepRanges.length === 1) {
       minEnd = keepRanges[0].start + 1;
    }
    // Also enforce that the handle doesn't cross the start of its own range
    minEnd = Math.max(minEnd, keepRanges[keepRanges.length - 1].start + 0.05); // ensure end > start
    const newEnd = Math.max(timePos, minEnd);
    keepRanges[keepRanges.length - 1].end = Math.min(duration, newEnd);
    renderEditState();
  } else if (isDraggingSelection) {
    selectionEndX = x;
    updateSelectionHighlight();
  }
}, {passive: false});

function stopDragging() {
  if (isDraggingLeftHandle || isDraggingRightHandle) {
    // Only push to history when they finish a drag to avoid massive history array
    // Wait, requirement: "pushed onto it immediately before every trim or cut action is applied"
    // For trim handles, it's smoother to push on mouseup *if* a change occurred. Let's do it simply on mouseup.
    // Actually wait, let's push to history on mousedown if we want it *before*.
    // To match requirement: we push to history when drag starts, in the event listeners.
    // But since I didn't push in mousedown, I will just push to history *before* we modify it?
    // Wait, the easiest is to just push on mouseup, but let's just make sure we capture it before the edit.
  }

  if (isDraggingLeftHandle) {
    isDraggingLeftHandle = false;
    leftTrimHandle.classList.remove("dragging");
    renderEditState();
  }
  if (isDraggingRightHandle) {
    isDraggingRightHandle = false;
    rightTrimHandle.classList.remove("dragging");
    renderEditState();
  }
  if (isDraggingSelection) {
    isDraggingSelection = false;
  }
}

// We need to fix the history requirement for dragging handles.
// Add history save to mousedown:
leftTrimHandle.addEventListener("mousedown", () => saveEditState());
leftTrimHandle.addEventListener("touchstart", () => saveEditState());
rightTrimHandle.addEventListener("mousedown", () => saveEditState());
rightTrimHandle.addEventListener("touchstart", () => saveEditState());

window.addEventListener("mouseup", stopDragging);
window.addEventListener("touchend", stopDragging);


// Cut Action
cutSelectedBtn.addEventListener("click", () => {
  if (selectionStartX === null || selectionEndX === null || !decodedAudioBuffer) return;

  saveEditState();

  const w = editorContainer.clientWidth;
  const duration = decodedAudioBuffer.duration;

  const minX = Math.min(selectionStartX, selectionEndX);
  const maxX = Math.max(selectionStartX, selectionEndX);

  const selectStart = (minX / w) * duration;
  const selectEnd = (maxX / w) * duration;

  const newRanges = [];

  for (const range of keepRanges) {
    if (selectEnd <= range.start || selectStart >= range.end) {
      // No overlap
      newRanges.push(range);
    } else if (selectStart <= range.start && selectEnd >= range.end) {
      // Fully covered, remove entirely
    } else if (selectStart > range.start && selectEnd < range.end) {
      // Falls entirely inside, split
      newRanges.push({start: range.start, end: selectStart});
      newRanges.push({start: selectEnd, end: range.end});
    } else if (selectStart <= range.start && selectEnd < range.end) {
      // Overlaps beginning, shrink start
      newRanges.push({start: selectEnd, end: range.end});
    } else if (selectStart > range.start && selectEnd >= range.end) {
      // Overlaps end, shrink end
      newRanges.push({start: range.start, end: selectStart});
    }
  }

  // Discard < 0.05s
  keepRanges = newRanges.filter(r => (r.end - r.start) >= 0.05);

  // Clear selection
  selectionStartX = null;
  selectionEndX = null;
  updateSelectionHighlight();

  renderEditState();
});

undoBtn.addEventListener("click", () => {
  if (editHistory.length > 0) {
    keepRanges = editHistory.pop();
    selectionStartX = null;
    selectionEndX = null;
    updateSelectionHighlight();
    renderEditState();
  }
});

resetBtn.addEventListener("click", () => {
  if (decodedAudioBuffer) {
    editHistory = [];
    keepRanges = [{start: 0, end: decodedAudioBuffer.duration}];
    selectionStartX = null;
    selectionEndX = null;
    updateSelectionHighlight();
    renderEditState();
  }
});

showEditBtn.addEventListener("click", () => {
  editSection.classList.remove("hidden");
  showEditBtn.classList.add("hidden");
  aspectRatioSection.classList.add("hidden"); // Optional, hide aspect ratio while editing
  renderBtn.disabled = true; // Disable render until "Continue" is clicked
});

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
  chosenWidth = null;
  chosenHeight = null;
  card16x9.classList.remove("selected", "disabled");
  card9x16.classList.remove("selected", "disabled");
  showEditBtn.classList.add("hidden");
  editSection.classList.add("hidden");

  fileInfoContainer.classList.add("hidden");
  durationWarning.classList.add("hidden");
  decodeError.classList.add("hidden");
  playPreviewBtn.disabled = true;
  renderBtn.disabled = true;
  progressContainer.classList.add("hidden");
  downloadContainer.classList.add("hidden");
  statusLine.classList.add("hidden");
  aspectRatioSection.classList.add("hidden");

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
      window.workingAudioBuffer = null;
      keepRanges = [{start: 0, end: audioBuffer.duration}];
      editHistory = [];

      const duration = audioBuffer.duration;
      fileDuration.textContent = formatDuration(duration);

      // Warn if duration is > 150 seconds
      if (duration > 150) {
        durationWarning.classList.remove("hidden");
      } else {
        durationWarning.classList.add("hidden");
      }

      // Enable Edit Audio button and move straight to Aspect Ratio Section
      renderEditState();
      showEditBtn.classList.remove("hidden");

      // We automatically jump to aspect ratio section since edit is optional
      window.workingAudioBuffer = buildWorkingAudioBuffer();
      aspectRatioSection.classList.remove("hidden");
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

// Custom helper to safely check state
function startPreview() {
  if (!decodedAudioBuffer) return;

  const bufferToPlay = buildWorkingAudioBuffer();

  // Context must be in running state (mobile gesture safety)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  // Set up source node
  activePreviewSource = audioCtx.createBufferSource();
  activePreviewSource.buffer = bufferToPlay;

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
  previewStartTime = audioCtx.currentTime;
  runPreviewLoop();
}

function stopPreview() {
  isPreviewPlaying = false;
  playPreviewBtn.textContent = "PLAY PREVIEW";
  playheadLine.classList.add("hidden");

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

  if (audioCtx && activePreviewSource && decodedAudioBuffer) {
    const elapsed = audioCtx.currentTime - previewStartTime;
    let mappedTime = elapsed;

    // Map elapsed time through keepRanges to original timeline position
    let accumulatedDur = 0;
    let found = false;
    for (const range of keepRanges) {
      const rangeDur = range.end - range.start;
      if (mappedTime <= accumulatedDur + rangeDur) {
        mappedTime = range.start + (mappedTime - accumulatedDur);
        found = true;
        break;
      }
      accumulatedDur += rangeDur;
    }
    if (!found) {
      mappedTime = keepRanges[keepRanges.length - 1].end;
    }

    // Position playhead on overview
    const duration = decodedAudioBuffer.duration;
    const w = editorContainer.clientWidth;
    const leftPx = (mappedTime / duration) * w;
    playheadLine.style.left = `${leftPx}px`;
    playheadLine.classList.remove("hidden");
  }

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

// Render loop that executes fast canvas capture using WebCodecs
async function renderFormat(envelope, width, height, progressCallback) {
  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;
  const offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

  const fps = 60;
  const frameDurationMicros = 1_000_000 / fps;
  const totalFrames = envelope.length;

  let muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width: width,
      height: height
    },
    fastStart: 'in-memory'
  });

  let videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: e => console.error(e)
  });

  const videoConfig = {
    codec: 'avc1.420034', // Baseline profile, level 5.2 to support 1280x720 and 720x1280
    width: width,
    height: height,
    bitrate: 8_000_000,
    framerate: fps,
  };
  videoEncoder.configure(videoConfig);

  for (let i = 0; i < totalFrames; i++) {
    // Backpressure handling: wait if queue is too large
    while (videoEncoder.encodeQueueSize > 2) {
      await new Promise(resolve => {
        videoEncoder.addEventListener("dequeue", resolve, { once: true });
      });
    }

    // Render frame on offscreen context
    drawBars(offscreenCtx, envelope[i], width, height);

    // Create VideoFrame and encode
    const frame = new VideoFrame(offscreenCanvas, {
      timestamp: i * frameDurationMicros,
      duration: frameDurationMicros
    });

    videoEncoder.encode(frame);
    frame.close();

    if (i % 30 === 0) { // Update progress UI without blocking CPU forever
      const progress = Math.min(100, Math.round((i / totalFrames) * 100));
      progressCallback(progress);
    }
  }

  progressCallback(100);

  await videoEncoder.flush();
  videoEncoder.close();
  muxer.finalize();

  const buffer = muxer.target.buffer;
  return new Blob([buffer], { type: 'video/mp4' });
}

// Diagnostic duration safeguard helper
function checkBlobDuration(blob, expectedDurationSec) {
  const videoEl = document.createElement("video");
  videoEl.preload = "metadata";
  videoEl.muted = true;
  videoEl.playsInline = true;

  videoEl.onloadedmetadata = () => {
    const actualDuration = videoEl.duration;
    if (Math.abs(actualDuration - expectedDurationSec) > 0.5) {
      console.warn(
        `Safeguard warning: Exported video duration (${actualDuration.toFixed(2)}s) differs from source audio duration (${expectedDurationSec.toFixed(2)}s) by more than 0.5s.`
      );
    }
    // Cleanup URL
    URL.revokeObjectURL(videoEl.src);
  };

  videoEl.onerror = () => {
    console.warn("Safeguard warning: Could not load metadata to check video duration.");
    URL.revokeObjectURL(videoEl.src);
  };

  videoEl.src = URL.createObjectURL(blob);
}

// Continue Button Handler
continueBtn.addEventListener("click", () => {
  stopPreview();

  // Build the final working buffer to use downstream
  window.workingAudioBuffer = buildWorkingAudioBuffer();

  // Hide edit section, show next steps
  editSection.classList.add("hidden");
  showEditBtn.classList.remove("hidden");

  // Aspect ratio section and Preview section are active now
  aspectRatioSection.classList.remove("hidden");

  // The downstream renderBtn is disabled until aspect ratio is selected
  // unless an aspect ratio is already chosen.
  if (chosenWidth && chosenHeight) {
    renderBtn.disabled = false;
  } else {
    renderBtn.disabled = true;
  }
});


// Main Controller Render Trigger
renderBtn.addEventListener("click", async () => {
  if (!window.workingAudioBuffer || !chosenWidth || !chosenHeight) return;

  // Stop active preview
  stopPreview();

  // Reset progress, disable buttons and aspect cards during render
  renderBtn.disabled = true;
  playPreviewBtn.disabled = true;
  card16x9.classList.add("disabled");
  card9x16.classList.add("disabled");
  progressContainer.classList.remove("hidden");
  downloadContainer.classList.add("hidden");
  statusLine.classList.add("hidden");

  try {
    const duration = window.workingAudioBuffer.duration;

    // Step 1: Run analytical audio decoder (always re-run to ensure edits are applied)
    statusLine.textContent = "Analyzing audio frequencies...";
    statusLine.classList.remove("hidden");

    // Let layout update before blocking CPU slightly
    await new Promise(r => setTimeout(r, 50));
    frameEnvelopeArray = analyzeAudio(window.workingAudioBuffer);

    const fileExtension = ".mp4";

    const ratioLabel = chosenWidth === 1280 ? "16:9" : "9:16";
    progressLabel.textContent = `RENDERING ${ratioLabel} FORMAT...`;
    progressBarFill.style.width = "0%";
    progressPercentage.textContent = "0%";
    statusLine.classList.add("hidden");

    // Step 2 & 3: Render only the chosen aspect ratio format
    const blob = await renderFormat(
      frameEnvelopeArray,
      chosenWidth,
      chosenHeight,
      (progress) => {
        progressBarFill.style.width = `${progress}%`;
        progressPercentage.textContent = `${progress}%`;
      }
    );

    let finalBlob = blob;

    // Safeguard duration check
    checkBlobDuration(finalBlob, duration);

    // Render Completed successfully!
    progressContainer.classList.add("hidden");

    // Create Download Link
    const url = URL.createObjectURL(finalBlob);
    const filenameLabel = chosenWidth === 1280 ? "16x9" : "9x16";

    downloadVideo.href = url;
    downloadVideo.download = `visualizer-${filenameLabel}${fileExtension}`;
    downloadVideo.textContent = `DOWNLOAD VIDEO (${fileExtension.substring(1).toUpperCase()})`;

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
    card16x9.classList.remove("disabled");
    card9x16.classList.remove("disabled");
  }
});
