let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtx();
  }
  return audioCtx!;
}

export function playBeep(freq = 880, duration = 120, type: OscillatorType = 'sine', volume = 0.4) {
  try {
    if (typeof window === 'undefined') return;
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000 + 0.05);
  } catch (e) {
    console.warn('Audio error:', e);
  }
}

export function playCountdownBeep() {
  playBeep(1046, 80, 'sine', 0.5);
}

export function playGoBeep() {
  playBeep(1318, 60, 'sine', 0.5);
  setTimeout(() => playBeep(1568, 100, 'sine', 0.5), 60);
}

export function playShutter() {
  try {
    if (typeof window === 'undefined') return;
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;

    src.buffer = buf;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.7;
    src.start(ctx.currentTime);
    src.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.warn('Shutter audio error:', e);
  }
}

export function playSuccess() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((freq, i) => {
    setTimeout(() => playBeep(freq, 150, 'sine', 0.3), i * 100);
  });
}
