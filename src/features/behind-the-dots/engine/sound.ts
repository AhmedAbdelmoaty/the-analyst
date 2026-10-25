import { Howl, Howler } from "howler";
import { AUDIO_MANIFEST, type AudioBus, type SoundKind } from "./audioManifest";

export type { AudioBus, SoundKind } from "./audioManifest";

const ENDING_MUSIC: SoundKind[] = ["perfectWin", "savedWin", "defeat"];
const DEFAULT_BUS_VOLUMES: Record<AudioBus, number> = { music: 0.8, sfx: 0.85, ambience: 0 };
const ENDING_SFX_DUCK = 0.62;
const loaded = new Map<SoundKind, Howl>();
const activeIds = new Map<SoundKind, Set<number>>();
const pausedIds = new Map<SoundKind, number[]>();
const buses = { ...DEFAULT_BUS_VOLUMES };
const lastPlayedAt = new Map<SoundKind, number>();
let muted = false;
let paused = false;
let unlocked = false;
let endingMusic: SoundKind | null = null;

function getVolume(kind: SoundKind) {
  const item = AUDIO_MANIFEST[kind];
  const duck = item.bus === "sfx" && endingMusic ? ENDING_SFX_DUCK : 1;
  return item.volume * buses[item.bus] * duck;
}

function refreshVolumes() {
  for (const [kind, howl] of loaded) howl.volume(getVolume(kind));
}

function clearEndingMusicIfIdle() {
  if (endingMusic && !ENDING_MUSIC.some((kind) => (activeIds.get(kind)?.size ?? 0) > 0)) {
    endingMusic = null;
    refreshVolumes();
  }
}

function sound(kind: SoundKind) {
  let howl = loaded.get(kind);
  if (howl) return howl;

  const ids = new Set<number>();
  activeIds.set(kind, ids);
  const item = AUDIO_MANIFEST[kind];
  howl = new Howl({
    src: [`/assets/behind-dots/audio/${item.file}`],
    format: ["ogg"],
    volume: getVolume(kind),
    preload: true,
    pool: kind === "footstep" ? 1 : 2,
    loop: false,
    onplay: (id) => ids.add(id),
    onend: (id) => { ids.delete(id); clearEndingMusicIfIdle(); },
    onstop: (id) => { ids.delete(id); clearEndingMusicIfIdle(); },
    onloaderror: () => { ids.clear(); loaded.delete(kind); activeIds.delete(kind); },
  });
  loaded.set(kind, howl);
  return howl;
}

function stopKind(kind: SoundKind) {
  const howl = loaded.get(kind);
  if (!howl) return;
  howl.stop();
  pausedIds.delete(kind);
  if (ENDING_MUSIC.includes(kind) && endingMusic === kind) {
    endingMusic = null;
    refreshVolumes();
  }
}

export const gameAudio = {
  unlock() {
    if (typeof window === "undefined") return;
    if (!unlocked) {
      unlocked = true;
      for (const kind of Object.keys(AUDIO_MANIFEST) as SoundKind[]) sound(kind);
    }
    const context = Howler.ctx;
    if (context?.state === "suspended") void context.resume().catch(() => undefined);
  },
  play(kind: SoundKind) {
    if (muted || paused || typeof window === "undefined") return;
    const ids = activeIds.get(kind);
    if (ids?.size) return;

    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    const minInterval = kind === "button" ? 85 : kind === "footstep" ? 280 : 60;
    const previous = lastPlayedAt.get(kind);
    if (previous !== undefined && now - previous < minInterval) return;
    lastPlayedAt.set(kind, now);

    if (ENDING_MUSIC.includes(kind)) {
      for (const endingKind of ENDING_MUSIC) if (endingKind !== kind) stopKind(endingKind);
      endingMusic = kind;
      refreshVolumes();
    }

    const howl = sound(kind);
    const id = howl.play();
    if (typeof id === "number") activeIds.get(kind)?.add(id);
  },
  setMuted(value: boolean) {
    muted = value;
    Howler.mute(value);
  },
  getBusVolume(bus: AudioBus) { return buses[bus]; },
  setBusVolume(bus: AudioBus, value: number) {
    buses[bus] = Math.max(0, Math.min(1, value));
    refreshVolumes();
  },
  pause() {
    if (paused) return;
    paused = true;
    pausedIds.clear();
    for (const [kind, howl] of loaded) {
      if (AUDIO_MANIFEST[kind].bus !== "music") { howl.stop(); continue; }
      const ids = [...(activeIds.get(kind) ?? [])].filter((id) => howl.playing(id));
      if (ids.length) pausedIds.set(kind, ids);
      for (const id of ids) howl.pause(id);
    }
  },
  resume() {
    if (!paused) { Howler.mute(muted); return; }
    paused = false;
    Howler.mute(muted);
    for (const [kind, ids] of pausedIds) {
      const howl = loaded.get(kind);
      for (const id of ids) howl?.play(id);
    }
    pausedIds.clear();
  },
  stop(kind?: SoundKind) {
    if (kind) { stopKind(kind); return; }
    for (const howl of loaded.values()) howl.stop();
    pausedIds.clear();
    paused = false;
    endingMusic = null;
    refreshVolumes();
  },
  stopEndingMusic() {
    for (const kind of ENDING_MUSIC) stopKind(kind);
  },
  dispose() {
    this.stop();
    for (const howl of loaded.values()) howl.unload();
    loaded.clear();
    activeIds.clear();
    lastPlayedAt.clear();
    unlocked = false;
  },
};
