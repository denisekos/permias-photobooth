/**
 * Every sound is synthesized with Web Audio, so there are no audio files to license or load.
 * Muted by default (FR-17); nothing plays until the host or a guest turns it on.
 */
let ctx: AudioContext | null = null;
let enabled = false;
let ambient: { stop: () => void } | null = null;

function ac(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function noise(a: AudioContext, seconds: number): AudioBufferSourceNode {
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * seconds), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  return src;
}

function env(a: AudioContext, peak: number, attack: number, release: number, at = a.currentTime) {
  const g = a.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
  return g;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!on) {
    ambient?.stop();
    ambient = null;
  }
}

export function pageTurn() {
  const a = ac();
  if (!a) return;
  const src = noise(a, 0.6);
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1800, a.currentTime);
  bp.frequency.exponentialRampToValueAtTime(600, a.currentTime + 0.5);
  bp.Q.value = 0.7;
  const g = env(a, 0.22, 0.08, 0.45);
  src.connect(bp).connect(g).connect(a.destination);
  src.start();
}

export function shutter() {
  const a = ac();
  if (!a) return;
  const src = noise(a, 0.12);
  const hp = a.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2500;
  src.connect(hp).connect(env(a, 0.35, 0.002, 0.08)).connect(a.destination);
  src.start();
}

export function tick() {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  o.type = "triangle";
  o.frequency.value = 880;
  o.connect(env(a, 0.08, 0.003, 0.12)).connect(a.destination);
  o.start();
  o.stop(a.currentTime + 0.2);
}

/** Mechanical whirr, then three roller pulls timed to the feed animation. */
export function printer(pulls: number[]) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  const o = a.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(55, t0);
  o.frequency.linearRampToValueAtTime(90, t0 + 0.8);
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  const g = env(a, 0.07, 0.2, 0.7, t0);
  o.connect(lp).connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + 1.1);
  for (const [start, dur] of pulls.map((p) => [p, 0.9])) {
    const src = noise(a, dur);
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 320;
    bp.Q.value = 1.4;
    src.connect(bp).connect(env(a, 0.18, 0.05, dur - 0.05, t0 + start)).connect(a.destination);
    src.start(t0 + start);
  }
}

/** Low wind loop for the attract screen. */
export function startAmbient() {
  const a = ac();
  if (!a || ambient) return;
  const src = noise(a, 4);
  src.loop = true;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 380;
  const g = a.createGain();
  g.gain.value = 0.05;
  const lfo = a.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = a.createGain();
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain).connect(lp.frequency);
  src.connect(lp).connect(g).connect(a.destination);
  src.start();
  lfo.start();
  ambient = {
    stop: () => {
      g.gain.setTargetAtTime(0, a.currentTime, 0.3);
      setTimeout(() => {
        src.stop();
        lfo.stop();
      }, 1200);
    },
  };
}

export function stopAmbient() {
  ambient?.stop();
  ambient = null;
}
