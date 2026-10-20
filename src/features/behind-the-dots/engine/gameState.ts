import { CASES, TUTORIAL, type CaseId, type Pattern } from "../data/cases";
import { BRIEFING, CHOICES, type ChoiceId } from "../data/dialogue";
import { patternFor, pearson } from "./correlation";
import { generateRunCases } from "./datasets";

export type Phase =
  | "cover"
  | "briefing"
  | "tutorial"
  | "tutorialReveal"
  | "puzzle"
  | "reveal"
  | "meeting"
  | "challenge"
  | "debrief";

export interface CaseResult {
  guess: Pattern | null;
  actual: Pattern;
  points: number;
  timedOut?: boolean;
}

export interface GameState {
  v: 3;
  phase: Phase;
  briefingStep: number;
  caseIndex: number;
  guess: Pattern | null;
  tutorialGuess: Pattern | null;
  hintsUsed: number;
  results: Partial<Record<CaseId, CaseResult>>;
  evidence: CaseId[];
  choice: ChoiceId | null;
  paused: boolean;
  completed: boolean;
  runSeed: number | null;
}

export const initialState: GameState = {
  v: 3,
  phase: "cover",
  briefingStep: 0,
  caseIndex: 0,
  guess: null,
  tutorialGuess: null,
  hintsUsed: 0,
  results: {},
  evidence: [],
  choice: null,
  paused: false,
  completed: false,
  runSeed: null,
};

export type Action =
  | { type: "start"; seed?: number }
  | { type: "advanceBriefing" }
  | { type: "backBriefing" }
  | { type: "openCase" }
  | { type: "setGuess"; value: Pattern }
  | { type: "submitTutorial" }
  | { type: "retryTutorial" }
  | { type: "finishTutorial" }
  | { type: "skipTutorial"; tutorialEverDone: boolean }
  | { type: "hint" }
  | { type: "submit" }
  | { type: "timeout" }
  | { type: "attach" }
  | { type: "choose"; choice: ChoiceId }
  | { type: "submitChoice" }
  | { type: "revise" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "replay" }
  | { type: "__hydrate"; s: GameState };

export const BRIEFING_LENGTH = BRIEFING.length;
/** Seconds before the Glitch monster catches Dotty. */
export const ROUND_SECONDS = 30;
/** Points lost when time runs out (never below 0). */
export const TIMEOUT_PENALTY = 1;

export function totalScore(s: GameState): number {
  return Object.values(s.results).reduce((a, r) => a + (r?.points ?? 0), 0);
}

export function currentCase(s: GameState) {
  const cases = s.runSeed === null ? CASES : generateRunCases(s.runSeed);
  return cases[Math.min(s.caseIndex, cases.length - 1)]!;
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case "start":
      return s.phase === "cover" ? { ...s, phase: "briefing", briefingStep: 0, runSeed: a.seed ?? null } : s;
    case "advanceBriefing":
      if (s.phase !== "briefing") return s;
      return { ...s, briefingStep: Math.min(s.briefingStep + 1, BRIEFING_LENGTH - 1) };
    case "backBriefing":
      if (s.phase !== "briefing") return s;
      return { ...s, briefingStep: Math.max(0, s.briefingStep - 1) };
    case "openCase":
      if (s.phase !== "briefing") return s;
      return { ...s, phase: "tutorial", guess: null, tutorialGuess: null };
    case "setGuess":
      if (s.phase !== "puzzle" && s.phase !== "tutorial") return s;
      return { ...s, guess: a.value };
    case "submitTutorial":
      if (s.phase !== "tutorial" || s.guess === null) return s;
      return { ...s, phase: "tutorialReveal", tutorialGuess: s.guess };
    case "retryTutorial":
      if (s.phase !== "tutorialReveal") return s;
      return { ...s, phase: "tutorial", guess: null, tutorialGuess: null };
    case "finishTutorial":
      if (s.phase !== "tutorialReveal") return s;
      return { ...s, phase: "puzzle", caseIndex: 0, guess: null, hintsUsed: 0 };
    case "skipTutorial":
      if (!a.tutorialEverDone || (s.phase !== "tutorial" && s.phase !== "briefing")) return s;
      return { ...s, phase: "puzzle", caseIndex: 0, guess: null, hintsUsed: 0 };
    case "hint":
      if (s.phase !== "puzzle") return s;
      return { ...s, hintsUsed: Math.min(s.hintsUsed + 1, 2) };
    case "submit": {
      if (s.phase !== "puzzle" || s.guess === null) return s;
      const c = currentCase(s);
      if (s.results[c.id]) return { ...s, phase: "reveal" };
      const r = pearson(c.xs, c.ys);
      if (r === null) return s;
      const actual = patternFor(r);
      const points = s.guess === actual ? 3 : 0;
      return { ...s, phase: "reveal", results: { ...s.results, [c.id]: { guess: s.guess, actual, points } } };
    }
    case "timeout": {
      if (s.phase !== "puzzle" || s.paused) return s;
      const c = currentCase(s);
      if (s.results[c.id]) return { ...s, phase: "reveal" };
      const r = pearson(c.xs, c.ys);
      if (r === null) return s;
      const actual = patternFor(r);
      const points = s.guess === actual ? 3 - TIMEOUT_PENALTY : 0;
      return { ...s, phase: "reveal", results: { ...s.results, [c.id]: { guess: s.guess, actual, points, timedOut: true } } };
    }
    case "attach": {
      if (s.phase !== "reveal") return s;
      const c = currentCase(s);
      const evidence = s.evidence.includes(c.id) ? s.evidence : [...s.evidence, c.id];
      const next = s.caseIndex + 1;
      if (next >= CASES.length) return { ...s, evidence, phase: "meeting", choice: null };
      return { ...s, evidence, caseIndex: next, phase: "puzzle", guess: null, hintsUsed: 0 };
    }
    case "choose":
      if (s.phase !== "meeting") return s;
      return { ...s, choice: a.choice };
    case "submitChoice": {
      if (s.phase !== "meeting" || !s.choice) return s;
      if (s.evidence.length < CASES.length) return s;
      const ch = CHOICES.find((c) => c.id === s.choice);
      if (ch?.supported) return { ...s, phase: "debrief", completed: true };
      return { ...s, phase: "challenge" };
    }
    case "revise":
      if (s.phase !== "challenge") return s;
      return { ...s, phase: "meeting", choice: null };
    case "pause":
      return s.phase === "cover" || s.phase === "debrief" ? s : { ...s, paused: true };
    case "resume":
      return { ...s, paused: false };
    case "__hydrate":
      return a.s;
    case "replay":
      return { ...initialState, runSeed: s.runSeed };
    default:
      return s;
  }
}

export { TUTORIAL };
