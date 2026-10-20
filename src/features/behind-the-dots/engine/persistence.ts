import { ALL_CASE_IDS } from "../data/cases";
import { initialState, type GameState, type Phase } from "./gameState";

// Keep the previous story's save untouched; its guesses use a different format.
const PREFIX = "the-analyst:behind-dots:v3";
const PHASES: Phase[] = ["cover", "briefing", "tutorial", "tutorialReveal", "puzzle", "reveal", "meeting", "challenge", "debrief"];

export const sessionKey = (userId: string) => `${PREFIX}:${userId}`;
export const metaKey = (userId: string) => `${PREFIX}:meta:${userId}`;

export interface Meta {
  tutorialDone: boolean;
  bestScore: number;
  muted: boolean;
}
const defaultMeta: Meta = { tutorialDone: false, bestScore: 0, muted: false };

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function loadState(storage: StorageLike, userId: string): GameState {
  try {
    const raw = storage.getItem(sessionKey(userId));
    if (!raw) return { ...initialState };
    const p = JSON.parse(raw) as Partial<GameState>;
    if (p.v !== 3 || !p.phase || !PHASES.includes(p.phase)) return { ...initialState };
    const evidence = Array.from(new Set((p.evidence ?? []).filter((id) => ALL_CASE_IDS.includes(id))));
    // Tutorial state is transient: resume at a clean tutorial.
    const phase: Phase = p.phase === "tutorialReveal" ? "tutorial" : p.phase;
    return {
      ...initialState,
      ...p,
      phase,
      evidence,
      paused: false,
      guess: p.guess === "up" || p.guess === "down" || p.guess === "none" ? p.guess : null,
      runSeed: typeof p.runSeed === "number" && Number.isFinite(p.runSeed) ? p.runSeed >>> 0 : null,
    };
  } catch {
    return { ...initialState };
  }
}

export function saveState(storage: StorageLike, userId: string, s: GameState) {
  try {
    storage.setItem(sessionKey(userId), JSON.stringify(s));
  } catch {
    /* storage full / disabled */
  }
}

export function loadMeta(storage: StorageLike, userId: string): Meta {
  try {
    const raw = storage.getItem(metaKey(userId));
    return raw ? { ...defaultMeta, ...JSON.parse(raw) } : { ...defaultMeta };
  } catch {
    return { ...defaultMeta };
  }
}

export function saveMeta(storage: StorageLike, userId: string, m: Meta) {
  try {
    storage.setItem(metaKey(userId), JSON.stringify(m));
  } catch {
    /* ignore */
  }
}
