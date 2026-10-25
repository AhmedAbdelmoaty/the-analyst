import { CASES, TUTORIAL, type CaseId, type Pattern } from "../data/cases";
import { BRIEFING, type ChoiceId } from "../data/dialogue";
import { patternFor, pearson } from "./correlation";
import { generateRunCases } from "./datasets";

export type Phase = "cover" | "briefing" | "tutorial" | "tutorialReady" | "puzzle" | "reveal" | "recommendation" | "recommendationFeedback" | "ending" | "debrief";
export type Ending = "perfect" | "saved" | "glitch";

export interface CaseResult {
  guess: Pattern | null;
  actual: Pattern;
  points: 0 | 3;
  timedOut?: boolean;
}

export interface GameState {
  v: 6;
  phase: Phase;
  briefingStep: number;
  tutorialStep: 0 | 1 | 2;
  tutorialAttempts: number;
  tutorialGuess: Pattern | null;
  caseIndex: number;
  results: Partial<Record<CaseId, CaseResult>>;
  evidence: CaseId[];
  hearts: number;
  practiceAfterCapture: boolean;
  recommendationAttempts: ChoiceId[];
  ending: Ending | null;
  paused: boolean;
  completed: boolean;
  runSeed: number | null;
}

export const ROUND_SECONDS = 20;
export const initialState: GameState = {
  v: 6,
  phase: "cover",
  briefingStep: 0,
  tutorialStep: 0,
  tutorialAttempts: 0,
  tutorialGuess: null,
  caseIndex: 0,
  results: {},
  evidence: [],
  hearts: 3,
  practiceAfterCapture: false,
  recommendationAttempts: [],
  ending: null,
  paused: false,
  completed: false,
  runSeed: null,
};

export type Action =
  | { type: "start"; seed?: number }
  | { type: "advanceBriefing" }
  | { type: "backBriefing" }
  | { type: "skipStory" }
  | { type: "openCase" }
  | { type: "revealTutorialPoint" }
  | { type: "showTutorialDays" }
  | { type: "setGuess"; value: Pattern }
  | { type: "submitTutorial" }
  | { type: "startChallenges" }
  | { type: "skipTutorial"; tutorialEverDone: boolean }
  | { type: "answer"; value: Pattern }
  | { type: "timeout" }
  | { type: "attach" }
  | { type: "recommendationAnswer"; choice: ChoiceId }
  | { type: "finishEnding" }
  | { type: "retryRecommendation" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "replay" }
  | { type: "__hydrate"; s: GameState };

export const BRIEFING_LENGTH = BRIEFING.length;
export const totalScore = (s: GameState) => Object.values(s.results).reduce((sum, result) => sum + (result?.points ?? 0), 0);
export const currentCase = (s: GameState) => {
  const cases = s.runSeed === null ? CASES : generateRunCases(s.runSeed);
  return cases[Math.min(s.caseIndex, cases.length - 1)]!;
};

