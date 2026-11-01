// Punchy synthesized UI sound effects for the game platform shell.
// Generated with Web Audio so they fire instantly with zero downloads.
type Kind = "hover" | "select" | "lock" | "launch" | "error" | "tick";

const MUTE_KEY = "arena_sfx_muted";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
const last = new Map<Kind, number>();

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

function tone(c: AudioContext, opts: { type: OscillatorType; from: number; to: number; start: number; dur: number; gain: number }) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type;
  const t = c.currentTime + opts.start;
  o.frequency.setValueAtTime(opts.from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + opts.dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + opts.dur + 0.02);
}

function noise(c: AudioContext, start: number, dur: number, gain: number, freq: number) {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master!);
  src.start(c.currentTime + start);
}

export const sfx = {
  isMuted: () => muted,
  setMuted(v: boolean) {
    muted = v;
    try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch { /* ignore */ }
  },
  play(kind: Kind) {
    if (muted) return;
    const now = performance.now();
    if (now - (last.get(kind) ?? 0) < (kind === "hover" ? 70 : 40)) return;
    last.set(kind, now);
    const c = audio();
    if (!c || !master) return;
    switch (kind) {
      case "hover":
        tone(c, { type: "square", from: 880, to: 1320, start: 0, dur: 0.05, gain: 0.08 });
        break;
      case "tick":
        tone(c, { type: "triangle", from: 1500, to: 900, start: 0, dur: 0.04, gain: 0.12 });
        break;
      case "select":
        tone(c, { type: "square", from: 520, to: 1040, start: 0, dur: 0.08, gain: 0.14 });
        tone(c, { type: "triangle", from: 1040, to: 1560, start: 0.06, dur: 0.1, gain: 0.12 });
        break;
      case "lock":
        noise(c, 0, 0.18, 0.5, 1800);
        tone(c, { type: "sawtooth", from: 180, to: 60, start: 0, dur: 0.25, gain: 0.3 });
        [523, 659, 784, 1047].forEach((f, i) => tone(c, { type: "square", from: f, to: f, start: 0.05 + i * 0.06, dur: 0.12, gain: 0.1 }));
        break;
      case "launch":
        tone(c, { type: "sawtooth", from: 120, to: 1800, start: 0, dur: 0.55, gain: 0.22 });
        noise(c, 0.35, 0.5, 0.6, 900);
        tone(c, { type: "sine", from: 90, to: 40, start: 0.5, dur: 0.5, gain: 0.5 });
        [784, 988, 1175, 1568].forEach((f, i) => tone(c, { type: "square", from: f, to: f, start: 0.55 + i * 0.07, dur: 0.14, gain: 0.1 }));
        break;
      case "error":
        tone(c, { type: "square", from: 220, to: 140, start: 0, dur: 0.14, gain: 0.18 });
        tone(c, { type: "square", from: 200, to: 110, start: 0.15, dur: 0.18, gain: 0.18 });
        break;
    }
  },
};
