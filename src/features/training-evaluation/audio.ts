let muted = false;
let bgmAudio: HTMLAudioElement | null = null;
let duckTimeout: ReturnType<typeof setTimeout> | null = null;

const AUDIO = "/game-audio/";
const BGM_NORMAL_VOL = 0.6;
const BGM_DUCKED_VOL = 0.18;

export const setMuted = (m: boolean) => {
  muted = m;
  if (!bgmAudio) return;
  bgmAudio.muted = m;
  if (!m && bgmAudio.paused) void bgmAudio.play().catch(() => undefined);
};

function duckBgm(durationMs = 900) {
  if (!bgmAudio || muted) return;
  bgmAudio.volume = BGM_DUCKED_VOL;
  if (duckTimeout) clearTimeout(duckTimeout);
  duckTimeout = setTimeout(() => {
    if (bgmAudio && !muted) bgmAudio.volume = BGM_NORMAL_VOL;
  }, durationMs);
}

function play(file: string, volume = 0.5, duck = true) {
  if (muted || typeof Audio === "undefined") return;
  if (duck) duckBgm();
  const sound = new Audio(`${AUDIO}${file}`);
  sound.volume = volume;
  void sound.play().catch(() => undefined);
}

export function startBgm() {
  if (typeof Audio === "undefined") return;
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
  if (muted || typeof window === "undefined") return;
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
