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
let flowerRenderers = [];

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

// GLSL Shader Sources for WebGL Halftone Dot Pipeline
const VS_SOURCE = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FS_SOURCE = `
precision mediump float;
varying vec2 vUv;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uImgSize;
uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;

#define PI 3.141592653589793

void main() {
  float width = uResolution.x;
  float height = uResolution.y;

  float canvasX = vUv.x * width;
  float canvasY = (1.0 - vUv.y) * height;

  float baseSpacing = 7.6;
  float spacing = max(2.0, floor(baseSpacing * (height / 1080.0) + 0.5));
  float halfSpacing = spacing * 0.5;

  float gx = floor(canvasX / spacing);
  float gy = floor(canvasY / spacing);

  float cx = (gx + 0.5) * spacing;
  float cy = (gy + 0.5) * spacing;

  if (cx >= width || cy >= height) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float normX = cx / width;
  float normY = cy / height;
  float edgeFalloff = sin(normX * PI) * sin(normY * PI);

  float t = uTime;
  float dx = sin(t * 0.8 + normY * 3.1) * 0.5 +
             sin(t * 1.3 + normX * 2.5 + normY * 1.1) * 0.3 +
             sin(t * 0.5 - normX * 4.0) * 0.2;

  float dy = cos(t * 0.9 - normX * 3.5) * 0.5 +
             sin(t * 1.1 + normY * 2.8 - normX * 1.5) * 0.3 +
             cos(t * 0.6 + normY * 4.2) * 0.2;

  float maxDisplacement = width * 0.015;
  float offsetX = dx * maxDisplacement * edgeFalloff;
  float offsetY = dy * maxDisplacement * edgeFalloff;

  float sx = cx - offsetX;
  float sy = cy - offsetY;

  float targetSize = min(width, height) * 0.825;
  float imgRatio = uImgSize.x / uImgSize.y;

  float drawW = targetSize;
  float drawH = targetSize;

  if (imgRatio > 1.0) {
    drawH = targetSize / imgRatio;
  } else {
    drawW = targetSize * imgRatio;
  }

  float imgOffsetX = (width - drawW) * 0.5;
  float imgOffsetY = (height - drawH) * 0.5;

  float texU = (sx - imgOffsetX) / drawW;
  float texV = (sy - imgOffsetY) / drawH;

  if (texU < 0.0 || texU > 1.0 || texV < 0.0 || texV > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec4 texColor = texture2D(uTexture, vec2(texU, texV));

  if (texColor.a < 0.04) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float brightness = max(max(texColor.r, texColor.g), texColor.b);
  float baseRadius = halfSpacing * pow(brightness, 0.8) * 1.25;

  if (baseRadius < 0.1) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float audioMod = 1.0 + uAmplitude * 0.35 + uFrequency * 0.15;
  float radius = min(baseRadius * audioMod, halfSpacing);

  float dist = length(vec2(canvasX, canvasY) - vec2(cx, cy));

  if (dist > radius + 0.5) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float delta = max(0.5, halfSpacing * 0.12);
  float alpha = smoothstep(radius + 0.5, radius - delta, dist);

  vec3 col = texColor.rgb * alpha;
  gl_FragColor = vec4(col, 1.0);
}
`;

function createWebGLRenderer(canvas) {
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, alpha: false }) ||
             canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true, alpha: false });
  if (!gl) {
    logError("WebGL not supported");
    return null;
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      logError("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    logError("Program link error:", gl.getProgramInfoLog(program));
    return null;
  }

  gl.useProgram(program);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]), gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  const uTexture = gl.getUniformLocation(program, "uTexture");
  const uResolution = gl.getUniformLocation(program, "uResolution");
  const uImgSize = gl.getUniformLocation(program, "uImgSize");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uAmplitude = gl.getUniformLocation(program, "uAmplitude");
  const uFrequency = gl.getUniformLocation(program, "uFrequency");

  gl.uniform1i(uTexture, 0);

  let currentTexture = null;
  let currentImgSize = { x: 1, y: 1 };

  function setTexture(img) {
    if (!img) return;
    if (currentTexture) {
      gl.deleteTexture(currentTexture);
    }
    currentTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, currentTexture);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    currentImgSize = { x: img.width, y: img.height };
  }

  function render(timeSec, amplitude = 0, frequency = 0) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);

    if (currentTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, currentTexture);
    }

    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform2f(uImgSize, currentImgSize.x, currentImgSize.y);
    gl.uniform1f(uTime, timeSec);
    gl.uniform1f(uAmplitude, amplitude);
    gl.uniform1f(uFrequency, frequency);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  return { gl, setTexture, render };
}

