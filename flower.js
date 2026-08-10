// Configuration
const FLOWERS = [
  { name: 'Rose', path: 'assets/flowers/rose.png' },
  { name: 'Hibiscus', path: 'assets/flowers/Hibiscus.png' },
  { name: 'Blue Cosmos', path: 'assets/flowers/blue-cosmos.png' },
  { name: 'Sunflower', path: 'assets/flowers/sunflower.png' },
  { name: 'White Daisy', path: 'assets/flowers/white daisy.png' }
];

let selectedFlowerIndex = 0;
let previewAnimationIds = [];
let flowerBaseImages = [];
let flowerCanvases = [];
let flowerContexts = [];

// DOM Elements
const flowerSection = document.getElementById("flowerSection");
const flowerGrid = document.getElementById("flowerGrid");
const renderFlowerBtn = document.getElementById("renderFlowerBtn");

// Export UI Elements
const flowerProgressContainer = document.getElementById("flowerProgressContainer");
const flowerProgressPercentage = document.getElementById("flowerProgressPercentage");
const flowerProgressBarFill = document.getElementById("flowerProgressBarFill");
const flowerStatusLine = document.getElementById("flowerStatusLine");
const flowerDownloadContainer = document.getElementById("flowerDownloadContainer");
const flowerDownloadVideo = document.getElementById("flowerDownloadVideo");

let offscreenCanvas = document.createElement("canvas");
let offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

