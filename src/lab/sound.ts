const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5, 1174.66];

export class Sfx {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;

  mute(muted: boolean) {
    this.muted = muted;
  }

  private audio() {
    if (this.muted || typeof window === "undefined") return null;
    try {
      this.ctx ??= new AudioContext();
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  unlock() {
    this.audio();
  }

  private tone(freq: number, at: number, length: number, type: OscillatorType, gain: number) {
    const ctx = this.audio();
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(gain, t + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }

  private hiss(at: number, length: number, gain: number, cutoff: number) {
    const ctx = this.audio();
    if (!ctx) return;
    if (!this.noise) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    }
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(cutoff * 0.25, t + length);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start(t);
    src.stop(t + length + 0.05);
  }

  chute() {
    this.hiss(0, 0.18, 0.05, 2400);
    this.tone(220, 0.02, 0.12, "triangle", 0.05);
  }

  rescue(streak: number) {
    const base = Math.min(streak, NOTES.length - 3);
    this.tone(NOTES[base], 0, 0.16, "square", 0.045);
    this.tone(NOTES[base + 2], 0.07, 0.22, "square", 0.04);
    this.tone(NOTES[base + 2] * 2, 0.07, 0.18, "triangle", 0.03);
  }

  splash() {
    this.hiss(0, 0.5, 0.11, 1400);
    this.tone(160, 0, 0.18, "sine", 0.06);
  }

  tick(step: number) {
    this.tone(NOTES[Math.min(step, NOTES.length - 1)] * 2, 0, 0.09, "triangle", 0.035);
    this.hiss(0, 0.06, 0.03, 5000);
  }

  incoming(seconds: number) {
    const ctx = this.audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const length = Math.max(0.6, seconds * 0.9);
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(380, t + length);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(0.035, t + 0.08);
    amp.gain.linearRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }

  hit() {
    this.hiss(0, 0.55, 0.16, 900);
    this.tone(90, 0, 0.35, "sawtooth", 0.09);
    this.tone(140, 0.03, 0.2, "square", 0.05);
  }

  thud() {
    this.tone(120, 0, 0.16, "sine", 0.09);
    this.tone(84, 0.02, 0.2, "triangle", 0.05);
    this.hiss(0, 0.12, 0.04, 700);
  }

  fizz() {
    this.hiss(0, 0.35, 0.05, 3200);
  }

  croak(pitch: number, gain = 0.018) {
    this.tone(170 * pitch, 0, 0.07, "square", gain);
    this.tone(132 * pitch, 0.09, 0.1, "square", gain);
  }

  noted(streak: number, pitch: number) {
    this.croak(pitch, 0.04);
    const base = Math.min(streak, NOTES.length - 3);
    this.tone(NOTES[base], 0.24, 0.16, "square", 0.04);
    this.tone(NOTES[base + 2], 0.31, 0.22, "square", 0.035);
    this.tone(NOTES[base + 2] * 2, 0.31, 0.18, "triangle", 0.028);
  }

  scratch() {
    this.hiss(0, 0.09, 0.04, 6500);
    this.hiss(0.11, 0.08, 0.035, 5200);
  }

  boing() {
    const ctx = this.audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(720, t + 0.2);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(0.05, t + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  page() {
    this.hiss(0, 0.07, 0.035, 4200);
  }

  tally() {
    this.tone(1560, 0, 0.05, "triangle", 0.014);
  }

  pluck(step: number) {
    this.tone(step % 2 ? 660 : 523.25, 0, 0.05, "triangle", 0.022);
  }

  power() {
    [0, 2, 4, 7].forEach((n, i) => this.tone(NOTES[n] / 2, i * 0.05, 0.16, "square", 0.035));
    this.hiss(0, 0.3, 0.04, 2600);
  }

  lose() {
    [7, 4, 2, 0].forEach((n, i) => this.tone(NOTES[n] / 2, i * 0.14, 0.26, "triangle", 0.045));
  }

  finish(score: number) {
    const steps = score >= 8 ? [0, 2, 4, 7] : [0, 2, 4];
    steps.forEach((n, i) => this.tone(NOTES[n], i * 0.11, 0.3, "square", 0.04));
  }
}

const MUTE_KEY = "elas-em-jogo:muted";
const muteListeners = new Set<() => void>();

export function readMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function subscribeMuted(listener: () => void) {
  muteListeners.add(listener);
  return () => {
    muteListeners.delete(listener);
  };
}

export function setMuted(muted: boolean) {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {}
  for (const listener of muteListeners) listener();
}
