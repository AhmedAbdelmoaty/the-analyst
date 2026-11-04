export const SOUND_CUES = Object.freeze({
  officeEntry: 'door-open.mp3',
  sceneChange: 'page-turn.mp3',
  button: 'click.mp3',
  recordSelect: 'pop.mp3',
  clipAttach: 'woosh.mp3',
  actualDistribution: 'sweep.mp3',
  tryDistribution: 'hospital-ding.mp3',
  mixAdjustment: 'click.mp3',
  proofPin: 'woosh.mp3',
  success: 'win.mp3',
  successAccent: 'confettipop.mp3',
  failure: 'lose.mp3',
  failureAccent: 'horn-short.mp3',
});

const VOLUME = Object.freeze({
  'door-open.mp3': 0.88,
  'page-turn.mp3': 0.82,
  'pop.mp3': 0.9,
  'click.mp3': 0.82,
  'hospital-ding.mp3': 0.82,
  'sweep.mp3': 0.9,
  'woosh.mp3': 0.9,
  'win.mp3': 1,
  'confettipop.mp3': 0.92,
  'lose.mp3': 0.96,
  'horn-short.mp3': 0.62,
});

export function createAudioManager() {
  let muted = false;
  const players = new Map();

  function createPlayer(file) {
    const player = new Audio(new URL(`../audio/${file}`, import.meta.url));
    player.preload = 'auto';
    player.volume = VOLUME[file] ?? 0.85;
    player.muted = muted;
    player.load();
    return player;
  }

  for (const file of new Set(Object.values(SOUND_CUES))) players.set(file, [createPlayer(file)]);

  function play(cue) {
    const file = SOUND_CUES[cue];
    if (!file || muted) return;
    const pool = players.get(file);
    let player = pool.find((candidate) => candidate.paused || candidate.ended);
    if (!player) {
      player = createPlayer(file);
      pool.push(player);
    }
    player.currentTime = 0;
    player.muted = false;
    player.play().catch(() => {});
  }

  function toggleMuted() {
    muted = !muted;
    for (const pool of players.values()) {
      for (const player of pool) player.muted = muted;
    }
    return muted;
  }

  return { play, toggleMuted, isMuted: () => muted };
}
