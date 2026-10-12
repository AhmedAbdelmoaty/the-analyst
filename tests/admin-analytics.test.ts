import { describe, expect, test } from "bun:test";
import { nextVisitState, VISIT_IDLE_MS, enqueue, type RoundEvent } from "../src/lib/analytics/core";
import { safeText, toCsv } from "../src/lib/analytics/export";
import { presetRange } from "../src/features/admin-stats/dates";
import { evaluateReport, type FinalReport } from "../src/features/reward-decision/engine/model";

let i = 0;
const gen = () => `id-${++i}`;
const sec = () => "secret-0123456789";

describe("visits", () => {
  test("navigation/refresh within 30 minutes keeps the same visit", () => {
    const a = nextVisitState(null, "u1", 0, gen, sec).state;
    const b = nextVisitState(a, "u1", 29 * 60 * 1000, gen, sec);
    expect(b.newVisit).toBe(false);
    expect(b.state.visitId).toBe(a.visitId);
    expect(b.state.segmentId).toBe(a.segmentId);
  });
  test("returning after more than 30 idle minutes starts a new visit", () => {
    const a = nextVisitState(null, "u1", 0, gen, sec).state;
    const b = nextVisitState(a, "u1", VISIT_IDLE_MS + 1, gen, sec);
    expect(b.newVisit).toBe(true);
    expect(b.state.visitId).not.toBe(a.visitId);
  });
  test("signing in opens a new segment in the same visit; anonymous part stays separate", () => {
    const anon = nextVisitState(null, "anon", 0, gen, sec).state;
    expect(anon.secret).not.toBeNull();
    const signed = nextVisitState(anon, "u1", 1000, gen, sec);
    expect(signed.newVisit).toBe(false);
    expect(signed.state.visitId).toBe(anon.visitId);
    expect(signed.state.segmentId).not.toBe(anon.segmentId);
    expect(signed.state.secret).toBeNull();
  });
  test("switching accounts never reuses the previous account's segment", () => {
    const a = nextVisitState(null, "u1", 0, gen, sec).state;
    const b = nextVisitState(a, "u2", 1000, gen, sec).state;
    expect(b.owner).toBe("u2");
    expect(b.segmentId).not.toBe(a.segmentId);
  });
});

describe("round event queue", () => {
  const ev = (type: RoundEvent["type"], n: number): RoundEvent => ({ event_id: `e${n}`, game: "reward-decision", round_id: "r", type, revision: n });
  test("final events are never dropped when the queue is full", () => {
    let q: RoundEvent[] = [ev("start", 0)];
    for (let n = 1; n < 400; n++) q = enqueue(q, ev("stage", n));
    q = enqueue(q, ev("submit", 500));
    q = enqueue(q, ev("complete", 501));
    expect(q.length).toBeLessThanOrEqual(300);
    expect(q.map(e => e.type)).toContain("start");
    expect(q.map(e => e.type)).toContain("submit");
    expect(q.map(e => e.type)).toContain("complete");
  });
});

describe("exports", () => {
  test("user-typed formulas are neutralised", () => {
    expect(safeText("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(safeText("@cmd")).toBe("'@cmd");
    expect(safeText("أحمد")).toBe("أحمد");
  });
  test("CSV has a UTF-8 BOM, keeps Arabic and keeps the phone as text with its +", () => {
    const csv = toCsv({ name: "u", columns: [{ key: "n", header: "الاسم" }, { key: "p", header: "الهاتف", text: true }], rows: [{ n: "=1+1", p: "+201001234567" }] });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("الاسم");
    expect(csv).toContain('"=""+201001234567"""');
    expect(csv).toContain("'=1+1");
  });
});

describe("filters", () => {
  test("ranges use Cairo calendar days", () => {
    // 22:30 UTC on Oct 12 is already Oct 13 in Cairo (UTC+3)
    const now = new Date("2026-10-12T22:30:00Z");
    expect(presetRange("today", now)).toEqual({ from: "2026-10-13", to: "2026-10-13" });
    expect(presetRange("7", now)).toEqual({ from: "2026-10-07", to: "2026-10-13" });
    expect(presetRange("30", now).from).toBe("2026-09-14");
  });
});

describe("server evaluation mirrors the game", () => {
  // Expected values were read back from the database's rd_evaluate for the same inputs.
  const cases: [FinalReport["teamId"], FinalReport["documentId"], [string, string], string[], string[], string, string][] = [
    ["mahmoud", "policy", ["median-mahmoud", "sd-mahmoud"], ["median", "sd"], ["policy"], "supported", "complete"],
    ["marwan", "policy", ["median-mahmoud", "sd-mahmoud"], ["median", "sd"], [], "criterion_mismatch", "wrong_team"],
    ["mahmoud", "sales-summary", ["median-mahmoud", "sd-mahmoud"], ["median", "sd"], [], "insufficient", "wrong_document"],
    ["mahmoud", "policy", ["range-mahmoud", "sd-mahmoud"], ["range", "sd"], [], "insufficient", "missing_performance"],
    ["mahmoud", "policy", ["median-mahmoud", "records-coverage"], ["median"], ["individual-records"], "insufficient", "missing_spread"],
    ["mahmoud", "policy", ["median-mahmoud", "sd-mahmoud"], ["median"], [], "insufficient", "weak_arguments"],
    ["mahmoud", "policy", ["mean-marwan", "sd-mahmoud"], ["mean", "sd"], [], "insufficient", "weak_arguments"],
  ];
  for (const [team, doc, args, tools, docs, outcome, reason] of cases) {
    test(`${team}/${doc}/${args.join("+")} → ${reason}`, () => {
      const e = evaluateReport({ teamId: team, documentId: doc, arguments: args as never, submittedAt: "" }, tools as never, docs as never);
      expect(e.outcome).toBe(outcome as never);
      expect(e.reason).toBe(reason as never);
    });
  }
});
