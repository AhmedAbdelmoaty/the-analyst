export type AudioBus = "music" | "sfx" | "ambience";

export const AUDIO_MANIFEST = {
  button: { file: "button.ogg", bus: "sfx", volume: 0.68 },
  menuOpen: { file: "menu_open.ogg", bus: "sfx", volume: 0.72 },
  answerSelect: { file: "answer_select.ogg", bus: "sfx", volume: 0.7 },
  correct: { file: "correct.ogg", bus: "sfx", volume: 0.9 },
  wrong: { file: "wrong.ogg", bus: "sfx", volume: 0.86 },
  heartLost: { file: "heart_lost.ogg", bus: "sfx", volume: 0.95 },
  countdownTick: { file: "countdown_tick.ogg", bus: "sfx", volume: 0.27 },
  notebook: { file: "notebook.ogg", bus: "sfx", volume: 0.55 },
  evidence: { file: "evidence.ogg", bus: "sfx", volume: 0.82 },
  glitchEntrance: { file: "glitch_entrance.ogg", bus: "sfx", volume: 0.78 },
  jumpLand: { file: "jump_land.ogg", bus: "sfx", volume: 0.62 },
  stumble: { file: "stumble.ogg", bus: "sfx", volume: 0.8 },
  cartBell: { file: "cart_bell.ogg", bus: "sfx", volume: 0.48 },
  footstep: { file: "footstep.ogg", bus: "sfx", volume: 0.22 },
  perfectWin: { file: "perfect_win.ogg", bus: "music", volume: 0.85 },
  savedWin: { file: "saved_win.ogg", bus: "music", volume: 0.8 },
  defeat: { file: "defeat.ogg", bus: "music", volume: 0.82 },
} as const satisfies Record<string, { file: string; bus: AudioBus; volume: number }>;

export type SoundKind = keyof typeof AUDIO_MANIFEST;

export const shouldPlayCountdownTick = (seconds: number, active: boolean, paused: boolean) =>
  active && !paused && seconds >= 1 && seconds <= 5;

export function nextCountdownTick(seconds: number, active: boolean, paused: boolean, lastPlayed: number | null) {
  if (!active) return { play: false, lastPlayed: null };
  if (!shouldPlayCountdownTick(seconds, active, paused) || seconds === lastPlayed) {
    return { play: false, lastPlayed };
  }
  return { play: true, lastPlayed: seconds };
}
