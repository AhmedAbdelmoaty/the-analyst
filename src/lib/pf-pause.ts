/**
 * Real game pause: freezes every page timer (dialogue typing, auto-advance,
 * audio safety/fallback timers), media elements and Web Audio contexts in place,
 * then resumes them with their exact remaining time. No component is reset.
 *
 * Timers are virtualised once this module loads (inside the lazy /play chunk);
 * when not paused they behave exactly like native timers.
 */
type Fn = (...args: unknown[]) => void;
interface VTimer { cb: Fn; args: unknown[]; delay: number; remaining: number; startedAt: number; native: number | null; repeat: boolean }

interface Natives {
  setTimeout: typeof window.setTimeout;
  clearTimeout: typeof window.clearTimeout;
  setInterval: typeof window.setInterval;
  clearInterval: typeof window.clearInterval;
  play: HTMLMediaElement["play"];
}
const g = window as unknown as { __pfNatives?: Natives };
if (!g.__pfNatives) {
  g.__pfNatives = {
    setTimeout: window.setTimeout.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    setInterval: window.setInterval.bind(window),
    clearInterval: window.clearInterval.bind(window),
    play: HTMLMediaElement.prototype.play,
  };
}
const N = g.__pfNatives;
export const nativeSetTimeout = N.setTimeout;
export const nativeClearTimeout = N.clearTimeout;
export const nativeSetInterval = N.setInterval;
export const nativeClearInterval = N.clearInterval;

let paused = false;
const timers = new Map<number, VTimer>();
let seq = 50_000_000;
const now = () => performance.now();

function schedule(id: number, t: VTimer) {
  t.startedAt = now();
  t.native = N.setTimeout(() => fire(id), Math.max(0, t.remaining));
}
function fire(id: number) {
  const t = timers.get(id);
  if (!t) return;
  t.native = null;
  if (t.repeat) { t.remaining = t.delay; if (!paused) schedule(id, t); }
  else timers.delete(id);
  t.cb(...t.args);
}
function create(cb: unknown, delay: unknown, args: unknown[], repeat: boolean): number {
  if (typeof cb !== "function") return 0;
  const d = Math.max(0, Number(delay) || 0);
  const id = ++seq;
  const t: VTimer = { cb: cb as Fn, args, delay: repeat ? Math.max(4, d) : d, remaining: repeat ? Math.max(4, d) : d, startedAt: 0, native: null, repeat };
  timers.set(id, t);
  if (!paused) schedule(id, t);
  return id;
}
function clear(id: number | undefined) {
  if (id == null) return;
  const t = timers.get(id);
  if (t) { if (t.native != null) N.clearTimeout(t.native); timers.delete(id); return; }
  N.clearTimeout(id); N.clearInterval(id);
}

const w = window as unknown as Record<string, unknown> & { __pfClockInstalled?: boolean };
if (!w.__pfClockInstalled) {
  w.__pfClockInstalled = true;
  w.setTimeout = (cb: unknown, delay?: unknown, ...args: unknown[]) => create(cb, delay, args, false);
  w.setInterval = (cb: unknown, delay?: unknown, ...args: unknown[]) => create(cb, delay, args, true);
  w.clearTimeout = clear;
  w.clearInterval = clear;
  // Media started while paused waits for resume instead of playing.
  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    media.add(this);
    if (paused) { resumeMedia.add(this); return Promise.resolve(); }
    return N.play.call(this);
  };
  const track = (Ctor: typeof AudioContext | undefined, name: string) => {
    if (!Ctor) return;
    class Tracked extends Ctor {
      constructor(opts?: AudioContextOptions) {
        super(opts);
        contexts.add(this);
        if (paused) { void this.suspend().catch(() => {}); resumeCtx.add(this); }
      }
    }
    w[name] = Tracked;
  };
  track(window.AudioContext, "AudioContext");
  track((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext, "webkitAudioContext");
}

const media = new Set<HTMLMediaElement>();
const resumeMedia = new Set<HTMLMediaElement>();
const contexts = new Set<AudioContext>();
const resumeCtx = new Set<AudioContext>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const isGamePaused = () => paused;
export function subscribePause(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

export function pauseGame() {
  if (paused) return;
  paused = true;
  const t0 = now();
  timers.forEach((t) => {
    if (t.native == null) return;
    N.clearTimeout(t.native);
    t.native = null;
    t.remaining = Math.max(0, t.remaining - (t0 - t.startedAt));
  });
  document.querySelectorAll("audio,video").forEach((el) => media.add(el as HTMLMediaElement));
  media.forEach((m) => {
    if (!m.paused && !m.ended) { try { m.pause(); resumeMedia.add(m); } catch { /* noop */ } }
  });
  contexts.forEach((c) => { if (c.state === "running") { resumeCtx.add(c); void c.suspend().catch(() => {}); } });
  try { window.speechSynthesis?.pause(); } catch { /* noop */ }
  document.documentElement.classList.add("pf-paused");
  emit();
}

export function resumeGame() {
  if (!paused) return;
  paused = false;
  document.documentElement.classList.remove("pf-paused");
  resumeCtx.forEach((c) => { void c.resume().catch(() => {}); });
  resumeCtx.clear();
  resumeMedia.forEach((m) => { if (m.isConnected || m.src) void N.play.call(m).catch(() => {}); });
  resumeMedia.clear();
  try { window.speechSynthesis?.resume(); } catch { /* noop */ }
  timers.forEach((t, id) => { if (t.native == null) schedule(id, t); });
  emit();
}

/** Ending a round: drop everything queued for resume so nothing restarts. */
export function discardPausedWork() {
  resumeMedia.clear();
}