function initFlowerGrid() {
  FLOWERS.forEach((flower, idx) => {
    const card = document.createElement("div");
    card.classList.add("flower-preview-card");
    if (idx === 0) card.classList.add("selected");

    const canvas = document.createElement("canvas");
    const PREVIEW_SIZE = 256;
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;

    card.appendChild(canvas);
    flowerGrid.appendChild(card);

    flowerCanvases.push(canvas);

    const renderer = createWebGLRenderer(canvas);
    flowerRenderers.push(renderer);

    card.addEventListener("click", () => {
      document.querySelectorAll(".flower-preview-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedFlowerIndex = idx;
    });

    const img = new Image();
    img.onload = () => {
      flowerBaseImages[idx] = img;
      if (renderer) {
        renderer.setTexture(img);
      }
      startPreviewLoop(idx);
    };
    img.onerror = () => {
      logError(`Failed to load flower image: ${flower.path}`);
    };
    img.src = flower.path;
  });
}

function startPreviewLoop(idx) {
  if (previewAnimationIds[idx]) cancelAnimationFrame(previewAnimationIds[idx]);

  const renderer = flowerRenderers[idx];
  const baseImage = flowerBaseImages[idx];

  function loop(timestamp) {
    if (!baseImage || !renderer) return;

    renderer.render(timestamp / 1000, 0, 0);

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

function extractAudioMetrics(audioBuffer, totalFrames, fps = 60) {
  if (!audioBuffer) {
    return new Array(totalFrames).fill({ amplitude: 0, frequency: 0 });
  }

  const sampleRate = audioBuffer.sampleRate;
  const totalSamples = audioBuffer.length;
  const samplesPerFrame = sampleRate / fps;

  const mono = mixDownToMono(audioBuffer);

  const rawAmplitude = new Float32Array(totalFrames);
  const rawFrequency = new Float32Array(totalFrames);

  let maxRms = 0.0001;
  let maxFreq = 0.0001;

  let startSample = 0;
  for (let f = 0; f < totalFrames; f++) {
    const endSample = Math.min(totalSamples, Math.floor((f + 1) * samplesPerFrame));
    const count = endSample - startSample;

    if (count <= 0) {
      rawAmplitude[f] = 0;
      rawFrequency[f] = 0;
      startSample = endSample;
      continue;
    }

    let sumSq = 0;
    let diffSum = 0;

    for (let s = startSample; s < endSample; s++) {
      const val = mono[s];
      sumSq += val * val;
      if (s > startSample) {
        diffSum += Math.abs(val - mono[s - 1]);
      }
    }

    const rms = Math.sqrt(sumSq / count);
    const freqMetric = count > 1 ? diffSum / (count - 1) : 0;

    rawAmplitude[f] = rms;
    rawFrequency[f] = freqMetric;

    if (rms > maxRms) maxRms = rms;
    if (freqMetric > maxFreq) maxFreq = freqMetric;

    startSample = endSample;
  }

  const metrics = new Array(totalFrames);
  const smoothWindow = 2;
  const invMaxRms = 1.0 / maxRms;
  const invMaxFreq = 1.0 / maxFreq;

  for (let f = 0; f < totalFrames; f++) {
    let ampSum = 0;
    let freqSum = 0;
    let count = 0;

    for (let off = -smoothWindow; off <= smoothWindow; off++) {
      const tf = f + off;
      if (tf >= 0 && tf < totalFrames) {
        ampSum += rawAmplitude[tf];
        freqSum += rawFrequency[tf];
        count++;
      }
    }

    const normAmp = Math.min(1.0, (ampSum / count) * invMaxRms);
    const normFreq = Math.min(1.0, (freqSum / count) * invMaxFreq);

    metrics[f] = { amplitude: normAmp, frequency: normFreq };
  }

  return metrics;
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

    const effectiveDuration = window.workingAudioBuffer.duration;
    const totalFrames = Math.ceil(effectiveDuration * fps);
    const frameDurationMicros = 1_000_000 / fps;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width;
    exportCanvas.height = height;

    const exportRenderer = createWebGLRenderer(exportCanvas);
    const baseImage = flowerBaseImages[selectedFlowerIndex];
    if (exportRenderer && baseImage) {
      exportRenderer.setTexture(baseImage);
    }

    // Extract audio metrics per frame
    const audioMetrics = extractAudioMetrics(window.workingAudioBuffer, totalFrames, fps);

    let muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width: width, height: height },
      fastStart: 'in-memory'
    });

    let videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: e => logError("Encoder Error:", e)
    });

    videoEncoder.configure({
      codec: 'avc1.420034',
      width: width,
      height: height,
      bitrate: 8_000_000,
      framerate: fps,
    });

    for (let i = 0; i < totalFrames; i++) {
      while (videoEncoder.encodeQueueSize > 2) {
        await new Promise(resolve => {
          videoEncoder.addEventListener("dequeue", resolve, { once: true });
        });
      }

      const simulationTimeMs = i * (1000 / fps);
      const { amplitude, frequency } = audioMetrics[i];

      if (exportRenderer) {
        exportRenderer.render(simulationTimeMs / 1000, amplitude, frequency);
      }

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
    logError("Export Error:", err);
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