function resolveCase(s: GameState, guess: Pattern | null, timedOut = false): GameState {
  if (s.phase !== "puzzle" || s.paused) return s;
  const c = currentCase(s);
  if (s.results[c.id]) return s;
  const coefficient = pearson(c.xs, c.ys);
  if (coefficient === null) return s;
  const actual = patternFor(coefficient);
  const points: 0 | 3 = !s.practiceAfterCapture && guess === actual && !timedOut ? 3 : 0;
  return {
    ...s,
    phase: "reveal",
    hearts: s.practiceAfterCapture || points === 3 ? s.hearts : Math.max(0, s.hearts - 1),
    practiceAfterCapture: s.practiceAfterCapture || s.hearts === 1 && points === 0,
    results: { ...s.results, [c.id]: { guess, actual, points, ...(timedOut ? { timedOut: true } : {}) } },
  };
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case "start":
      return s.phase === "cover" ? { ...s, phase: "briefing", briefingStep: 0, runSeed: a.seed ?? null } : s;
    case "advanceBriefing":
      return s.phase === "briefing" ? { ...s, briefingStep: Math.min(s.briefingStep + 1, BRIEFING_LENGTH - 1) } : s;
    case "backBriefing":
      return s.phase === "briefing" ? { ...s, briefingStep: Math.max(0, s.briefingStep - 1) } : s;
    case "skipStory":
      return s.phase === "briefing" ? { ...s, phase: "tutorial", tutorialStep: 0, tutorialAttempts: 0 } : s;
    case "openCase":
      return s.phase === "briefing" ? { ...s, phase: "tutorial", tutorialStep: 0, tutorialAttempts: 0, tutorialGuess: null } : s;
    case "revealTutorialPoint":
      return s.phase === "tutorial" && s.tutorialStep === 0 ? { ...s, tutorialStep: 1 } : s;
    case "showTutorialDays":
      return s.phase === "tutorial" && s.tutorialStep === 1 ? { ...s, tutorialStep: 2 } : s;
    case "setGuess":
      return s.phase === "tutorial" && s.tutorialStep === 2 ? { ...s, tutorialGuess: a.value } : s;
    case "submitTutorial": {
      if (s.phase !== "tutorial" || s.tutorialStep !== 2 || !s.tutorialGuess) return s;
      const coefficient = pearson(TUTORIAL.xs, TUTORIAL.ys);
      if (coefficient === null) return s;
      const attempts = s.tutorialAttempts + 1;
      if (s.tutorialGuess === patternFor(coefficient) || attempts >= 2) {
        return { ...s, phase: "tutorialReady", caseIndex: 0, tutorialAttempts: attempts, hearts: 3 };
      }
      return { ...s, tutorialAttempts: attempts, tutorialGuess: null };
    }
    case "startChallenges":
      return s.phase === "tutorialReady" ? { ...s, phase: "puzzle", caseIndex: 0, hearts: 3 } : s;
    case "skipTutorial":
      return a.tutorialEverDone && (s.phase === "briefing" || s.phase === "tutorial")
        ? { ...s, phase: "puzzle", caseIndex: 0, hearts: 3 }
        : s;
    case "answer":
      return resolveCase(s, a.value);
    case "timeout":
      return resolveCase(s, null, true);
    case "attach": {
      if (s.phase !== "reveal") return s;
      const c = currentCase(s);
      const evidence = s.evidence.includes(c.id) ? s.evidence : [...s.evidence, c.id];
      const next = s.caseIndex + 1;
      if (next >= CASES.length) return { ...s, evidence, phase: "recommendation", recommendationAttempts: [] };
      return { ...s, evidence, caseIndex: next, phase: "puzzle", paused: false };
    }
    case "recommendationAnswer": {
      if (s.phase !== "recommendation" || s.recommendationAttempts.length !== 0 || s.evidence.length !== CASES.length) return s;
      const attempts = [...s.recommendationAttempts, a.choice];
      const ending: Ending = a.choice !== "B" || s.hearts === 0 ? "glitch" : totalScore(s) === 12 ? "perfect" : "saved";
      return { ...s, phase: "ending", recommendationAttempts: attempts, ending, completed: false, paused: false };
    }
    case "finishEnding":
      return s.phase === "ending" ? { ...s, phase: "debrief", completed: true, paused: false } : s;
    case "retryRecommendation":
      return s.phase === "recommendationFeedback" && s.recommendationAttempts.length === 1 ? { ...s, phase: "recommendation" } : s;
    case "pause":
      return s.phase === "cover" || s.phase === "debrief" ? s : { ...s, paused: true };
    case "resume":
      return { ...s, paused: false };
    case "replay":
      return { ...initialState, runSeed: s.runSeed };
    case "__hydrate":
      return a.s;
    default:
      return s;
  }
}

export { TUTORIAL };
