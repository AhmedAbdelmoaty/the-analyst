import assert from "node:assert/strict";
import test from "node:test";
import { getGameProgress, getCatalogAction } from "../src/features/discovery/progress.ts";
import { sessionKey as behindDotsKey } from "../src/features/behind-the-dots/engine/persistence.ts";
import { storageKey as rewardKey } from "../src/features/reward-decision/engine/persistence.ts";
import { newRun } from "../src/features/reward-decision/engine/model.ts";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
const userId = "player-a";
const gameIds = ["problem-framing", "reward-decision", "behind-the-dots", "crack-the-code", "decision-matrix"] as const;
const put = (key: string, value: unknown) => storage.setItem(key, JSON.stringify(value));
const pfKey = `pf-game-save-v2:${userId}`;
const crackKey = `analyst-crack-the-code-v2:${userId}`;
const matrixKey = `theanalyst.decision-matrix.v1.${encodeURIComponent(userId)}`;
const clear = () => storage.values.clear();

test("all five games default to new, and progress remains account-scoped", () => {
  clear();
  assert.deepEqual(gameIds.map((id) => getGameProgress(id, userId).status), Array(5).fill("new"));
  put(rewardKey(userId), { ...newRun(userId), phase: "hub" });
  assert.equal(getGameProgress("reward-decision", "another-player").status, "new");
  put(`analyst-crack-the-code-v2:${userId}`, { progress: { 0: { score: 700 } } });
  assert.equal(getGameProgress("crack-the-code", "another-player").status, "new");
  put(`theanalyst.decision-matrix.v1.${encodeURIComponent(userId)}`, { version: 1, started: true, current: { index: 0, picks: Array(5).fill(-1) }, completed: [] });
  assert.equal(getGameProgress("decision-matrix", "another-player").status, "new");
  assert.equal(getCatalogAction("new"), "ابدأ اللعب");
  assert.equal(getCatalogAction("in-progress"), "كمّل اللعب");
  assert.equal(getCatalogAction("completed"), "عرض النتيجة");
});

test("Problem Framing distinguishes a resumable save from a completed result", () => {
  clear();
  put(pfKey, { version: 2, screen: "inquiry", gameState: { currentNodeId: "start", questionsUsed: 1, isComplete: false, history: [], askedTopicIds: [], collectedEvidence: [], collectedReports: [], savedNoteIds: [], notes: [], framing: {}, framingSubmitted: false, restartCount: 0, framingCorrectCount: 0, gameStartedAt: Date.now() }, updatedAt: Date.now() });
  assert.equal(getGameProgress("problem-framing", userId).status, "in-progress");
  assert.equal(getGameProgress("problem-framing", "another-player").status, "new");
  const state = JSON.parse(storage.getItem(pfKey)!);
  state.screen = "result";
  state.gameState.isComplete = true;
  state.gameState.framingSubmitted = true;
  state.gameState.outcome = "supported";
  put(pfKey, state);
  assert.equal(getGameProgress("problem-framing", userId).status, "completed");
});

test("Reward Decision completed runs do not appear unfinished", () => {
  clear();
  const run = { ...newRun(userId), phase: "hub" };
  put(rewardKey(userId), run);
  assert.equal(getGameProgress("reward-decision", userId).status, "in-progress");
  put(rewardKey(userId), { ...run, phase: "debrief" });
  assert.equal(getGameProgress("reward-decision", userId).status, "completed");
});

test("Behind the Dots V6, Crack the Code levels, and Decision Matrix chapters report real progress", () => {
  clear();
  put(behindDotsKey(userId), { v: 6, phase: "puzzle", caseIndex: 2, results: { C1: { points: 3 } }, evidence: ["C1"], hearts: 3, completed: false, remainingSeconds: 12 });
  assert.deepEqual(getGameProgress("behind-the-dots", userId), { status: "in-progress", hint: "التحدي ٣ من ٤ · اكتمل تحدٍ واحد" });
  put(behindDotsKey(userId), { v: 6, phase: "debrief", completed: true, caseIndex: 3, results: { C1: {}, C2: {}, C3: {}, C4: {} }, evidence: ["C1", "C2", "C3", "C4"], hearts: 0 });
  assert.equal(getGameProgress("behind-the-dots", userId).status, "completed");
  assert.equal(getGameProgress("behind-the-dots", "another-player").status, "new");

  put(crackKey, { progress: { 0: { score: 700 }, 1: { score: 800 } }, session: { level: 2, puzzle: { length: 3, correctCode: [1, 2, 3] }, won: false } });
  assert.deepEqual(getGameProgress("crack-the-code", userId), { status: "in-progress", hint: "الخزنة ٣ من ٣ · اكتملت خزنتان" });
  put(crackKey, { progress: { 0: { score: 700 }, 1: { score: 800 }, 2: { score: 900 } } });
  assert.equal(getGameProgress("crack-the-code", userId).status, "completed");
  clear();
  put(`analyst-crack-the-code-v1:${userId}`, { progress: { 0: { score: 600 } } });
  assert.deepEqual(getGameProgress("crack-the-code", userId), { status: "in-progress", hint: "اكتملت خزنة واحدة" });

  put(matrixKey, { version: 1, started: true, current: { index: 1, picks: Array(5).fill(-1), mode: "investigate" }, completed: [0] });
  assert.deepEqual(getGameProgress("decision-matrix", userId), { status: "in-progress", hint: "اكتملت قضية واحدة من ٢" });
  put(matrixKey, { version: 1, started: true, current: { index: 2, picks: Array(6).fill(-1), mode: "finished" }, completed: [0, 1] });
  assert.equal(getGameProgress("decision-matrix", userId).status, "completed");
});

test("corrupt and outdated saves are treated as new without being rewritten", () => {
  clear();
  storage.setItem(pfKey, "{");
  storage.setItem(rewardKey(userId), JSON.stringify({ gameId: "wrong", userId }));
  storage.setItem(behindDotsKey(userId), JSON.stringify({ v: 6, phase: "puzzle", caseIndex: 2 }));
  assert.equal(getGameProgress("behind-the-dots", userId).status, "new");
  storage.setItem(behindDotsKey(userId), JSON.stringify({ v: 5, phase: "puzzle" }));
  storage.setItem(crackKey, "not-json");
  storage.setItem(matrixKey, JSON.stringify({ version: 3, started: true }));
  const before = new Map(storage.values);
  for (const id of gameIds) assert.equal(getGameProgress(id, userId).status, "new");
  assert.deepEqual(storage.values, before);
});
