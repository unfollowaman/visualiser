(function () {
  'use strict';

  var orbMp4MuxerPromise = null;

  async function isAACSupported(aacConfig) {
    try {
      if (typeof AudioEncoder !== "undefined" && AudioEncoder.isConfigSupported) {
        var support = await AudioEncoder.isConfigSupported(aacConfig);
        return !!support.supported;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  async function isOpusSupported(opusConfig) {
    try {
      if (typeof AudioEncoder !== "undefined" && AudioEncoder.isConfigSupported) {
        var support = await AudioEncoder.isConfigSupported(opusConfig);
        return !!support.supported;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  async function renderOrbFormat(analysisData, width, height, progressCallback, audioBuffer) {
    if (!orbMp4MuxerPromise) {
      orbMp4MuxerPromise = import('../mp4-muxer.js').catch(function () {
        return import('./mp4-muxer.js');
      });
    }
    var mp4MuxerModule = await orbMp4MuxerPromise;
    var Mp4Muxer = mp4MuxerModule.Mp4Muxer || mp4MuxerModule.default || window.Mp4Muxer;

    var offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    var offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });

    var fps = 60;
    var frameDurationMicros = 1_000_000 / fps;
    var totalFrames = analysisData.totalFrames;

    var muxerOptions = {
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: {
        codec: 'avc',
        width: width,
        height: height
      },
      fastStart: 'in-memory'
    };

    var selectedAudioCodec = null;
    var encoderAudioCodecString = null;

    if (audioBuffer) {
      var aacConfig = {
        codec: 'mp4a.40.2',
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        bitrate: 128_000
      };

      var aacSupported = await isAACSupported(aacConfig);

      if (aacSupported) {
        selectedAudioCodec = 'aac';
        encoderAudioCodecString = 'mp4a.40.2';
      } else {
        var opusConfig = {
          codec: 'opus',
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
          bitrate: 128_000
        };
        var opusSupported = await isOpusSupported(opusConfig);
        if (opusSupported) {
          selectedAudioCodec = 'opus';
          encoderAudioCodecString = 'opus';
        }
      }
    }

    if (selectedAudioCodec) {
      muxerOptions.audio = {
        codec: selectedAudioCodec,
        numberOfChannels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate
      };
    }

    var muxer = new Mp4Muxer.Muxer(muxerOptions);

    var videoEncoder = new VideoEncoder({
      output: function (chunk, meta) { muxer.addVideoChunk(chunk, meta); },
      error: function (e) { console.error("Orb VideoEncoder error:", e); }
    });

    var videoConfig = {
      codec: 'avc1.420034',
      width: width,
      height: height,
      bitrate: 8_000_000,
      framerate: fps,
    };
    videoEncoder.configure(videoConfig);

    var audioEncoder = null;
    if (selectedAudioCodec) {
      audioEncoder = new AudioEncoder({
        output: function (chunk, meta) { muxer.addAudioChunk(chunk, meta); },
        error: function (e) { console.error("Orb AudioEncoder error:", e); }
      });

      audioEncoder.configure({
        codec: encoderAudioCodecString,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        bitrate: 128_000
      });

      var sampleRate = audioBuffer.sampleRate;
      var numChannels = audioBuffer.numberOfChannels;
      var totalAudioFrames = audioBuffer.length;
      var chunkSize = 16384;
      var maxPcmSamples = numChannels * chunkSize;
      var pcmDataBuffer = new Float32Array(maxPcmSamples);

      var channelDataList = [];
      for (var c = 0; c < numChannels; c++) {
        channelDataList.push(audioBuffer.getChannelData(c));
      }

      var statusLine = document.getElementById("statusLine");
      if (statusLine) {
        statusLine.textContent = "Encoding audio...";
        statusLine.classList.remove("hidden");
      }

      for (var offset = 0; offset < totalAudioFrames; offset += chunkSize) {
        while (audioEncoder.encodeQueueSize > 2) {
          await new Promise(function (resolve) {
            audioEncoder.addEventListener("dequeue", resolve, { once: true });
          });
        }

        var numFrames = Math.min(chunkSize, totalAudioFrames - offset);
        var pcmData = (numFrames === chunkSize)
          ? pcmDataBuffer
          : pcmDataBuffer.subarray(0, numChannels * numFrames);

        for (var ch = 0; ch < numChannels; ch++) {
          var channelData = channelDataList[ch];
          pcmData.set(channelData.subarray(offset, offset + numFrames), ch * numFrames);
        }

        var timestampMicros = Math.round((offset / sampleRate) * 1_000_000);

        var audioData = new AudioData({
          format: 'f32-planar',
          sampleRate: sampleRate,
          numberOfFrames: numFrames,
          numberOfChannels: numChannels,
          timestamp: timestampMicros,
          data: pcmData
        });

        audioEncoder.encode(audioData);
        audioData.close();

        var audioProgress = Math.min(20, Math.round(((offset + numFrames) / totalAudioFrames) * 20));
        progressCallback(audioProgress);
      }
    }

    var exportSize = Math.min(width, height);

    for (var i = 0; i < totalFrames; i++) {
      while (videoEncoder.encodeQueueSize > 2) {
        await new Promise(function (resolve) {
          videoEncoder.addEventListener("dequeue", resolve, { once: true });
        });
      }

      var t = i / fps;
      var f = analysisData.features(t);
      if (window.drawOrbFrame) {
        window.drawOrbFrame(offscreenCtx, exportSize, t, f, analysisData.onsets);
      }

      var frame = new VideoFrame(offscreenCanvas, {
        timestamp: i * frameDurationMicros,
        duration: frameDurationMicros
      });

      videoEncoder.encode(frame);
      frame.close();

      if (i % 15 === 0) {
        var progress = 20 + Math.min(80, Math.round((i / totalFrames) * 80));
        progressCallback(progress);
        await new Promise(function (resolve) { setTimeout(resolve, 0); });
      }
    }

    progressCallback(100);

    if (audioEncoder) {
      await audioEncoder.flush();
      audioEncoder.close();
    }

    await videoEncoder.flush();
    videoEncoder.close();
    muxer.finalize();

    var buffer = muxer.target.buffer;
    return new Blob([buffer], { type: 'video/mp4' });
  }

  window.renderOrbFormat = renderOrbFormat;
})();
