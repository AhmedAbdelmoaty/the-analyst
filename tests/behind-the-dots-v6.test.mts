import assert from "node:assert/strict";
import test from "node:test";
import { CASES } from "../src/features/behind-the-dots/data/cases.ts";
import { generateRunCases } from "../src/features/behind-the-dots/engine/datasets.ts";
import { patternFor, pearson } from "../src/features/behind-the-dots/engine/correlation.ts";
import { initialState, reducer, ROUND_SECONDS, totalScore } from "../src/features/behind-the-dots/engine/gameState.ts";
import { hasLegacyProgress, loadState, saveState, sessionKey } from "../src/features/behind-the-dots/engine/persistence.ts";

const run = (state: any, ...actions: any[]) => actions.reduce(reducer, state);
const startChallenge = () => run(initialState, { type: "start", seed: 123 }, { type: "skipStory" }, { type: "revealTutorialPoint" }, { type: "showTutorialDays" }, { type: "setGuess", value: "strongUp" }, { type: "submitTutorial" }, { type: "startChallenges" });
const correct = (c: (typeof CASES)[number]) => patternFor(pearson(c.xs, c.ys)!);
const answerAndAttach = (state: any, guess: string) => run(state, { type: "answer", value: guess }, { type: "attach" });

test("five approved cases keep their strength category across 100 deterministic seeds", () => {
  assert.deepEqual(CASES.map((c) => c.id), ["C1", "C2", "C3", "C4", "C5"]);
  assert.deepEqual(CASES.map(correct), ["strongUp", "weakUp", "none", "weakDown", "strongDown"]);
  for (let seed = 0; seed < 100; seed++) {
    const generated = generateRunCases(seed);
    assert.equal(generated.length, 5);
    generated.forEach((c, index) => {
      assert.equal(patternFor(pearson(c.xs, c.ys)!), correct(CASES[index]!));
      if (c.id === "C3") c.ys.forEach((sold, i) => assert.ok(sold <= c.xs[i]!, `seed ${seed}, observation ${i}`));
    });
  }
});

test("V7 classifies correlation by both direction and strength", () => {
  assert.deepEqual(
    [0.82, 0.42, 0.04, -0.48, -0.86].map(patternFor),
    ["strongUp", "weakUp", "none", "weakDown", "strongDown"],
  );
  assert.equal(CASES.length, 5);
  assert.equal(initialState.v, 7);
});

test("the five challenges use 20 seconds, three hearts, and one point per correct classification", () => {
  assert.equal(ROUND_SECONDS, 20);
  let state = startChallenge();
  assert.equal(state.hearts, 3);
  for (let index = 0; index < CASES.length; index++) state = answerAndAttach(state, correct(CASES[index]!));
  assert.equal(state.evidence.length, 5);
  assert.equal(totalScore(state), 5);
  assert.equal(state.phase, "recommendation");
});

test("the third missed challenge ends the round immediately", () => {
  const before = startChallenge();
  const wrong = run(before, { type: "answer", value: "strongDown" }, { type: "answer", value: "none" });
  assert.equal(wrong.hearts, 2);
  assert.equal(totalScore(wrong), 0);
  const timedOutTwice = run(before, { type: "timeout" }, { type: "timeout" });
  assert.equal(timedOutTwice.hearts, 2);
  assert.equal(timedOutTwice.results.C1?.timedOut, true);
  let state = before;
  for (let i = 0; i < 3; i++) {
    const actual = correct(CASES[i]!);
    state = run(state, { type: "answer", value: actual === "strongUp" ? "strongDown" : "strongUp" }, { type: "attach" });
  }
  assert.equal(state.hearts, 0);
  assert.equal(state.practiceAfterCapture, false);
  assert.equal(state.phase, "ending");
  assert.equal(state.ending, "glitch");
});

test("pause blocks answer resolution and a weak final recommendation does not erase earned progress", () => {
  const before = startChallenge();
  const paused = run(before, { type: "pause" });
  assert.equal(run(paused, { type: "answer", value: "strongUp" }), paused);
  let win = before;
  for (const c of CASES) win = answerAndAttach(win, correct(c));
  const ending = run(win, { type: "recommendationAnswer", choice: "B" });
  assert.equal(ending.phase, "ending");
  assert.equal(ending.ending, "perfect");
  assert.equal(run(ending, { type: "finishEnding" }).completed, true);
  assert.equal(run(win, { type: "recommendationAnswer", choice: "A" }).ending, "saved");
});

test("user-scoped save resumes the ending sequence and rejects obsolete V5 state", () => {
  const store = new Map<string, string>();
  const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); }, removeItem: (key: string) => { store.delete(key); } };
  let state = startChallenge();
  for (const c of CASES) state = answerAndAttach(state, correct(c));
  state = run(state, { type: "recommendationAnswer", choice: "B" });
  saveState(storage, "u1", state);
  assert.equal(loadState(storage, "u1").phase, "ending");
  store.set("the-analyst:behind-dots:v5:u1", JSON.stringify({ phase: "puzzle", caseIndex: 2 }));
  assert.equal(hasLegacyProgress(storage, "u1"), true);
  assert.equal(loadState(storage, "u1").phase, "ending");
  store.set(sessionKey("u1"), JSON.stringify({ ...state, v: 6 }));
  assert.equal(loadState(storage, "u1").phase, "cover");
});

test("an active challenge saves its remaining time and hydrates paused", () => {
  const store = new Map<string, string>();
  const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); }, removeItem: (key: string) => { store.delete(key); } };
  const active = reducer(startChallenge(), { type: "setTimer", seconds: 7 });
  saveState(storage, "timer-player", active);
  const restored = loadState(storage, "timer-player");
  assert.equal(restored.phase, "puzzle");
  assert.equal(restored.paused, true);
  assert.equal(restored.remainingSeconds, 7);
  assert.equal(reducer(restored, { type: "resume" }).paused, false);
});

test("V6 active saves without timer data fall back to 20 seconds", () => {
  const store = new Map<string, string>();
  const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); }, removeItem: (key: string) => { store.delete(key); } };
  store.set(sessionKey("legacy-timer"), JSON.stringify({ ...startChallenge(), paused: false }));
  const restored = loadState(storage, "legacy-timer");
  assert.equal(restored.remainingSeconds, 20);
  assert.equal(restored.paused, true);
});

test("a new challenge receives 20 seconds after attaching the previous result", () => {
  const active = startChallenge();
  const nearlyExpired = reducer(active, { type: "setTimer", seconds: 2 });
  const reveal = reducer(nearlyExpired, { type: "answer", value: "strongDown" });
  const nextChallenge = reducer(reveal, { type: "attach" });
  assert.equal(nextChallenge.caseIndex, 1);
  assert.equal(nextChallenge.remainingSeconds, 20);
});

test("pausing a challenge preserves its time and rejects a queued countdown tick", () => {
  const active = reducer(startChallenge(), { type: "setTimer", seconds: 9 });
  const paused = reducer(active, { type: "pause" });
  assert.equal(paused.remainingSeconds, 9);
  assert.equal(reducer(paused, { type: "setTimer", seconds: 8 }), paused);
});
