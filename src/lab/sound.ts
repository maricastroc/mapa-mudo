const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 987.77, 1046.5, 1174.66];

export class Sfx {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private muted = false;
  private last = new Map<string, number>();

  allow(key: string, gap: number) {
    const now = typeof performance === "undefined" ? 0 : performance.now();
    const before = this.last.get(key) ?? -Infinity;
    if (now - before < gap) return false;
    this.last.set(key, now);
    return true;
  }

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

  private noiseBuffer(ctx: AudioContext) {
    if (!this.noise) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    }
    return this.noise;
  }

  private hiss(at: number, length: number, gain: number, cutoff: number) {
    const ctx = this.audio();
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);
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

  private burst(at: number, length: number, gain: number, type: BiquadFilterType, freq: number, q = 1, sweep = 1) {
    const ctx = this.audio();
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t);
    if (sweep !== 1) filter.frequency.exponentialRampToValueAtTime(freq * sweep, t + length);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.01, length / 4));
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start(t, Math.random() * 0.5);
    src.stop(t + length + 0.05);
  }

  private glide(from: number, to: number, at: number, length: number, type: OscillatorType, gain: number) {
    const ctx = this.audio();
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + length);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }

  press() {
    if (!this.allow("press", 45)) return;
    this.burst(0, 0.03, 0.05, "highpass", 3200);
    this.tone(1250, 0, 0.035, "square", 0.012);
    this.burst(0.05, 0.025, 0.03, "highpass", 2400);
  }

  hover() {
    if (!this.allow("hover", 140)) return;
    this.tone(2600, 0, 0.04, "sine", 0.007);
  }

  zap(on: boolean) {
    this.burst(0, 0.12, 0.05, "bandpass", 3800, 4);
    this.glide(on ? 180 : 420, on ? 420 : 140, 0.02, 0.3, "square", 0.012);
  }

  tink(at: number, step: number) {
    this.tone(1800 + step * 140, at, 0.06, "triangle", 0.014);
    this.burst(at, 0.02, 0.02, "highpass", 5000);
  }

  toot() {
    if (!this.allow("toot", 400)) return;
    this.glide(880, 920, 0, 0.18, "square", 0.018);
    this.glide(660, 700, 0.22, 0.26, "square", 0.018);
    this.burst(0.05, 0.2, 0.03, "lowpass", 1400);
  }

  winch(down: boolean) {
    for (let i = 0; i < 6; i++) this.burst(i * 0.07, 0.015, 0.035, "bandpass", down ? 1500 - i * 80 : 1100 + i * 90, 3);
  }

  flip() {
    this.burst(0, 0.05, 0.04, "bandpass", 2800, 1);
    this.burst(0.06, 0.08, 0.03, "bandpass", 2200, 1);
  }

  lever(on: boolean) {
    this.burst(0, 0.06, 0.08, "lowpass", 900);
    this.tone(95, 0, 0.12, "square", 0.04);
    if (on) this.glide(70, 140, 0.08, 0.5, "sawtooth", 0.012);
    else this.glide(140, 55, 0.08, 0.6, "sawtooth", 0.012);
  }

  drawer(open: boolean) {
    this.burst(0, 0.22, 0.05, "lowpass", open ? 700 : 500, 1, open ? 0.6 : 1.4);
    this.tone(open ? 160 : 120, 0.2, 0.06, "triangle", 0.035);
  }

  paper() {
    this.burst(0, 0.07, 0.035, "bandpass", 3400, 0.8);
    this.burst(0.09, 0.09, 0.03, "bandpass", 2600, 0.8);
  }

  geiger(count: number) {
    if (!this.allow("geiger", 250)) return;
    for (let i = 0; i < count; i++) this.burst(Math.random() * 0.55, 0.008, 0.09, "highpass", 2500);
  }

  chalk() {
    for (let i = 0; i < 5; i++) this.burst(i * 0.075 + Math.random() * 0.02, 0.06, 0.025, "bandpass", 2300 + Math.random() * 600, 3);
  }

  drip(step = 0) {
    this.glide(620 + step * 60, 1400 + step * 90, 0, 0.09, "sine", 0.05);
  }

  bubbles() {
    for (let i = 0; i < 4; i++) this.glide(380 + Math.random() * 300, 900 + Math.random() * 400, 0.06 * i + Math.random() * 0.04, 0.06, "sine", 0.025);
  }

  water() {
    for (let i = 0; i < 6; i++) this.glide(1100 + Math.random() * 700, 2200 + Math.random() * 600, 0.08 * i + Math.random() * 0.05, 0.05, "sine", 0.018);
  }

  thunk() {
    this.tone(110, 0, 0.14, "sine", 0.07);
    this.burst(0, 0.05, 0.04, "lowpass", 600);
  }

  hum() {
    this.glide(110, 118, 0, 0.7, "sawtooth", 0.006);
  }

  chime() {
    [4, 6, 7].forEach((n, i) => this.tone(NOTES[n] * 2, i * 0.09, 0.4, "triangle", 0.022));
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

  swat() {
    this.hiss(0, 0.07, 0.07, 3600);
    this.tone(520, 0, 0.12, "square", 0.04);
    this.tone(260, 0.05, 0.14, "triangle", 0.04);
  }

  jab() {
    this.hiss(0, 0.09, 0.05, 5200);
    this.tone(980, 0.02, 0.05, "square", 0.03);
    this.tone(700, 0.1, 0.06, "triangle", 0.03);
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
