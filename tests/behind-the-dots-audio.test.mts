import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { AUDIO_MANIFEST, nextCountdownTick, shouldPlayCountdownTick } from "../src/features/behind-the-dots/engine/audioManifest.ts";

test("audio manifest maps the 17 approved selections to their prepared assets", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(AUDIO_MANIFEST).map(([kind, sound]) => [kind, sound.file])), {
    button: "button.ogg",
    menuOpen: "menu_open.ogg",
    answerSelect: "answer_select.ogg",
    correct: "correct.ogg",
    wrong: "wrong.ogg",
    heartLost: "heart_lost.ogg",
    countdownTick: "countdown_tick.ogg",
    notebook: "notebook.ogg",
    evidence: "evidence.ogg",
    glitchEntrance: "glitch_entrance.ogg",
    jumpLand: "jump_land.ogg",
    stumble: "stumble.ogg",
    cartBell: "cart_bell.ogg",
    footstep: "footstep.ogg",
    perfectWin: "perfect_win.ogg",
    savedWin: "saved_win.ogg",
    defeat: "defeat.ogg",
  });
  assert.equal(Object.keys(AUDIO_MANIFEST).length, 17);
  assert.ok(Object.values(AUDIO_MANIFEST).every(({ volume }) => volume > 0 && volume <= 1));
  assert.ok(Object.values(AUDIO_MANIFEST).every(({ bus }) => bus !== "ambience"));
  for (const { file } of Object.values(AUDIO_MANIFEST)) {
    assert.ok(existsSync(resolve("public/assets/behind-dots/audio", file)), `missing bundled sound: ${file}`);
  }
  const packageManifest = JSON.parse(readFileSync(resolve("public/assets/behind-dots/audio/manifest.json"), "utf8")) as Record<string, { source: string }>;
  const approvedSources = [
    "click4.ogg", "open_002.ogg", "select_005.ogg", "confirmation_004.ogg", "error_002.ogg",
    "impactGlass_light_001.ogg", "tick_002.ogg", "open_003.ogg", "glass_003.ogg", "glitch_004.ogg",
    "impactGeneric_light_003.ogg", "impactPunch_medium_002.ogg", "glass_001.ogg",
    "footstep_concrete_000.ogg", "jingles_PIZZI00.ogg", "jingles_PIZZI03.ogg", "jingles_NES08.ogg",
  ];
  assert.deepEqual(Object.values(packageManifest).map(({ source }) => source.split(/[\\/]/).pop()), approvedSources);
});

test("countdown ticks are allowed once only for active, unpaused final-five-second values", () => {
  for (let seconds = 20; seconds > 5; seconds--) assert.equal(shouldPlayCountdownTick(seconds, true, false), false);
  for (let seconds = 5; seconds >= 1; seconds--) assert.equal(shouldPlayCountdownTick(seconds, true, false), true);
  assert.equal(shouldPlayCountdownTick(0, true, false), false);
  assert.equal(shouldPlayCountdownTick(5, false, false), false);
  assert.equal(shouldPlayCountdownTick(5, true, true), false);
});

test("countdown tick scheduling prevents repeats through pause and resets on scene exit", () => {
  let lastPlayed: number | null = null;
  for (let seconds = 5; seconds >= 1; seconds--) {
    const tick = nextCountdownTick(seconds, true, false, lastPlayed);
    assert.equal(tick.play, true);
    lastPlayed = tick.lastPlayed;
    const rerender = nextCountdownTick(seconds, true, false, lastPlayed);
    assert.equal(rerender.play, false);
    lastPlayed = rerender.lastPlayed;
  }
  const paused = nextCountdownTick(1, true, true, lastPlayed);
  assert.equal(paused.play, false);
  assert.equal(nextCountdownTick(1, true, false, paused.lastPlayed).play, false);
  const stopped = nextCountdownTick(0, false, false, paused.lastPlayed);
  assert.deepEqual(stopped, { play: false, lastPlayed: null });
  assert.equal(nextCountdownTick(5, true, false, stopped.lastPlayed).play, true);
});
