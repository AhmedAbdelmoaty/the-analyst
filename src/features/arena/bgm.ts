// Recorded background soundtrack (CC0 tracks from OpenGameArt) streamed from the CDN.
// Browsers block sound until the first click/tap, so start() retries on the next gesture.
import hubTheme from "@/assets/audio/arena-hub-theme.mp3.asset.json";
import setupTheme from "@/assets/audio/arena-setup-theme.mp3.asset.json";

export type Track = "hub" | "setup";
const SRC: Record<Track, string> = { hub: hubTheme.url, setup: setupTheme.url };
const KEY = "arena_bgm_muted";
const VOLUME = 0.75;

let el: HTMLAudioElement | null = null;
let current: Track | null = null;
let wanted: Track | null = null;
let fade: number | null = null;
let muted = typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "1";
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

function ramp(to: number, ms: number, done?: () => void) {
  if (!el) return;
  if (fade) clearInterval(fade);
  const from = el.volume, steps = Math.max(1, Math.round(ms / 40));
  let i = 0;
  fade = window.setInterval(() => {
    if (!el) return;
    i++; el.volume = Math.min(1, Math.max(0, from + (to - from) * (i / steps)));
    if (i >= steps) { clearInterval(fade!); fade = null; done?.(); }
  }, 40);
}

function onGesture() {
  if (wanted && !muted && el?.paused) void play();
}

async function play() {
  if (!el) return;
  try {
    await el.play();
    ramp(VOLUME, 900);
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
  } catch {
    // Autoplay blocked: start on the next interaction.
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
  }
  notify();
}

export const bgm = {
  isMuted: () => muted,
  isPlaying: () => !!el && !el.paused,
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  start(track: Track = "hub") {
    if (typeof window === "undefined") return;
    wanted = track;
    if (muted) return;
    if (!el || current !== track) {
      el?.pause();
      el = new Audio(SRC[track]);
      el.loop = true; el.preload = "auto"; el.volume = 0;
      el.addEventListener("play", notify); el.addEventListener("pause", notify);
      current = track;
    }
    if (el.paused) void play();
  },
  stop() {
    wanted = null;
    const a = el;
    if (a && !a.paused) ramp(0, 400, () => a.pause());
  },
  setMuted(v: boolean) {
    muted = v;
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ }
    if (v) { const w = wanted; bgm.stop(); wanted = w; } else if (wanted) bgm.start(wanted);
    notify();
  },
};
