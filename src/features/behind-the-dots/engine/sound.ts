import { Howl, Howler } from "howler";

export type SoundKind = "tap" | "reveal" | "save" | "win" | "lose" | "heart" | "timeout" | "page" | "notebook" | "evidence" | "tick" | "entrance" | "impact" | "stumble" | "bell" | "perfect" | "saved" | "defeat" | "marketAmbience";
export type AudioBus = "music" | "sfx" | "ambience";

const MANIFEST: Record<SoundKind, { file: string; bus: AudioBus; volume: number; loop?: boolean }> = {
  tap: { file: "click_001.wav", bus: "sfx", volume: 0.36 },
  reveal: { file: "confirmation_001.wav", bus: "sfx", volume: 0.34 },
  save: { file: "confirmation_001.wav", bus: "sfx", volume: 0.4 },
  win: { file: "bong_001.wav", bus: "sfx", volume: 0.48 },
  lose: { file: "error_001.wav", bus: "sfx", volume: 0.34 },
  heart: { file: "drop_001.wav", bus: "sfx", volume: 0.4 },
  timeout: { file: "glitch_001.wav", bus: "sfx", volume: 0.38 },
  page: { file: "paper_flip.ogg", bus: "sfx", volume: 0.3 },
  notebook: { file: "open_001.wav", bus: "sfx", volume: 0.3 },
  evidence: { file: "confirmation_001.wav", bus: "sfx", volume: 0.32 },
  tick: { file: "tick_001.wav", bus: "sfx", volume: 0.2 },
  entrance: { file: "glitch_001.wav", bus: "sfx", volume: 0.24 },
  impact: { file: "cartoon_impact.ogg", bus: "sfx", volume: 0.32 },
  stumble: { file: "cartoon_stumble.ogg", bus: "sfx", volume: 0.35 },
  bell: { file: "cart_bell.ogg", bus: "sfx", volume: 0.22 },
  perfect: { file: "victory_fanfare.ogg", bus: "music", volume: 0.62 },
  saved: { file: "saved_victory.ogg", bus: "music", volume: 0.4 },
  defeat: { file: "comic_defeat.ogg", bus: "music", volume: 0.42 },
  marketAmbience: { file: "cart_refrigeration.mp3", bus: "ambience", volume: 0.28, loop: true },
};

const buses: Record<AudioBus, number> = { music: 0.55, sfx: 0.85, ambience: 0.18 };
const loaded = new Map<SoundKind, Howl>();
let muted = false;
let paused = false;
const pausedIds = new Map<Howl, number[]>();
const activeIds = new Map<Howl, Set<number>>();

function sound(kind: SoundKind) {
  let howl = loaded.get(kind);
  if (!howl) {
    const item = MANIFEST[kind];
    const format = item.file.slice(item.file.lastIndexOf(".") + 1);
    const ids = new Set<number>();
    howl = new Howl({
      src: [`/assets/behind-dots/audio/${item.file}`],
      format: [format],
      volume: item.volume * buses[item.bus],
      preload: true,
      pool: 2,
      loop: item.loop ?? false,
      onplay: (id) => ids.add(id),
      onend: (id) => ids.delete(id),
      onstop: (id) => ids.delete(id),
    });
    activeIds.set(howl, ids);
    loaded.set(kind, howl);
  }
  return howl;
}

export const gameAudio = {
  play(kind: SoundKind) {
    if (muted || paused || typeof window === "undefined") return;
    const howl = sound(kind);
    if (MANIFEST[kind].loop && howl.playing()) return;
    howl.play();
  },
  setMuted(value: boolean) { muted = value; Howler.mute(value); },
  getBusVolume(bus: AudioBus) { return buses[bus]; },
  setBusVolume(bus: AudioBus, value: number) {
    buses[bus] = Math.max(0, Math.min(1, value));
    for (const [kind, howl] of loaded) {
      const item = MANIFEST[kind];
      if (item.bus === bus) howl.volume(item.volume * buses[bus]);
    }
  },
  pause() {
    if (paused) return;
    paused = true;
    pausedIds.clear();
    for (const howl of loaded.values()) {
      const ids = [...(activeIds.get(howl) ?? [])].filter((id) => howl.playing(id));
      if (ids.length) pausedIds.set(howl, ids);
      for (const id of ids) howl.pause(id);
    }
  },
  resume() {
    if (!paused) { Howler.mute(muted); return; }
    paused = false;
    Howler.mute(muted);
    for (const [howl, ids] of pausedIds) for (const id of ids) howl.play(id);
    pausedIds.clear();
  },
  stop() { pausedIds.clear(); for (const howl of loaded.values()) howl.stop(); activeIds.clear(); },
  dispose() { this.stop(); for (const howl of loaded.values()) howl.unload(); loaded.clear(); activeIds.clear(); },
};

export function playTone(kind: SoundKind, isMuted: boolean) {
  gameAudio.setMuted(isMuted);
  gameAudio.play(kind);
}
