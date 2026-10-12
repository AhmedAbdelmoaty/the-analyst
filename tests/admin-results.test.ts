import { describe, expect, test } from "bun:test";
import { completionRate, roundResult } from "../src/features/admin-stats/results";

describe("simple admin results", () => {
  test("strong PF and supported RD are wins", () => {
    for (const outcome of ["strong", "supported"]) expect(roundResult({ completed_at: "2026-10-12", outcome })).toBe("win");
  });
  test("weak and both unsuccessful RD endings are losses", () => {
    for (const outcome of ["weak", "insufficient", "criterion_mismatch"]) expect(roundResult({ completed_at: "2026-10-12", outcome })).toBe("loss");
  });
  test("expired time is a loss even without a completion", () => {
    expect(roundResult({ timed_out_at: "2026-10-12", outcome: "strong" })).toBe("loss");
  });
  test("server evaluation wins over client outcome", () => {
    expect(roundResult({ completed_at: "2026-10-12", server_outcome: "weak", outcome: "strong" })).toBe("loss");
  });
  test("completion percentage uses tracked starts, not legacy results", () => {
    expect(completionRate(0, 0)).toBe("—");
    expect(completionRate(3, 4)).toBe("75%");
  });
});