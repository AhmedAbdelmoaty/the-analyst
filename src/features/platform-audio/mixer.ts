import { EFFECTS, MUSIC, type MusicContext, type SoundEvent } from './manifest';

type Preferences = { enabled: boolean; musicMuted: boolean; sfxMuted: boolean; musicVolume: number; sfxVolume: number; reducedMotion: boolean };
type Snapshot = Preferences & { unlocked: boolean; playing: boolean; unavailable: boolean };
const KEY = 'analyst-platform-audio-v2';
const initial: Preferences = { enabled: true, musicMuted: false, sfxMuted: false, musicVolume: .35, sfxVolume: 1, reducedMotion: false };
function preferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const result = { ...initial };
    for (const key of ['enabled', 'musicMuted', 'sfxMuted', 'reducedMotion'] as const) if (typeof saved[key] === 'boolean') result[key] = saved[key];
    for (const key of ['musicVolume', 'sfxVolume'] as const) if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) result[key] = Math.max(0, Math.min(1, saved[key]));
    return result;
  } catch { return initial; }
}
let state: Snapshot = { ...preferences(), unlocked: false, playing: false, unavailable: false };
let context: MusicContext | null = null;
let music: HTMLAudioElement | null = null;
let currentSource = '';
let frame = 0;
let revision = 0;
let pendingSource = '';
let lastEffect = -Infinity;
let movedAt = -Infinity;
const effects = new Map<SoundEvent, HTMLAudioElement>();
const listeners = new Set<() => void>();
const emit = (patch: Partial<Snapshot> = {}) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
const audible = () => state.enabled && state.unlocked && !state.musicMuted && state.musicVolume > 0 && context !== null && !document.hidden;
function cancelFade() { if (frame) cancelAnimationFrame(frame); frame = 0; }
function ramp(to: number, duration: number, done?: () => void) {
  cancelFade(); if (!music) { done?.(); return; }
  const element = music, from = element.volume, start = performance.now();
  const step = (now: number) => {
    const portion = Math.min(1, (now - start) / duration);
    element.volume = Math.max(0, Math.min(1, from + (to - from) * portion));
    if (portion < 1) frame = requestAnimationFrame(step); else { frame = 0; done?.(); }
  };
  frame = requestAnimationFrame(step);
}
function stopEffects() { effects.forEach(element => { element.pause(); element.currentTime = 0; }); }
function stop() {
  revision++; pendingSource = ''; cancelFade(); music?.pause(); stopEffects(); emit({ playing: false });
}
function synchronize() {
  if (!audible() || !context) { stop(); return; }
  const source = MUSIC[context];
  if (pendingSource === source) return;
  if (currentSource === source && music && !music.paused) { ramp(state.musicVolume, 200); return; }
  const token = ++revision;
  pendingSource = source;
  const begin = () => {
    if (token !== revision || !audible()) return;
    if (!music) {
      music = new Audio(); music.loop = true; music.preload = 'none';
      music.addEventListener('playing', () => emit({ playing: audible(), unavailable: false }));
      music.addEventListener('pause', () => emit({ playing: false }));
      music.addEventListener('error', () => emit({ playing: false, unavailable: true }));
    }
    music.pause();
    if (currentSource !== source) { music.src = source; currentSource = source; }
    music.volume = 0;
    const element = music;
    void element.play().then(() => {
      if (token !== revision) return;
      pendingSource = '';
      if (!audible()) { element.pause(); return; }
      ramp(state.musicVolume, 220); emit({ playing: true, unavailable: false });
    }).catch(() => {
      if (token !== revision) return;
      pendingSource = ''; emit({ playing: false, unavailable: true });
    });
  };
  // Serial 160 + 220 ms transition: no two music players can overlap.
  if (music && !music.paused) ramp(0, 160, begin); else begin();
}

export const platformAudio = {
  snapshot: () => state,
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  setContext(next: MusicContext | null) { if (next === context) return; context = next; synchronize(); },
  visibilityChanged() { synchronize(); },
  unlock() { if (!context || !state.enabled || (state.unlocked && !state.unavailable)) return; emit({ unlocked: true }); synchronize(); },
  update(patch: Partial<Preferences>) {
    const next = { ...patch };
    for (const key of ['musicVolume', 'sfxVolume'] as const) if (next[key] !== undefined) next[key] = Number.isFinite(next[key]) ? Math.min(1, Math.max(0, next[key]!)) : initial[key];
    emit(next);
    const { enabled, musicMuted, sfxMuted, musicVolume, sfxVolume, reducedMotion } = state;
    try { localStorage.setItem(KEY, JSON.stringify({ enabled, musicMuted, sfxMuted, musicVolume, sfxVolume, reducedMotion })); } catch { /* Device storage can be unavailable. */ }
    document.documentElement.dataset.platformMotion = reducedMotion ? 'off' : 'on';
    if (state.sfxMuted || !state.enabled) stopEffects();
    effects.forEach((element, kind) => { element.volume = state.sfxVolume * EFFECTS[kind].gain; });
    synchronize();
  },
  pointerMoved() { movedAt = performance.now(); },
  hover(pointerType: string) {
    if (pointerType !== 'mouse' || performance.now() - movedAt > 250) return;
    platformAudio.play('hover');
  },
  play(kind: SoundEvent) {
    if (!state.enabled || !state.unlocked || state.sfxMuted || !context || document.hidden || state.sfxVolume === 0) return;
    const now = performance.now();
    if (now - lastEffect < (kind === 'hover' ? 140 : 65)) return;
    lastEffect = now;
    stopEffects(); // Short monophonic UI palette; rapid input cannot stack loud samples.
    let element = effects.get(kind);
    if (!element) { element = new Audio(`/audio/platform/${EFFECTS[kind].file}`); element.preload = 'none'; effects.set(kind, element); }
    element.volume = state.sfxVolume * EFFECTS[kind].gain;
    void element.play().catch(() => undefined);
  },
};
