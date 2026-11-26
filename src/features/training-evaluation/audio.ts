let muted = false;
let bgmAudio: HTMLAudioElement | null = null;
let currentVoice: HTMLAudioElement | null = null;
let duckTimeout: ReturnType<typeof setTimeout> | null = null;
let suspended = true;
const effects = new Set<HTMLAudioElement>();
let voicePosition: { file: string; time: number } | null = null;

export function audioPosition() {
  return currentVoice ? { file: currentVoice.src.split("/").pop() ?? "", time: currentVoice.currentTime } : voicePosition;
}
export function restoreVoicePosition(value: unknown) {
  if (value && typeof value === "object" && "file" in value && "time" in value && typeof value.file === "string" && typeof value.time === "number") voicePosition = { file: value.file, time: value.time };
}
export function pauseAudio() {
  suspended = true;
  bgmAudio?.pause(); currentVoice?.pause();
  for (const effect of effects) effect.pause();
  effects.clear();
  if (duckTimeout) clearTimeout(duckTimeout);
  if (ctx?.state === "running") void ctx.suspend().catch(() => undefined);
}
export function resumeAudio() {
  suspended = false;
  if (!muted) {
    startBgm();
    if (currentVoice) void currentVoice.play().catch(() => undefined);
  }
}

const AUDIO = "/game-audio/";
const BGM_NORMAL_VOL = 0.6;
const BGM_DUCKED_VOL = 0.18;

export const setMuted = (m: boolean) => {
  muted = m;
  if (bgmAudio) {
    bgmAudio.muted = m;
    if (!m && !suspended && bgmAudio.paused) void bgmAudio.play().catch(() => undefined);
  }
  if (currentVoice) {
    currentVoice.muted = m;
  }
  for (const effect of effects) effect.muted = m;
};

export function getCurrentVoice(): HTMLAudioElement | null {
  return currentVoice;
}

export function stopVoice() {
  if (currentVoice) {
    currentVoice.pause();
    currentVoice.currentTime = 0;
    currentVoice = null;
  }
  if (bgmAudio && !muted) {
    bgmAudio.volume = BGM_NORMAL_VOL;
  }
}

export function playVoice(file: string, onEnded?: () => void) {
  stopVoice();
  if (muted || typeof Audio === "undefined") return null;

  if (bgmAudio && !muted) {
    bgmAudio.volume = BGM_DUCKED_VOL;
  }

  const sound = new Audio(`${AUDIO}${file}`);
  currentVoice = sound;
  sound.volume = 0.95;
  sound.muted = muted;
  if (voicePosition?.file === file) sound.currentTime = voicePosition.time;
  voicePosition = null;

  sound.onended = () => {
    if (currentVoice === sound) {
      currentVoice = null;
      if (bgmAudio && !muted) {
        bgmAudio.volume = BGM_NORMAL_VOL;
      }
      onEnded?.();
    }
  };

  if (!suspended) void sound.play().catch(() => undefined);
  return sound;
}

function duckBgm(durationMs = 900) {
  if (!bgmAudio || muted) return;
  bgmAudio.volume = BGM_DUCKED_VOL;
  if (duckTimeout) clearTimeout(duckTimeout);
  duckTimeout = setTimeout(() => {
    if (bgmAudio && !muted) bgmAudio.volume = BGM_NORMAL_VOL;
  }, durationMs);
}

function play(file: string, volume = 0.5, duck = true) {
  if (muted || suspended || typeof Audio === "undefined") return;
  if (duck) duckBgm();
  const sound = new Audio(`${AUDIO}${file}`);
  sound.volume = volume;
  effects.add(sound);
  sound.onended = () => effects.delete(sound);
  sound.onerror = () => effects.delete(sound);
  void sound.play().catch(() => undefined);
}

export function startBgm() {
  if (suspended || typeof Audio === "undefined") return;
  bgmAudio ??= new Audio(`${AUDIO}bgm.mp3`);
  bgmAudio.loop = true;
  bgmAudio.volume = BGM_NORMAL_VOL;
  bgmAudio.muted = muted;
  if (bgmAudio.paused) void bgmAudio.play().catch(() => undefined);
}

export function stopBgm() {
  if (!bgmAudio) return;
  bgmAudio.pause();
  bgmAudio.currentTime = 0;
}

export function startRingtone() {
  if (muted || suspended || typeof Audio === "undefined") return () => {};
  const sound = new Audio("/sounds/interaction_phone_ringtone.mp3");
  sound.loop = true;
  sound.volume = 0.8;
  effects.add(sound);
  void sound.play().catch(() => undefined);
  return () => { sound.pause(); effects.delete(sound); };
}

export const sfx = {
  tap: () => play("click.mp3", 0.34, false),
  paper: () => play("page-turn.mp3", 0.48),
  door: () => play("door-open.mp3", 0.48),
  pen: () => play("pop.mp3", 0.34, false),
  stamp: () => play("confirmation_002.ogg", 0.6),
  chime: () => play("confirmation_001.ogg", 0.45),
  wobble: () => play("error_002.ogg", 0.38),
  win: () => { stopBgm(); play("win.mp3", 0.62, false); },
  lose: () => { stopBgm(); play("lose.mp3", 0.58, false); },
};
export const whoosh = () => play("woosh.mp3", 0.42, true);
let ctx: AudioContext | null = null;
export function tick(urgent = false) {
  if (muted || suspended || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = urgent ? 1100 : 820;
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.09);
  } catch { /* ignore */ }
}
