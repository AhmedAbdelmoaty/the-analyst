import assert from "node:assert/strict";
import test from "node:test";
import { CASES } from "../src/features/behind-the-dots/data/cases.ts";
import { initialState, reducer, ROUND_SECONDS, totalScore } from "../src/features/behind-the-dots/engine/gameState.ts";
import { loadState, saveState, sessionKey } from "../src/features/behind-the-dots/engine/persistence.ts";

const run = (state: any, ...actions: any[]) => actions.reduce(reducer, state);
const startChallenge = () => run(
  initialState,
  { type: "start", seed: 123 },
  ...Array.from({ length: 8 }, () => ({ type: "advanceBriefing" })),
  { type: "openCase" },
  { type: "revealTutorialPoint" },
  { type: "showTutorialDays" },
  { type: "setGuess", value: "up" },
  { type: "submitTutorial" },
  { type: "startChallenges" },
);
const resolveAndAdvance = (state: any, kind: "answer" | "timeout", value = "up") => run(
  state,
  kind === "answer" ? { type: "answer", value } : { type: "timeout" },
  { type: "attach" },
);

test("the active challenge starts with three hearts and a 20 second clock", () => {
  assert.equal(ROUND_SECONDS, 20);
  assert.equal(startChallenge().hearts, 3);
});

test("one challenge answer resolves exactly once and wrong answers cost one heart", () => {
  const before = startChallenge();
  const right = run(before, { type: "answer", value: "up" }, { type: "answer", value: "down" });
  assert.equal(right.phase, "reveal");
  assert.equal(right.results.C1.points, 3);
  assert.equal(right.hearts, 3);

  const wrong = run(before, { type: "answer", value: "down" }, { type: "timeout" });
  assert.equal(wrong.results.C1.points, 0);
  assert.equal(wrong.hearts, 2);
  assert.equal(totalScore(wrong), 0);
});

test("all three timed cases lead to one recommendation even with zero hearts", () => {
  let state = startChallenge();
  for (let i = 0; i < CASES.length; i++) state = resolveAndAdvance(state, "timeout");
  assert.equal(state.phase, "recommendation");
  assert.equal(state.caseIndex, 2);
  assert.equal(state.hearts, 0);
  assert.equal(state.evidence.length, 3);
});

test("one supported recommendation attempt produces Perfect or Saved, two failures produce Glitch Wins", () => {
  let perfect = startChallenge();
  for (let i = 0; i < CASES.length; i++) perfect = resolveAndAdvance(perfect, "answer", ["up", "down", "none"][i]);
  perfect = run(perfect, { type: "recommendationAnswer", choice: "A" });
  assert.equal(perfect.phase, "debrief");
  assert.equal(perfect.ending, "perfect");

  let saved = startChallenge();
  for (let i = 0; i < CASES.length; i++) saved = resolveAndAdvance(saved, "timeout");
  saved = run(saved, { type: "recommendationAnswer", choice: "A" });
  assert.equal(saved.ending, "saved");

  let glitch = startChallenge();
  for (let i = 0; i < CASES.length; i++) glitch = resolveAndAdvance(glitch, "timeout");
  glitch = run(glitch, { type: "recommendationAnswer", choice: "B" }, { type: "retryRecommendation" }, { type: "recommendationAnswer", choice: "C" });
  assert.equal(glitch.phase, "debrief");
  assert.equal(glitch.recommendationAttempts.length, 2);
  assert.equal(glitch.ending, "glitch");
});

test("v5 per-user save does not read or overwrite the legacy v3 progress key", () => {
  const store = new Map<string, string>([["the-analyst:behind-dots:v3:u1", JSON.stringify({ keep: true })]]);
  const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); }, removeItem: (key: string) => { store.delete(key); } };
  const fresh = loadState(storage, "u1");
  assert.equal(fresh.phase, "cover");
  saveState(storage, "u1", fresh);
  assert.equal(sessionKey("u1").includes("v5"), true);
  assert.equal(store.get("the-analyst:behind-dots:v3:u1"), JSON.stringify({ keep: true }));
});
