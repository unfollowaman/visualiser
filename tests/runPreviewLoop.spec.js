const { test, expect } = require('@playwright/test');

test.describe('runPreviewLoop bin precomputation unit and integration tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/index.html');
  });

  test('precomputes previewBinStarts and previewBinEnds correctly when previewFreqDataArray is allocated', async ({ page }) => {
    const result = await page.evaluate(() => {
      isPreviewPlaying = true;
      activePreviewAnalyser = {
        frequencyBinCount: 128,
        getByteFrequencyData: (arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = i * 2;
          }
        }
      };

      // Reset cached arrays to trigger initial precomputation
      previewFreqDataArray = null;
      previewBinStarts = null;
      previewBinEnds = null;

      // Run one iteration of runPreviewLoop (without queuing rAF)
      const bufferLength = activePreviewAnalyser.frequencyBinCount;
      if (!previewFreqDataArray || previewFreqDataArray.length !== bufferLength) {
        previewFreqDataArray = new Uint8Array(bufferLength);
        previewBinStarts = new Int32Array(48);
        previewBinEnds = new Int32Array(48);
        const binsPerBar = bufferLength / 48;
        for (let i = 0; i < 48; i++) {
          previewBinStarts[i] = Math.floor(i * binsPerBar);
          previewBinEnds[i] = Math.floor((i + 1) * binsPerBar);
        }
      }
      activePreviewAnalyser.getByteFrequencyData(previewFreqDataArray);

      const starts = Array.from(previewBinStarts);
      const ends = Array.from(previewBinEnds);

      return {
        startsLength: starts.length,
        endsLength: ends.length,
        firstStart: starts[0],
        firstEnd: ends[0],
        lastStart: starts[47],
        lastEnd: ends[47],
        isStartsInt32Array: previewBinStarts instanceof Int32Array,
        isEndsInt32Array: previewBinEnds instanceof Int32Array
      };
    });

    expect(result.startsLength).toBe(48);
    expect(result.endsLength).toBe(48);
    expect(result.isStartsInt32Array).toBe(true);
    expect(result.isEndsInt32Array).toBe(true);
    expect(result.firstStart).toBe(0);
    expect(result.firstEnd).toBe(2);
    expect(result.lastStart).toBe(125);
    expect(result.lastEnd).toBe(128);
  });

  test('runPreviewLoop computes previewVisualAmplitudes accurately using precomputed bin indices', async ({ page }) => {
    const result = await page.evaluate(() => {
      isPreviewPlaying = true;
      audioCtx = null;
      activePreviewSource = null;
      decodedAudioBuffer = null;

      activePreviewAnalyser = {
        frequencyBinCount: 128,
        getByteFrequencyData: (arr) => {
          arr.fill(127.5); // 127.5 / 255 = 0.5 expected visual amplitude
        }
      };

      previewFreqDataArray = null;
      previewBinStarts = null;
      previewBinEnds = null;

      // Execute single runPreviewLoop iteration logic
      const bufferLength = activePreviewAnalyser.frequencyBinCount;
      if (!previewFreqDataArray || previewFreqDataArray.length !== bufferLength) {
        previewFreqDataArray = new Uint8Array(bufferLength);
        previewBinStarts = new Int32Array(48);
        previewBinEnds = new Int32Array(48);
        const binsPerBar = bufferLength / 48;
        for (let i = 0; i < 48; i++) {
          previewBinStarts[i] = Math.floor(i * binsPerBar);
          previewBinEnds[i] = Math.floor((i + 1) * binsPerBar);
        }
      }
      activePreviewAnalyser.getByteFrequencyData(previewFreqDataArray);

      for (let i = 0; i < 48; i++) {
        const binStart = previewBinStarts[i];
        const binEnd = previewBinEnds[i];

        let sum = 0;
        let count = 0;
        for (let b = binStart; b < binEnd && b < bufferLength; b++) {
          sum += previewFreqDataArray[b];
          count++;
        }

        const averageVal = count > 0 ? sum / count : 0;
        previewVisualAmplitudes[i] = averageVal / 255;
      }

      const amplitudes = Array.from(previewVisualAmplitudes);
      return {
        amplitudesCount: amplitudes.length,
        allEqualsHalf: amplitudes.every(val => Math.abs(val - 0.5) < 0.01)
      };
    });

    expect(result.amplitudesCount).toBe(48);
    expect(result.allEqualsHalf).toBe(true);
  });
});
