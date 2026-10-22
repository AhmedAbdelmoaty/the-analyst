import { describe, expect, it } from "bun:test";
import { CASES, TUTORIAL, type Pattern } from "../src/features/behind-the-dots/data/cases";
import { patternFor, pearson } from "../src/features/behind-the-dots/engine/correlation";
import { initialState, reducer, ROUND_SECONDS, totalScore, type Action, type GameState } from "../src/features/behind-the-dots/engine/gameState";
import { hasLegacyProgress, loadState, saveState, sessionKey } from "../src/features/behind-the-dots/engine/persistence";

const run = (state: GameState, ...actions: Action[]) => actions.reduce(reducer, state);
const memStore = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};
const toTutorial = () => run(initialState, { type: "start" }, { type: "skipStory" }, { type: "revealTutorialPoint" }, { type: "showTutorialDays" });
const toPuzzle = () => run(toTutorial(), { type: "setGuess", value: "up" }, { type: "submitTutorial" }, { type: "startChallenges" });
const answerAndAdvance = (s: GameState, answer: Pattern | null) => run(s, answer ? { type: "answer", value: answer } : { type: "timeout" }, { type: "attach" });

describe("behind the dots patterns", () => {
  it("keeps the original three cases and the training relationship", () => {
    expect(patternFor(pearson(TUTORIAL.xs, TUTORIAL.ys)!)).toBe("up");
    expect(CASES.map((c) => patternFor(pearson(c.xs, c.ys)!))).toEqual(["up", "down", "none"]);
  });
  it("uses the 20 second clock and three hearts", () => {
    expect(ROUND_SECONDS).toBe(20);
    expect(toPuzzle().hearts).toBe(3);
  });
  it("offers a visible no-penalty tutorial path and continues after two misses", () => {
    const before = run(initialState, { type: "start" }, { type: "skipStory" });
    const clicked = run(before, { type: "revealTutorialPoint" });
    const fallback = run(before, { type: "revealTutorialPoint" });
    expect(clicked.tutorialStep).toBe(1);
    expect(fallback.tutorialStep).toBe(1);
    const completePlot = run(fallback, { type: "showTutorialDays" });
    const secondMiss = run(completePlot, { type: "setGuess", value: "down" }, { type: "submitTutorial" }, { type: "setGuess", value: "none" }, { type: "submitTutorial" });
    expect(secondMiss.phase).toBe("tutorialReady");
    expect(secondMiss.hearts).toBe(3);
  });
  it("resolves one answer only and charges one heart for wrong or timed-out answers", () => {
    const before = toPuzzle();
    const right = run(before, { type: "answer", value: "up" }, { type: "answer", value: "down" });
    expect(right.phase).toBe("reveal");
    expect(right.results.C1?.points).toBe(3);
    expect(right.hearts).toBe(3);
    const wrong = run(before, { type: "answer", value: "down" }, { type: "timeout" });
    expect(wrong.results.C1?.points).toBe(0);
    expect(wrong.hearts).toBe(2);
    const timeout = run(before, { type: "timeout" });
    expect(timeout.results.C1?.timedOut).toBe(true);
    expect(timeout.hearts).toBe(2);
    expect(totalScore(timeout)).toBe(0);
  });
  it("reaches one recommendation after all three cases even with no hearts", () => {
    let s = toPuzzle();
    for (let i = 0; i < CASES.length; i++) s = answerAndAdvance(s, null);
    expect(s.phase).toBe("recommendation");
    expect(s.hearts).toBe(0);
    expect(s.evidence).toHaveLength(3);
  });
  it("sets the three endings using the single recommendation and two-attempt cap", () => {
    let perfect = toPuzzle();
    for (const pattern of ["up", "down", "none"] as const) perfect = answerAndAdvance(perfect, pattern);
    perfect = run(perfect, { type: "recommendationAnswer", choice: "A" });
    expect(perfect.ending).toBe("perfect");

    let saved = toPuzzle();
    for (let i = 0; i < CASES.length; i++) saved = answerAndAdvance(saved, null);
    saved = run(saved, { type: "recommendationAnswer", choice: "A" });
    expect(saved.ending).toBe("saved");

    let glitch = toPuzzle();
    for (let i = 0; i < CASES.length; i++) glitch = answerAndAdvance(glitch, null);
    glitch = run(glitch, { type: "recommendationAnswer", choice: "B" }, { type: "retryRecommendation" }, { type: "recommendationAnswer", choice: "C" });
    expect(glitch.ending).toBe("glitch");
    expect(glitch.recommendationAttempts).toHaveLength(2);
  });
  it("uses a separate user-bound v5 save and leaves v3 progress untouched", () => {
    const store = memStore();
    store.setItem("the-analyst:behind-dots:v3:u1", JSON.stringify({ keep: true }));
    expect(hasLegacyProgress(store, "u1")).toBe(true);
    const fresh = loadState(store, "u1");
    expect(fresh.phase).toBe("cover");
    saveState(store, "u1", fresh);
    expect(sessionKey("u1")).toContain("v5");
    expect(store.getItem("the-analyst:behind-dots:v3:u1")).toBe(JSON.stringify({ keep: true }));
    expect(store.getItem(sessionKey("u2"))).toBeNull();
  });
});
