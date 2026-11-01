// Synthesized high-energy background loop for the platform hub (no downloads).
// Starts only after a user gesture (browser autoplay policy).
const KEY = "arena_bgm_muted";
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let timer: number | null = null;
let step = 0;
let nextTime = 0;
let muted = typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "1";

const BPM = 128;
const S = 60 / BPM / 4; // 16th note
// A minor epic progression: Am F C G
const ROOTS = [110, 87.31, 130.81, 98];
const ARP = [0, 3, 7, 12, 7, 3, 12, 15];
const semi = (f: number, n: number) => f * Math.pow(2, n / 12);

function note(type: OscillatorType, f: number, t: number, d: number, g: number, to?: number) {
  const o = ctx!.createOscillator(), gn = ctx!.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  gn.gain.setValueAtTime(0.0001, t);
  gn.gain.exponentialRampToValueAtTime(g, t + 0.005);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(gn).connect(out!); o.start(t); o.stop(t + d + 0.02);
}
function hat(t: number, g: number) {
  const b = ctx!.createBuffer(1, ctx!.sampleRate * 0.05, ctx!.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ctx!.createBufferSource(); s.buffer = b;
  const f = ctx!.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
  const gn = ctx!.createGain(); gn.gain.value = g;
  s.connect(f).connect(gn).connect(out!); s.start(t);
}

function schedule() {
  if (!ctx) return;
  while (nextTime < ctx.currentTime + 0.15) {
    const bar = Math.floor(step / 16) % 4, s = step % 16, root = ROOTS[bar];
    if (s % 4 === 0) note("sine", 150, nextTime, 0.25, 0.9, 45); // kick
    if (s % 4 === 2) hat(nextTime, 0.25);
    if (s === 4 || s === 12) { hat(nextTime, 0.5); note("triangle", 220, nextTime, 0.12, 0.25, 120); } // snare-ish
    if (s % 2 === 1) note("sawtooth", root / 2, nextTime, S * 0.9, 0.18); // driving bass
    note("square", semi(root * 4, ARP[s % 8]), nextTime, S * 0.8, 0.05); // arpeggio
    if (s === 0) note("sawtooth", root * 2, nextTime, S * 15, 0.04); // pad
    nextTime += S; step++;
  }
}

export const bgm = {
  isMuted: () => muted,
  start() {
    if (muted || timer !== null || typeof window === "undefined") return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) {
      ctx = new AC();
      out = ctx.createGain(); out.gain.value = 0.22;
      const comp = ctx.createDynamicsCompressor();
      out.connect(comp).connect(ctx.destination);
    }
    void ctx.resume().catch(() => undefined);
    nextTime = ctx.currentTime + 0.05;
    timer = window.setInterval(schedule, 50);
  },
  stop() {
    if (timer !== null) { clearInterval(timer); timer = null; }
  },
  setMuted(v: boolean) {
    muted = v;
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ }
    if (v) bgm.stop(); else bgm.start();
  },
};