function initFlowerGrid() {
  FLOWERS.forEach((flower, idx) => {
    // Create card container
    const card = document.createElement("div");
    card.classList.add("flower-preview-card");
    if (idx === 0) card.classList.add("selected");

    // Create canvas
    const canvas = document.createElement("canvas");
    // Optimize performance: since cards are max ~200px wide, 256x256 is enough for preview.
    // However, keeping exactly the same logic but smaller sizes to avoid CPU lag
    const PREVIEW_SIZE = 256;
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    card.appendChild(canvas);
    flowerGrid.appendChild(card);

    flowerCanvases.push(canvas);
    flowerContexts.push(ctx);

    // Click event to select
    card.addEventListener("click", () => {
      document.querySelectorAll(".flower-preview-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedFlowerIndex = idx;
    });

    // Load image
    const img = new Image();
    img.onload = () => {
      flowerBaseImages[idx] = img;
      startPreviewLoop(idx);
    };
    img.onerror = () => {
      console.error(`Failed to load flower image: ${flower.path}`);
    };
    img.src = flower.path;
  });
}

function processOrganicWarp(timeMs, width, height, baseImage, outCtx) {
  if (!baseImage) return;

  outCtx.clearRect(0, 0, width, height);

  const targetSize = Math.min(width, height) * 0.825;
  const imgRatio = baseImage.width / baseImage.height;

  let drawW = targetSize;
  let drawH = targetSize;

  if (imgRatio > 1) {
    drawH = targetSize / imgRatio;
  } else {
    drawW = targetSize * imgRatio;
  }

  const offsetX = (width - drawW) / 2;
  const offsetY = (height - drawH) / 2;

  outCtx.drawImage(baseImage, offsetX, offsetY, drawW, drawH);

  const srcData = outCtx.getImageData(0, 0, width, height);
  const srcPixels = srcData.data;

  const dstData = outCtx.createImageData(width, height);
  const dstPixels = dstData.data;

  const gridCols = 12;
  const gridRows = 12;
  const cellW = width / (gridCols - 1);
  const cellH = height / (gridRows - 1);

  const t = timeMs / 1000;
  const maxDisplacement = width * 0.015;

  const gridOffsetsX = [];
  const gridOffsetsY = [];

  for (let r = 0; r < gridRows; r++) {
    const rowX = [];
    const rowY = [];
    const normY = r / (gridRows - 1);

    for (let c = 0; c < gridCols; c++) {
      const normX = c / (gridCols - 1);
      const edgeFalloff = Math.sin(normX * Math.PI) * Math.sin(normY * Math.PI);

      let dx = Math.sin(t * 0.8 + normY * 3.1) * 0.5 +
               Math.sin(t * 1.3 + normX * 2.5 + normY * 1.1) * 0.3 +
               Math.sin(t * 0.5 - normX * 4.0) * 0.2;

      let dy = Math.cos(t * 0.9 - normX * 3.5) * 0.5 +
               Math.sin(t * 1.1 + normY * 2.8 - normX * 1.5) * 0.3 +
               Math.cos(t * 0.6 + normY * 4.2) * 0.2;

      rowX.push(dx * maxDisplacement * edgeFalloff);
      rowY.push(dy * maxDisplacement * edgeFalloff);
    }
    gridOffsetsX.push(rowX);
    gridOffsetsY.push(rowY);
  }

  for (let y = 0; y < height; y++) {
    const gyF = y / cellH;
    const r0 = Math.floor(gyF);
    const r1 = Math.min(r0 + 1, gridRows - 1);
    const ty = gyF - r0;

    for (let x = 0; x < width; x++) {
      const gxF = x / cellW;
      const c0 = Math.floor(gxF);
      const c1 = Math.min(c0 + 1, gridCols - 1);
      const tx = gxF - c0;

      const dx00 = gridOffsetsX[r0][c0], dx10 = gridOffsetsX[r0][c1];
      const dx01 = gridOffsetsX[r1][c0], dx11 = gridOffsetsX[r1][c1];
      const dxTop = dx00 + (dx10 - dx00) * tx;
      const dxBot = dx01 + (dx11 - dx01) * tx;
      const offsetX = dxTop + (dxBot - dxTop) * ty;

      const dy00 = gridOffsetsY[r0][c0], dy10 = gridOffsetsY[r0][c1];
      const dy01 = gridOffsetsY[r1][c0], dy11 = gridOffsetsY[r1][c1];
      const dyTop = dy00 + (dy10 - dy00) * tx;
      const dyBot = dy01 + (dy11 - dy01) * tx;
      const offsetY = dyTop + (dyBot - dyTop) * ty;

      const sx = x - offsetX;
      const sy = y - offsetY;

      let srcIdx = 0;
      let dstIdx = (y * width + x) * 4;

      if (sx >= 0 && sx < width - 1 && sy >= 0 && sy < height - 1) {
        const sxi = Math.round(sx);
        const syi = Math.round(sy);
        srcIdx = (syi * width + sxi) * 4;

        dstPixels[dstIdx] = srcPixels[srcIdx];
        dstPixels[dstIdx + 1] = srcPixels[srcIdx + 1];
        dstPixels[dstIdx + 2] = srcPixels[srcIdx + 2];
        dstPixels[dstIdx + 3] = srcPixels[srcIdx + 3];
      } else {
        dstPixels[dstIdx + 3] = 0;
      }
    }
  }

  outCtx.putImageData(dstData, 0, 0);
}

function processHalftoneFilter(ctx, warpedCtx, width, height) {
  const warpedData = warpedCtx.getImageData(0, 0, width, height);
  const data = warpedData.data;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  const baseSpacing = 7.6;
  const spacing = Math.max(2, Math.round(baseSpacing * (height / 1080)));
  const halfSpacing = spacing / 2;

  for (let y = 0; y < height; y += spacing) {
    for (let x = 0; x < width; x += spacing) {
      const cx = x + halfSpacing;
      const cy = y + halfSpacing;

      if (cx >= width || cy >= height) continue;

      const sx = Math.floor(cx);
      const sy = Math.floor(cy);
      const idx = (sy * width + sx) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 10) continue;

      const brightness = Math.max(r, g, b) / 255;
      const radius = halfSpacing * Math.pow(brightness, 0.8) * 1.25;

      if (radius < 0.5) continue;

      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(radius, halfSpacing), 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fill();
    }
  }
}

function startPreviewLoop(idx) {
  if (previewAnimationIds[idx]) cancelAnimationFrame(previewAnimationIds[idx]);

  // We use a separate offscreen canvas for each loop to prevent conflicts
  const localOffscreenCanvas = document.createElement("canvas");
  const PREVIEW_SIZE = 256;
  localOffscreenCanvas.width = PREVIEW_SIZE;
  localOffscreenCanvas.height = PREVIEW_SIZE;
  const localOffscreenCtx = localOffscreenCanvas.getContext("2d", { willReadFrequently: true });

  const ctx = flowerContexts[idx];
  const baseImage = flowerBaseImages[idx];

  function loop(timestamp) {
    if (!baseImage) return;

    processOrganicWarp(timestamp, PREVIEW_SIZE, PREVIEW_SIZE, baseImage, localOffscreenCtx);
    processHalftoneFilter(ctx, localOffscreenCtx, PREVIEW_SIZE, PREVIEW_SIZE);

    previewAnimationIds[idx] = requestAnimationFrame(loop);
  }

  previewAnimationIds[idx] = requestAnimationFrame(loop);
}

