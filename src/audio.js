/**
 * audio.js — Web Audio API sound effects
 * Generates beeps and a shutter sound programmatically.
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Play a beep tone
 * @param {number} freq - frequency in Hz
 * @param {number} duration - ms
 * @param {'sine'|'square'|'triangle'} type
 * @param {number} volume - 0..1
 */
export function playBeep(freq = 880, duration = 120, type = 'sine', volume = 0.4) {
  try {
    const ctx = getCtx();
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

/** Countdown beep (high pitched tick) */
export function playCountdownBeep() {
  playBeep(1046, 80, 'sine', 0.5);
}

/** Final beep before capture ("GO!") */
export function playGoBeep() {
  playBeep(1318, 60, 'sine', 0.5);
  setTimeout(() => playBeep(1568, 100, 'sine', 0.5), 60);
}

/** Camera shutter click */
export function playShutter() {
  try {
    const ctx = getCtx();
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

/** Success chime */
export function playSuccess() {
  const notes = [523, 659, 784, 1046];
  notes.forEach((freq, i) => {
    setTimeout(() => playBeep(freq, 150, 'sine', 0.3), i * 100);
  });
}
