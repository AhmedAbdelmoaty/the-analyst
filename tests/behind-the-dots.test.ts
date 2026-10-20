import { describe, expect, it } from "bun:test";
import { CASES, TUTORIAL } from "../src/features/behind-the-dots/data/cases";
import { formatR, patternFor, pearson, scoreGuess } from "../src/features/behind-the-dots/engine/correlation";
import { initialState, reducer, totalScore, type Action, type GameState } from "../src/features/behind-the-dots/engine/gameState";
import { loadState, saveState, sessionKey } from "../src/features/behind-the-dots/engine/persistence";

const run = (s: GameState, ...as: Action[]) => as.reduce(reducer, s);
const memStore = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe("pearson", () => {
  it("identifies the intended ice cream patterns", () => {
    expect(patternFor(pearson(TUTORIAL.xs, TUTORIAL.ys)!)).toBe("up");
    expect(CASES.map((c) => patternFor(pearson(c.xs, c.ys)!))).toEqual(["up", "down", "none"]);
  });
  it("is order-invariant", () => {
    const c = CASES[0]!;
    expect(pearson([...c.xs].reverse(), [...c.ys].reverse())).toBeCloseTo(pearson(c.xs, c.ys)!, 12);
  });
  it("returns null for degenerate input, never NaN", () => {
    expect(pearson([], [])).toBeNull();
    expect(pearson([1], [2])).toBeNull();
    expect(pearson([1, 2, 3], [5, 5, 5])).toBeNull();
    expect(formatR(null)).not.toContain("NaN");
  });
});

describe("scoring thresholds", () => {
  it("awards 3/2/1/0 at exact boundaries", () => {
    expect(scoreGuess(0.65, 0.5).points).toBe(3);
    expect(scoreGuess(0.8, 0.5).points).toBe(2);
    expect(scoreGuess(1.0, 0.5).points).toBe(1);
    expect(scoreGuess(-0.01, 0.5).points).toBe(0);
  });
});

describe("game flow", () => {
  const toPuzzle = () =>
    run(initialState, { type: "start" }, { type: "openCase" }, { type: "setGuess", value: "up" }, { type: "submitTutorial" }, { type: "finishTutorial" });

  it("tutorial cannot be skipped on first play", () => {
    const s = run(initialState, { type: "start" }, { type: "openCase" }, { type: "skipTutorial", tutorialEverDone: false });
    expect(s.phase).toBe("tutorial");
  });
  it("awards points once per case and saves evidence once", () => {
    let s = run(toPuzzle(), { type: "setGuess", value: "up" }, { type: "submit" });
    expect(s.results.C1?.points).toBe(3);
    s = run(s, { type: "submit" }, { type: "attach" }, { type: "attach" });
    expect(s.evidence).toEqual(["C1"]);
    expect(totalScore(s)).toBe(3);
  });
  it("stores one of the three visual choices", () => {
    expect(run(toPuzzle(), { type: "setGuess", value: "up" }).guess).toBe("up");
    expect(run(toPuzzle(), { type: "setGuess", value: "down" }).guess).toBe("down");
  });
  it("timeout reveals and costs 1 point, never below 0", () => {
    const s = run(toPuzzle(), { type: "setGuess", value: "up" }, { type: "timeout" });
    expect(s.phase).toBe("reveal");
    expect(s.results.C1?.points).toBe(2);
    expect(s.results.C1?.timedOut).toBe(true);
    const z = run(toPuzzle(), { type: "setGuess", value: "down" }, { type: "timeout" });
    expect(z.results.C1?.points).toBe(0);
  });
  it("hints do not change the guess or reveal r", () => {
    const s = run(toPuzzle(), { type: "hint" }, { type: "hint" }, { type: "hint" });
    expect(s.hintsUsed).toBe(2);
    expect(s.results.C1).toBeUndefined();
  });
  it("overclaims lead to challenge, then revision, and A finishes", () => {
    let s = toPuzzle();
    for (const value of ["up", "down", "none"] as const) s = run(s, { type: "setGuess", value }, { type: "submit" }, { type: "attach" });
    expect(s.phase).toBe("meeting");
    s = run(s, { type: "choose", choice: "B" }, { type: "submitChoice" });
    expect(s.phase).toBe("challenge");
    s = run(s, { type: "revise" }, { type: "choose", choice: "A" }, { type: "submitChoice" });
    expect(s.phase).toBe("debrief");
    expect(s.evidence).toHaveLength(3);
  });
});

describe("persistence", () => {
  it("restores reveal after refresh without re-awarding", () => {
    const store = memStore();
    const s = run(initialState, { type: "start" }, { type: "openCase" }, { type: "setGuess", value: "up" }, { type: "submitTutorial" }, { type: "finishTutorial" }, { type: "setGuess", value: "up" }, { type: "submit" });
    saveState(store, "u1", s);
    const back = loadState(store, "u1");
    expect(back.phase).toBe("reveal");
    expect(totalScore(run(back, { type: "submit" }))).toBe(3);
    expect(store.getItem(sessionKey("u2"))).toBeNull();
  });
  it("ignores corrupt or wrong-version saves", () => {
    const store = memStore();
    store.setItem(sessionKey("u"), "{bad");
    expect(loadState(store, "u").phase).toBe("cover");
    store.setItem(sessionKey("u"), JSON.stringify({ v: 0, phase: "debrief" }));
    expect(loadState(store, "u").phase).toBe("cover");
  });
});

