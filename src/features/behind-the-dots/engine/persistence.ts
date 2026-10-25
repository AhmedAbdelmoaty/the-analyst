import { ALL_CASE_IDS } from "../data/cases";
import { initialState, type GameState, type Phase } from "./gameState";

const PREFIX = "the-analyst:behind-dots:v6";
const V5_PREFIX = "the-analyst:behind-dots:v5";
const LEGACY_PREFIX = "the-analyst:behind-dots:v3";
const PHASES: Phase[] = ["cover", "briefing", "tutorial", "tutorialReady", "puzzle", "reveal", "recommendation", "recommendationFeedback", "debrief"];

export const sessionKey = (userId: string) => `${PREFIX}:${userId}`;
export const metaKey = (userId: string) => `${PREFIX}:meta:${userId}`;
export const legacySessionKey = (userId: string) => `${LEGACY_PREFIX}:${userId}`;
export const hasLegacyProgress = (storage: Pick<Storage, "getItem">, userId: string) => {
  try { return storage.getItem(legacySessionKey(userId)) !== null; } catch { return false; }
};

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
    const saved = JSON.parse(raw) as Partial<GameState>;
    if (saved.v !== 6 || !saved.phase || !PHASES.includes(saved.phase)) return { ...initialState };
    const evidence = Array.from(new Set((saved.evidence ?? []).filter((id) => ALL_CASE_IDS.includes(id))));
    const results = Object.fromEntries(Object.entries(saved.results ?? {}).filter(([id]) => ALL_CASE_IDS.includes(id as never)));
    const savedChoices = (saved.recommendationAttempts ?? []).filter((id) => id === "A" || id === "B" || id === "C");
    const legacyRejectedRecommendation = saved.phase === "recommendationFeedback" || (saved.phase === "recommendation" && savedChoices.length > 0);
    const recommendationAttempts = savedChoices.length === 0 ? [] : [
      saved.phase === "debrief" ? savedChoices[savedChoices.length - 1]! : savedChoices[0]!,
    ];
    const phase: Phase = legacyRejectedRecommendation ? "debrief" : saved.phase;
    const migratedEnding = legacyRejectedRecommendation ? "glitch" : saved.ending;
    return {
      ...initialState,
      ...saved,
      phase,
      ending: migratedEnding,
      completed: legacyRejectedRecommendation ? true : Boolean(saved.completed),
      evidence,
      results,
      hearts: Math.max(0, Math.min(3, Number.isInteger(saved.hearts) ? saved.hearts! : 3)),
      tutorialStep: saved.tutorialStep === 1 || saved.tutorialStep === 2 ? saved.tutorialStep : 0,
      tutorialAttempts: Math.max(0, Math.min(2, saved.tutorialAttempts ?? 0)),
      recommendationAttempts,
      paused: false,
      runSeed: typeof saved.runSeed === "number" && Number.isFinite(saved.runSeed) ? saved.runSeed >>> 0 : null,
    };
  } catch {
    return { ...initialState };
  }
}

export function saveState(storage: StorageLike, userId: string, state: GameState) {
  try { storage.setItem(sessionKey(userId), JSON.stringify(state)); } catch { /* storage full / disabled */ }
}

export function loadMeta(storage: StorageLike, userId: string): Meta {
  try {
    const raw = storage.getItem(metaKey(userId)) ?? storage.getItem(`${V5_PREFIX}:meta:${userId}`);
    return raw ? { ...defaultMeta, ...JSON.parse(raw) } : { ...defaultMeta };
  } catch { return { ...defaultMeta }; }
}

export function saveMeta(storage: StorageLike, userId: string, meta: Meta) {
  try { storage.setItem(metaKey(userId), JSON.stringify(meta)); } catch { /* ignore */ }
}
