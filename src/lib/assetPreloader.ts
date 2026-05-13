/**
 * Unified asset pipeline for the entire game.
 *
 * Responsibilities:
 *  - Single source of truth for image and audio caches.
 *  - Bounded-concurrency batch preloading with per-asset timeout.
 *  - Safe audio playback wrapper that never throws and always resolves.
 *  - Audio unlock primer for browsers that block autoplay.
 *
 * Design principle: "preload helps smoothness, fallbacks prevent freezes."
 * Game progress NEVER depends on a successful network/media event.
 */

// ---------- caches ----------
const audioCache = new Map<string, HTMLAudioElement>();
const audioReady = new Map<string, Promise<void>>();
const imageCache = new Map<string, Promise<void>>();

// ---------- audio ----------
export const getAudio = (src: string): HTMLAudioElement => {
  let el = audioCache.get(src);
  if (!el) {
    el = new Audio();
    el.preload = "auto";
    el.src = src;
    try { el.load(); } catch { /* noop */ }
    audioCache.set(src, el);
  }
  return el;
};

export const preloadAudio = (src: string, timeoutMs: number = 4000): Promise<void> => {
  const cached = audioReady.get(src);
  if (cached) return cached;

  const p = new Promise<void>((resolve) => {
    const el = getAudio(src);
    if (el.readyState >= 4) {
      resolve();
      return;
    }
    let done = false;
    const finish = (cacheReady: boolean = true) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      el.removeEventListener("canplaythrough", onReady);
      el.removeEventListener("error", fail);
      if (!cacheReady) audioReady.delete(src);
      resolve();
    };
    const onReady = () => finish(true);
    const fail = () => finish(false);
    const timeout = () => finish(el.readyState >= 4);
    const timer = window.setTimeout(timeout, timeoutMs);
    el.addEventListener("canplaythrough", onReady, { once: true });
    el.addEventListener("error", fail, { once: true });
    try { el.load(); } catch { /* noop */ }
  });

  audioReady.set(src, p);
  return p;
};

/**
 * Plays a voice-over from cache. Returns a promise that resolves when:
 *  - the audio finishes naturally, OR
 *  - the audio errors / is aborted / is replaced, OR
 *  - the safety timeout elapses.
 *
 * It NEVER rejects. Callers can await it to know when to advance.
 */
export interface PlayVoiceHandle {
  audio: HTMLAudioElement;
  done: Promise<void>;
  stop: () => void;
}

export const playVoice = (src: string, safetyTimeoutMs: number = 12000): PlayVoiceHandle => {
  const audio = getAudio(src);
  try { audio.currentTime = 0; } catch { /* noop */ }

  let settled = false;
  let stalledTimer: number | null = null;
  let progressTimer: number | null = null;
  let ceilingTimer: number | null = null;
  let lastProgressTime = Date.now();
  let lastCurrentTime = 0;

  const cleanup = () => {
    audio.removeEventListener("ended", onEnd);
    audio.removeEventListener("error", onEnd);
    audio.removeEventListener("abort", onEnd);
    audio.removeEventListener("stalled", onStalled);
    if (stalledTimer !== null) {
      window.clearTimeout(stalledTimer);
      stalledTimer = null;
    }
    if (progressTimer !== null) {
      window.clearInterval(progressTimer);
      progressTimer = null;
    }
    if (ceilingTimer !== null) {
      window.clearTimeout(ceilingTimer);
      ceilingTimer = null;
    }
  };

  const onEnd = () => {
    if (settled) return;
    settled = true;
    cleanup();
    resolveDone();
  };

  // Stalled networks get a real grace period so slow audio is not cut short.
  const onStalled = () => {
    if (stalledTimer !== null) window.clearTimeout(stalledTimer);
    stalledTimer = window.setTimeout(() => {
      const hasRecovered = audio.currentTime > lastCurrentTime + 0.05 || audio.ended;
      if (hasRecovered) return;
      onEnd();
    }, 8000);
  };

  let resolveDone!: () => void;
  const done = new Promise<void>((res) => { resolveDone = res; });

  audio.addEventListener("ended", onEnd, { once: true });
  audio.addEventListener("error", onEnd, { once: true });
  audio.addEventListener("abort", onEnd, { once: true });
  audio.addEventListener("stalled", onStalled);

  progressTimer = window.setInterval(() => {
    if (settled) return;
    if (audio.ended) {
      onEnd();
      return;
    }
    if (audio.currentTime > lastCurrentTime + 0.05) {
      lastCurrentTime = audio.currentTime;
      lastProgressTime = Date.now();
      if (stalledTimer !== null) {
        window.clearTimeout(stalledTimer);
        stalledTimer = null;
      }
      return;
    }
    if (!audio.paused && Date.now() - lastProgressTime > safetyTimeoutMs) {
      onEnd();
    }
  }, 1000);

  ceilingTimer = window.setTimeout(onEnd, Math.max(safetyTimeoutMs * 3, 30000));

  try {
    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.catch(() => onEnd());
    }
  } catch {
    onEnd();
  }

  const stop = () => {
    if (settled) return;
    try { audio.pause(); audio.currentTime = 0; } catch { /* noop */ }
    onEnd();
  };

  return { audio, done, stop };
};

// ---------- images ----------
export const preloadImage = (src: string, timeoutMs: number = 5000): Promise<void> => {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const p = new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    const img = new Image();
    img.onload = () => {
      if ("decode" in img && typeof img.decode === "function") {
        img.decode().then(finish, finish);
      } else {
        finish();
      }
    };
    img.onerror = finish;
    img.src = src;
  });

  imageCache.set(src, p);
  return p;
};

// ---------- batch with bounded concurrency ----------
type Loader = () => Promise<void>;

export const runWithConcurrency = async (
  tasks: Loader[],
  concurrency: number,
  onProgress?: (done: number, total: number) => void,
): Promise<void> => {
  const total = tasks.length;
  if (total === 0) {
    onProgress?.(0, 0);
    return;
  }
  let done = 0;
  let cursor = 0;
  const workers: Promise<void>[] = [];
  const next = async (): Promise<void> => {
    while (cursor < total) {
      const idx = cursor++;
      try { await tasks[idx](); } catch { /* swallow — never block boot */ }
      done++;
      onProgress?.(done, total);
    }
  };
  for (let i = 0; i < Math.min(concurrency, total); i++) workers.push(next());
  await Promise.all(workers);
};

// ---------- audio unlock (autoplay policies) ----------
let unlocked = false;
export const warmAudioUnlock = (): void => {
  if (unlocked) return;
  unlocked = true;
  try {
    const el = new Audio();
    el.muted = true;
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.then(() => { try { el.pause(); } catch { /* noop */ } }).catch(() => { /* blocked — fine */ });
    }
  } catch { /* noop */ }
};

// Back-compat alias used by older code paths.
export const getPreloadedAudio = getAudio;
