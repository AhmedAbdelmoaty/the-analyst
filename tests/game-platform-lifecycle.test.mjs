import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Problem Framing exposes an exit that saves and pauses before returning home', async () => {
  const [page, settings] = await Promise.all([
    read('src/pages/Index.tsx'),
    read('src/components/game/PlayerSettingsPanel.tsx'),
  ]);
  assert.match(page, /useGamePlatformExit\(doPause\)/);
  assert.match(settings, /onExit/);
  assert.match(settings, /onClick=\{onExit\}/);
});

test('Behind the Dots exposes exit and pauses briefing typewriter activity', async () => {
  const game = await read('src/features/behind-the-dots/BehindTheDotsGame.tsx');
  assert.match(game, /useGamePlatformExit\(/);
  assert.match(game, /onExit=/);
  assert.match(game, /state\.paused\).*return/);
  assert.match(game, /clearDelayedAudio\(\);\s*rawDispatch\(\{ type: "pause" \}\)/);
});

test('Reward Decision keeps its run exit and exposes exit from its pause layer', async () => {
  const [game, pauseLayer] = await Promise.all([
    read('src/features/reward-decision/RewardDecisionGame.tsx'),
    read('src/features/reward-decision/components/Ui.tsx'),
  ]);
  assert.match(game, /const exit = useGamePlatformExit\(/);
  assert.match(game, /onExit=\{exit\}/);
  assert.match(pauseLayer, /onExit\?:\(\)=>void/);
});

test('Crack the Code manual and hidden pauses require explicit resume', async () => {
  const game = await read('public/crack-the-code/game.js');
  assert.match(game, /case'pause'/);
  assert.match(game, /case'resume'/);
  assert.match(game, /paused:manuallyPaused/);
  assert.match(game, /manuallyPaused=!!previous\.paused/);
  assert.match(game, /if\(document\.hidden\)\{manuallyPaused=true/);
  assert.match(game, /!manuallyPaused&&!document\.hidden/);
});

test('Decision Matrix visibility handling does not restart narration while hidden', async () => {
  const game = await read('public/decision-matrix/app.js');
  assert.match(game, /function syncSceneVoice\(\)\{\s*if\(document\.hidden\)return;/);
  assert.match(game, /visibilitychange',\(\)=>\{if\(document\.hidden\)\{stopVoice\('paused'\)/);
});
