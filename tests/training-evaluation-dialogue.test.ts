import { describe, expect, test } from "bun:test";
import { initialState, reduce, type State } from "../src/features/training-evaluation/engine";
import { DialogueGuard } from "../src/features/training-evaluation/dialogueGuard";

describe("mandatory training narrative", () => {
  test("100 queued last-brief clicks never bypass the road or parking choice", () => {
    let s: State = { ...initialState(), phase: "brief", line: 1 };
    for (let i = 0; i < 100; i++) s = reduce(s, { type: "next", phase: "brief", line: 1 });
    expect(s.phase).toBe("road"); expect(s.sayes).toBeNull();
    for (let i = 0; i < 100; i++) s = reduce(s, { type: "next", phase: "road", line: 0 });
    expect(s.phase).toBe("road");
  });
  for (const pay of ["ten", "fifty", "later"] as const) test(`parking commits ${pay} once before Tarek`, () => {
    let s: State = { ...initialState(), phase: "road" };
    s = reduce(s, { type: "paySayes", pay });
    s = reduce(s, { type: "paySayes", pay: pay === "ten" ? "fifty" : "ten" });
    for (let i = 0; i < 100; i++) s = reduce(s, { type: "next", phase: "road", line: 0 });
    expect(s.phase).toBe("meeting"); expect(s.line).toBe(0); expect(s.sayes).toBe(pay);
  });
  test("previous replays only the current conversation and never crosses its start", () => {
    const s: State = { ...initialState(), phase: "meeting", line: 2, sayes: "later" };
    const prev = reduce(s, { type: "previous", phase: "meeting", line: 2 });
    expect(prev.line).toBe(1); expect(prev.sayes).toBe("later");
    expect(reduce(prev, { type: "previous", phase: "meeting", line: 2 })).toBe(prev);
    const first = { ...prev, line: 0 };
    expect(reduce(first, { type: "previous", phase: "meeting", line: 0 })).toBe(first);
  });
  test("the thinking shortcut cannot bypass required opening scenes", () => {
    for (const phase of ["intro", "brief", "road", "meeting", "verdict"] as const) {
      const s = { ...initialState(), phase };
      expect(reduce(s, { type: "backToThink" })).toBe(s);
    }
  });
  test("100 simultaneous clicks accept one transition and one effect", () => {
    const guard = new DialogueGuard(); let accepted = 0;
    for (let i = 0; i < 100; i++) if (guard.accept("line-1", 1000 + i)) accepted++;
    expect(accepted).toBe(1);
    expect(guard.accept("line-2", 1200)).toBe(false);
    expect(guard.accept("line-2", 1450)).toBe(true);
    expect(guard.accept("line-1:replay", 1900)).toBe(true);
  });
});