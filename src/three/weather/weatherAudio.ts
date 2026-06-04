export type WeatherAudio = {
  resume: () => void;
  update: (rainIntensity: number, dt: number) => void;
  playThunder: () => void;
  dispose: () => void;
};

function createNoiseBuffer(
  ctx: AudioContext,
  seconds: number,
  brown = false
): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + white * 0.04) / 1.04;
      data[i] = last * 2.8;
    } else {
      data[i] = white;
    }
  }
  return buffer;
}

export function createWeatherAudio(): WeatherAudio {
  let ctx: AudioContext | null = null;
  let rainSource: AudioBufferSourceNode | null = null;
  let rainGain: GainNode | null = null;
  let masterGain: GainNode | null = null;
  let started = false;

  function ensureCtx(): AudioContext | null {
    if (ctx) return ctx;
    try {
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.85;
      masterGain.connect(ctx.destination);

      rainGain = ctx.createGain();
      rainGain.gain.value = 0;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 900;
      rainFilter.Q.value = 0.35;

      const buffer = createNoiseBuffer(ctx, 3, true);
      rainSource = ctx.createBufferSource();
      rainSource.buffer = buffer;
      rainSource.loop = true;
      rainSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(masterGain);

      return ctx;
    } catch {
      return null;
    }
  }

  function startRainLoop() {
    const c = ensureCtx();
    if (!c || !rainSource || started) return;
    if (c.state === 'suspended') void c.resume();
    try {
      rainSource.start(0);
      started = true;
    } catch {
      /* already started */
    }
  }

  return {
    resume() {
      const c = ensureCtx();
      if (!c) return;
      void c.resume().then(() => startRainLoop());
    },

    update(rainIntensity, _dt) {
      const c = ensureCtx();
      if (!c || !rainGain) return;
      const target = rainIntensity > 0.05 ? 0.04 + rainIntensity * 0.14 : 0;
      rainGain.gain.setTargetAtTime(target, c.currentTime, 0.35);
      if (rainIntensity > 0.05) startRainLoop();
    },

    playThunder() {
      const c = ensureCtx();
      if (!c || !masterGain) return;
      if (c.state === 'suspended') void c.resume();

      const duration = 1.2 + Math.random() * 1.8;
      const buffer = createNoiseBuffer(c, duration, true);
      const src = c.createBufferSource();
      src.buffer = buffer;

      const low = c.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.setValueAtTime(180, c.currentTime);
      low.frequency.exponentialRampToValueAtTime(
        35,
        c.currentTime + duration
      );

      const crack = c.createBiquadFilter();
      crack.type = 'highpass';
      crack.frequency.value = 120;

      const gain = c.createGain();
      const peak = 0.35 + Math.random() * 0.35;
      gain.gain.setValueAtTime(0.0001, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(peak, c.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        c.currentTime + duration
      );

      src.connect(crack);
      crack.connect(low);
      low.connect(gain);
      gain.connect(masterGain);
      src.start();
      src.stop(c.currentTime + duration + 0.05);
    },

    dispose() {
      try {
        rainSource?.stop();
      } catch {
        /* noop */
      }
      rainSource?.disconnect();
      rainGain?.disconnect();
      masterGain?.disconnect();
      void ctx?.close();
      ctx = null;
      rainSource = null;
      rainGain = null;
      masterGain = null;
      started = false;
    },
  };
}
