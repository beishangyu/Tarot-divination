/* 音效工具：用 WebAudio 实时合成仪式音效，不依赖任何外部音频文件。 */
(function () {
  "use strict";

  let audioContext = null;

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getContext() {
    if (reducedMotion()) {
      return null;
    }
    const ContextClass = window.AudioContext || window.webkitAudioContext;
    if (!ContextClass) {
      return null;
    }
    if (!audioContext) {
      try {
        audioContext = new ContextClass();
      } catch (error) {
        return null;
      }
    }
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(function () {});
    }
    return audioContext;
  }

  function tone(context, options) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = options.type || "sine";
    oscillator.frequency.setValueAtTime(options.frequency, context.currentTime);
    if (options.slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(options.slideTo, context.currentTime + options.duration);
    }
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(options.volume, context.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + options.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + options.duration + 0.02);
  }

  function noise(context, options) {
    const sampleCount = Math.max(1, Math.floor(context.sampleRate * options.duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      const envelope = 1 - index / sampleCount;
      channel[index] = (Math.random() * 2 - 1) * envelope;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = options.frequency;
    filter.Q.value = options.q || 1.2;
    gain.gain.setValueAtTime(options.volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + options.duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start();
    source.stop(context.currentTime + options.duration);
  }

  const sounds = {
    /* 三枚铜钱落桌 */
    coin: function (context) {
      [0, 70, 140].forEach(function (delay, index) {
        window.setTimeout(function () {
          tone(context, {
            type: "triangle",
            frequency: 1180 + index * 260,
            slideTo: 760 + index * 180,
            volume: 0.05 - index * 0.01,
            duration: 0.22
          });
          noise(context, { frequency: 3400, q: 2.4, volume: 0.03, duration: 0.12 });
        }, delay);
      });
    },
    /* 落宫定音 */
    palace: function (context) {
      tone(context, { type: "sine", frequency: 392, slideTo: 294, volume: 0.055, duration: 0.85 });
      tone(context, { type: "sine", frequency: 588, volume: 0.022, duration: 0.6 });
    },
    /* 转动六宫转盘 */
    wheel: function (context) {
      noise(context, { frequency: 620, q: 0.8, volume: 0.028, duration: 0.5 });
      tone(context, { type: "sine", frequency: 220, slideTo: 330, volume: 0.03, duration: 0.5 });
    },
    /* 轻提示音 */
    tick: function (context) {
      tone(context, { type: "sine", frequency: 880, volume: 0.028, duration: 0.13 });
    }
  };

  window.AudioKit = {
    play: function (name) {
      const context = getContext();
      if (!context || !sounds[name]) {
        return false;
      }
      try {
        sounds[name](context);
        return true;
      } catch (error) {
        return false;
      }
    }
  };
})();
