import type { GenderText } from "@/lib/genderText";

export type GamePhase =
  | "briefing"
  | "travel"
  | "arrival"
  | "inquiry"
  | "framing"
  | "presentation"
  | "return-travel"
  | "debrief"
  | "result";

export type QuestionQuality = "strong" | "good" | "weak";

export type NoteType =
  | "claim"
  | "context"
  | "stake"
  | "request"
  | "baseline"
  | "reality"
  | "baseline_doubt"
  | "exceptional_factor"
  | "assumption"
  | "weak_opinion"
  | "synthesis";

export type NoteWeight = "strong_clue" | "useful_clue" | "weak_clue" | "misleading_clue";

export type FramingQuality = "strong" | "weak";

export type OutcomeType = "strong" | "weak";

export interface DialogueLine {
  characterId: string;
  text: GenderText;
  mood?: "neutral" | "happy" | "serious" | "concerned" | "impressed" | "disappointed" | "confident" | "uncertain";
  audioSrc?: string;
}

export interface KnowledgeState {
  claimOpened: boolean;
  claimDefined: boolean;
  contextOpened: boolean;
  stakesKnown: boolean;
  requestKnown: boolean;
  baselineKnown: boolean;
  comparisonBasedConcern: boolean;
  realityChecked: boolean;
  baselineQuestioned: boolean;
  comparisonMethodWeak: boolean;
  exceptionalYearKnown: boolean;
  exceptionalCauseKnown: boolean;
  framingReady: boolean;
}

export interface RunState {
  totalQuestionsAsked: number;
  recoveryUsed: number;
  strongQuestionsCount: number;
  goodQuestionsCount: number;
  weakQuestionsCount: number;
  trustLevel: number;
  askedQuestionIds: string[];
  seenBundleIds: string[];
  currentBundleId: string | null;
  currentStateId: string;
}

export interface NoteCandidate {
  id: string;
  text: string;
  type: NoteType;
  internalWeight: NoteWeight;
  sourceQuestionId?: string;
  sourceResponseId?: string;
}

export interface ResponseVariant {
  minTrust?: number;
  maxTrust?: number;
  text: string;
}

export interface ResponseNode {
  id: string;
  text: string;
  tone?: "neutral" | "warm" | "guarded" | "reflective";
  variantsByTrust?: ResponseVariant[];
  noteCandidateIds: string[];
}

export interface QuestionOption {
  id: string;
  bundleId: string;
  text: string;
  quality: QuestionQuality;
  function:
    | "claim_opening"
    | "context_opening"
    | "claim_definition"
    | "symptom_structure"
    | "request_extraction"
    | "stakes_extraction"
    | "baseline_identification"
    | "comparison_vs_trend"
    | "reality_check"
    | "baseline_validity"
    | "comparison_method"
    | "exceptional_factor"
    | "exceptional_cause_followup"
    | "weak_premature_hypothesis"
    | "solution_jump";
  responseId: string;
  trustEffect: number;
  recoveryCost: number;
  unlockConditions?: string[];
  knowledgeEffects?: Partial<KnowledgeState>;
}

export interface QuestionBundle {
  id: string;
  stateTarget: string;
  purpose: string;
  isRecovery: boolean;
  unlockConditions?: string[];
  optionIds: string[];
}

export interface FramingOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface FramingBuilderSection {
  id: string;
  title: string;
  options: FramingOption[];
}

export interface FramingSubmission {
  clientViewId: string | null;
  flawId: string | null;
  trueFrameId: string | null;
  nextDecisionId: string | null;
}

export interface CaseMeta {
  id: string;
  title: string;
  difficulty: string;
  theme: string;
  targetSkill: string;
  coreQuestionBudget: number;
  recoveryBudget: number;
}
