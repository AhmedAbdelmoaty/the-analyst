import assert from "node:assert/strict";
import test from "node:test";
import { CASES } from "../src/features/behind-the-dots/data/cases.ts";
import { generateRunCases } from "../src/features/behind-the-dots/engine/datasets.ts";
import { patternFor, pearson } from "../src/features/behind-the-dots/engine/correlation.ts";
import { initialState, reducer, ROUND_SECONDS, totalScore } from "../src/features/behind-the-dots/engine/gameState.ts";
import { hasLegacyProgress, loadState, saveState, sessionKey } from "../src/features/behind-the-dots/engine/persistence.ts";

const run = (state: any, ...actions: any[]) => actions.reduce(reducer, state);
const startChallenge = () => run(initialState, { type: "start", seed: 123 }, { type: "skipStory" }, { type: "revealTutorialPoint" }, { type: "showTutorialDays" }, { type: "setGuess", value: "up" }, { type: "submitTutorial" }, { type: "startChallenges" });
const correct = (c: (typeof CASES)[number]) => patternFor(pearson(c.xs, c.ys)!);
const answerAndAttach = (state: any, guess: string) => run(state, { type: "answer", value: guess }, { type: "attach" });

test("four approved cases keep their direction across 100 deterministic seeds", () => {
  assert.deepEqual(CASES.map((c) => c.id), ["C1", "C2", "C3", "C4"]);
  assert.deepEqual(CASES.map(correct), ["up", "up", "none", "down"]);
  for (let seed = 0; seed < 100; seed++) {
    const generated = generateRunCases(seed);
    assert.equal(generated.length, 4);
    generated.forEach((c, index) => {
      assert.equal(patternFor(pearson(c.xs, c.ys)!), correct(CASES[index]!));
      if (c.id === "C3") c.ys.forEach((sold, i) => assert.ok(sold <= c.xs[i]!, `seed ${seed}, observation ${i}`));
    });
  }
});

test("the four challenges use 20 seconds, three hearts, and award at most 12 points", () => {
  assert.equal(ROUND_SECONDS, 20);
  let state = startChallenge();
  assert.equal(state.hearts, 3);
  for (let index = 0; index < CASES.length; index++) state = answerAndAttach(state, correct(CASES[index]!));
  assert.equal(state.evidence.length, 4);
  assert.equal(totalScore(state), 12);
  assert.equal(state.phase, "recommendation");
});

test("wrong answer or timeout removes exactly one heart; zero hearts enables practice", () => {
  const before = startChallenge();
  const wrong = run(before, { type: "answer", value: "down" }, { type: "answer", value: "none" });
  assert.equal(wrong.hearts, 2);
  assert.equal(totalScore(wrong), 0);
  const timedOutTwice = run(before, { type: "timeout" }, { type: "timeout" });
  assert.equal(timedOutTwice.hearts, 2);
  assert.equal(timedOutTwice.results.C1?.timedOut, true);
  let state = before;
  for (let i = 0; i < 3; i++) {
    const actual = correct(CASES[i]!);
    state = run(state, { type: "answer", value: actual === "up" ? "down" : "up" }, { type: "attach" });
  }
  assert.equal(state.hearts, 0);
  assert.equal(state.practiceAfterCapture, true);
  const practiceAnswer = run(state, { type: "answer", value: "down" });
  assert.equal(practiceAnswer.phase, "reveal");
  assert.equal(practiceAnswer.hearts, 0);
  assert.equal(practiceAnswer.results.C4?.points, 0);
  const review = run(practiceAnswer, { type: "attach" });
  assert.equal(review.phase, "recommendation");
  assert.equal(review.evidence.length, 4);
  assert.equal(run(review, { type: "recommendationAnswer", choice: "B" }).ending, "glitch");
});

test("pause blocks answer resolution and supported choice B wins only with hearts remaining", () => {
  const before = startChallenge();
  const paused = run(before, { type: "pause" });
  assert.equal(run(paused, { type: "answer", value: "up" }), paused);
  let win = before;
  for (const c of CASES) win = answerAndAttach(win, correct(c));
  const ending = run(win, { type: "recommendationAnswer", choice: "B" });
  assert.equal(ending.phase, "ending");
  assert.equal(ending.ending, "perfect");
  assert.equal(run(ending, { type: "finishEnding" }).completed, true);
  assert.equal(run(win, { type: "recommendationAnswer", choice: "A" }).ending, "glitch");
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
  store.set(sessionKey("u1"), JSON.stringify({ ...state, v: 5 }));
  assert.equal(loadState(storage, "u1").phase, "cover");
});
