import { describe, expect, test } from "bun:test";
import { advanceRun, loadRun, newRun, saveRun, storageKey } from "../src/features/training-evaluation/persistence";

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
describe("Training Evaluation saved progress", () => {
  test("reload restores the exact question, evidence, recommendation and second", () => {
    const db = storage(); const run = newRun("player-a");
    run.state = { ...run.state, phase: "office", officeEntered: true, view: "ask", path: "ask", asked: ["respondents"], claim: "notRep", evidence: "respondents", sayes: "ten" };
    run.elapsed = 47; run.timers.analysis = 47850; run.ui.confirming = true;
    expect(saveRun(run, db)).toBe(true);
    expect(loadRun("player-a", db)).toEqual(run);
    expect(loadRun("player-a", db)?.timers.analysis).toBe(47850);
  });
  test("each account has its own save and cannot restore another owner's payload", () => {
    const db = storage(); saveRun(newRun("a"), db);
    expect(loadRun("b", db)).toBeNull();
    db.setItem(storageKey("b"), JSON.stringify(newRun("a")));
    expect(loadRun("b", db)).toBeNull();
  });
  test("road reply, paid popup, ending call and partial scene timing survive reload", () => {
    const db = storage(); const run = newRun("a");
    run.state.phase = "road"; run.state.sayes = "fifty";
    run.ui = { roadStep: "reply", roadLine: 0, popStage: "paid", verdictLine: 2, verdictBooth: false };
    run.timers = { drive: 3600, park: 700, boothRedirect: 1800 };
    saveRun(run, db); expect(loadRun("a", db)).toEqual(run);
  });
  test("analysis navigation preserves elapsed time and the collected parking hint", () => {
    const run = newRun("a"); run.state = { ...run.state, phase: "office", officeEntered: true };
    run.timers.analysis = 47850; run.ui = { "global:sayesShown": true, report: { id: "attendance" } };
    const next = advanceRun(run, { type: "think", to: "ask" });
    expect(next.timers.analysis).toBe(47850);
    expect(next.ui["global:sayesShown"]).toBe(true);
    expect(next.ui.report).toBeUndefined();
  });
  test("a completed recommendation and its outcome remain saved until the finale exits", () => {
    const db = storage(); const run = newRun("a");
    run.state = { ...run.state, phase: "office", officeEntered: true, view: "email", claim: "notRep", evidence: "respondents" };
    const next = advanceRun(run, { type: "send" }); saveRun(next, db);
    expect(loadRun("a", db)?.state.phase).toBe("verdict");
    expect(loadRun("a", db)?.state.outcome).toBe("win");
  });
  test("explicit restart clears old screen checkpoints, choices and elapsed time", () => {
    const run = newRun("a"); run.state.phase = "verdict"; run.timers.analysis = 90000; run.ui.verdictLine = 2;
    expect(advanceRun(run, { type: "restart" })).toEqual(newRun("a"));
  });
  test("malformed saves and unsupported versions fail safely", () => {
    const db = storage(); db.setItem(storageKey("a"), "{broken"); expect(loadRun("a", db)).toBeNull();
    db.setItem(storageKey("a"), JSON.stringify({ ...newRun("a"), version: 2 })); expect(loadRun("a", db)).toBeNull();
    db.setItem(storageKey("a"), JSON.stringify({ ...newRun("a"), state: { phase: "unknown" } })); expect(loadRun("a", db)).toBeNull();
  });
  test("unavailable browser storage does not crash gameplay", () => {
    expect(saveRun(newRun("a"), { setItem: () => { throw new Error("quota"); } })).toBe(false);
    expect(loadRun("a", { getItem: () => { throw new Error("disabled"); } })).toBeNull();
  });
});