import { test, expect, beforeEach } from "bun:test";
const store = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
(globalThis as any).window = { addEventListener() {}, removeEventListener() {} };
const tc = await import("../src/lib/pf-time-challenge");
const pp = await import("../src/lib/pf-game-persistence");
const U = "u1";
beforeEach(() => store.clear());

test("paused absence is not deducted and resume continues from frozen value", () => {
  const c = tc.startTimeChallenge(U);
  tc.pauseTimeChallenge(U, c.runningSince! + 148_000); // 7:00 -> 4:32
  expect(tc.remainingMs(tc.readTimeChallenge(U)!, Date.now() + 600_000)).toBe(272_000);
  const t = Date.now() + 600_000;
  tc.resumeTimeChallenge(U, t);
  expect(tc.remainingMs(tc.readTimeChallenge(U)!, t + 2000)).toBe(270_000);
});
test("reload freezes a running clock at last heartbeat, never grants new time", () => {
  const c = tc.startTimeChallenge(U);
  tc.heartbeatTimeChallenge(U, c.runningSince! + 60_000);
  tc.freezeAfterReload(U);
  const r = tc.readTimeChallenge(U)!;
  expect(r.runningSince).toBeNull();
  expect(r.remainingMs).toBe(360_000);
});
test("submit vs expiry decided by active time at acceptance", () => {
  const c = tc.startTimeChallenge(U);
  expect(tc.submitTimeChallenge(U, c.runningSince! + 419_999)).toBe(true);
  expect(tc.checkTimeChallengeExpiry(U, c.runningSince! + 999_999)).toBe(false);
  const d = tc.startTimeChallenge(U);
  expect(tc.submitTimeChallenge(U, d.runningSince! + 420_000)).toBe(false);
  expect(tc.readTimeChallenge(U)!.status).toBe("expired");
});
test("legacy v1 active round migrates paused without being expired", () => {
  store.set(`pf-time-challenge-v1:${U}`, JSON.stringify({ version: 1, roundId: "r", deadline: Date.now() - 5000, status: "active" }));
  const r = tc.readTimeChallenge(U)!;
  expect(r.status).toBe("active");
  expect(r.remainingMs).toBeGreaterThan(0);
});
const gs: any = { currentNodeId: "n", questionsUsed: 3, isComplete: true, history: [], askedTopicIds: [], collectedEvidence: [], collectedReports: [], savedNoteIds: [], notes: [], framing: {}, framingSubmitted: true, restartCount: 0, framingCorrectCount: 2, gameStartedAt: 1, outcome: "strong" };
test("confirmed report / finished inquiry resume at the next step; round mismatch is rejected", () => {
  const c = tc.startTimeChallenge(U);
  pp.writePFGameSnapshot(U, "framing", gs, c.roundId);
  expect(pp.readPFGameSnapshot(U)!.screen).toBe("email-send");
  pp.writePFGameSnapshot(U, "inquiry", { ...gs, framingSubmitted: false }, c.roundId);
  expect(pp.readPFGameSnapshot(U)!.screen).toBe("reflection");
  pp.writePFGameSnapshot(U, "inquiry", gs, "other-round");
  expect(pp.readPFGameSnapshot(U)).toBeNull();
});
test("non-owner tab cannot write; scene progress is scoped per round+screen", () => {
  pp.setSceneScope(U, "r1|framing");
  pp.writeSceneProgress("framing", { stage: "sections", idx: 1 });
  expect(pp.readSceneProgress<any>("framing").idx).toBe(1);
  pp.setSceneScope(U, "r1|email-send");
  expect(pp.readSceneProgress("framing")).toBeUndefined();
  pp.setSaveWritable(false);
  pp.writePFGameSnapshot(U, "travel", gs, "x");
  expect(store.get(`pf-game-save-v2:${U}`)).toBeUndefined();
  pp.setSaveWritable(true);
});