function stopAllPreviews() {
  previewAnimationIds.forEach(id => {
    if (id) cancelAnimationFrame(id);
  });
}

function startAllPreviews() {
  for (let i = 0; i < FLOWERS.length; i++) {
    startPreviewLoop(i);
  }
}

// Ensure renderFlowerBtn is enabled when file is loaded and aspect ratio chosen
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === "class") {
       const aspectRatioSection = document.getElementById("aspectRatioSection");
       if (!aspectRatioSection.classList.contains("hidden")) {
          if (window.workingAudioBuffer) {
              renderFlowerBtn.disabled = false;
          }
       }
    }
  });
});
observer.observe(document.getElementById("aspectRatioSection"), { attributes: true });


// Render Export
async function renderAndExportFlowerVideo() {
  if (renderFlowerBtn.disabled || !window.workingAudioBuffer) return;

  stopAllPreviews();

  renderFlowerBtn.disabled = true;
  flowerProgressContainer.classList.remove("hidden");
  flowerDownloadContainer.classList.add("hidden");
  flowerStatusLine.classList.add("hidden");
  flowerProgressBarFill.style.width = "0%";
  flowerProgressPercentage.textContent = "0%";

  try {
    const fps = 60;
    const width = 1080;
    const height = 1080;

    // We get the duration from window.workingAudioBuffer
    const effectiveDuration = window.workingAudioBuffer.duration;

    const totalFrames = Math.ceil(effectiveDuration * fps);
    const frameDurationMicros = 1_000_000 / fps;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exportCtx = exportCanvas.getContext("2d", { willReadFrequently: true });

    const offscreenCanvas2 = document.createElement("canvas");
    offscreenCanvas2.width = width;
    offscreenCanvas2.height = height;
    const offscreenCtx2 = offscreenCanvas2.getContext("2d", { willReadFrequently: true });

    let muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width: width, height: height },
      fastStart: 'in-memory'
    });

    let videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: e => console.error("Encoder Error:", e)
    });

    videoEncoder.configure({
      codec: 'avc1.420034',
      width: width,
      height: height,
      bitrate: 8_000_000,
      framerate: fps,
    });

    const baseImage = flowerBaseImages[selectedFlowerIndex];

    for (let i = 0; i < totalFrames; i++) {
      while (videoEncoder.encodeQueueSize > 2) {
        await new Promise(resolve => {
          videoEncoder.addEventListener("dequeue", resolve, { once: true });
        });
      }

      const simulationTimeMs = i * (1000 / fps);
      processOrganicWarp(simulationTimeMs, width, height, baseImage, offscreenCtx2);
      processHalftoneFilter(exportCtx, offscreenCtx2, width, height);

      const frame = new VideoFrame(exportCanvas, {
        timestamp: i * frameDurationMicros,
        duration: frameDurationMicros
      });

      videoEncoder.encode(frame);
      frame.close();

      if (i % 15 === 0) {
        const progress = Math.min(100, Math.round((i / totalFrames) * 100));
        flowerProgressBarFill.style.width = `${progress}%`;
        flowerProgressPercentage.textContent = `${progress}%`;
      }
    }

    flowerProgressBarFill.style.width = "100%";
    flowerProgressPercentage.textContent = "100%";

    await videoEncoder.flush();
    videoEncoder.close();
    muxer.finalize();

    const buffer = muxer.target.buffer;
    const blob = new Blob([buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);

    flowerDownloadVideo.href = url;
    flowerDownloadVideo.download = `flower-background-1x1.mp4`;

    flowerProgressContainer.classList.add("hidden");
    flowerDownloadContainer.classList.remove("hidden");
    flowerStatusLine.textContent = "Rendering completed successfully!";
    flowerStatusLine.classList.remove("hidden");

  } catch (err) {
    console.error("Export Error:", err);
    flowerStatusLine.textContent = `Error: ${err.message || err}`;
    flowerStatusLine.classList.remove("hidden");
    flowerProgressContainer.classList.add("hidden");
  } finally {
    renderFlowerBtn.disabled = false;
    startAllPreviews();
  }
}

renderFlowerBtn.addEventListener("click", renderAndExportFlowerVideo);

initFlowerGrid();
