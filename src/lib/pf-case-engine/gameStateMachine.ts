// ============================================================
// Game State Machine — Spine + dynamic topic-pool tracks
// ============================================================

import {
  SPINE,
  TRACKS,
  TOTAL_QUESTION_BUDGET,
  type SpineNodeId,
  type NodeId,
  type TrackId,
  type CaseOutcome,
  type CaseQuestionOption,
  type TrackTopic,
} from "@/lib/pf-case/case-tree";
import { countCorrectFraming, type FramingSelection } from "@/lib/pf-case/framing-board";
import type { GenderText } from "@/lib/genderText";

export interface GameState {
  /** Either a spine node id or "ON_TRACK" when inside a wrong track */
  currentNodeId: NodeId;
  questionsUsed: number;
  /** Active wrong track (set on first wrong move with wrongEntersTrack) */
  trackEntered: TrackId | null;
  /** Topic ids already asked while on the active track */
  askedTopicIds: string[];
  /** History of choices */
  history: { nodeId: NodeId; choice: "correct" | "wrong" }[];
  collectedEvidence: string[];
  savedNoteIds: string[];
  isComplete: boolean;
}

export const initialGameState: GameState = {
  currentNodeId: "S1",
  questionsUsed: 0,
  trackEntered: null,
  askedTopicIds: [],
  history: [],
  collectedEvidence: [],
  savedNoteIds: [],
  isComplete: false,
};

export function resetInquiryState(): GameState {
  return { ...initialGameState };
}

// ============================================================
// CHOICES — produced from spine node OR from track topic pool
// ============================================================

export interface ChoicePresentation {
  id: string;
  text: GenderText;
  isCorrect: boolean;
  /** When on a track, this is the topic id the option corresponds to */
  topicId?: string;
  /** When on a track and this option is the conclusion wrap-up */
  isConclusion?: boolean;
}

/** Pick up to 2 unasked topics from the track (deterministic by question round) */
function pickTrackOptions(
  trackId: TrackId,
  askedTopicIds: string[],
  questionsUsed: number,
  shuffleSalt: number
): { options: ChoicePresentation[]; conclusion: TrackTopic } {
  const pool = TRACKS[trackId];
  // Preserve the authored topic order from the pool — earlier topics surface first
  const remaining = pool.topics.filter((t) => !askedTopicIds.includes(t.id));
  const conclusion = pool.conclusion;
  const ordered = remaining;

  const opts: ChoicePresentation[] = [];

  if (ordered.length >= 2) {
    // Two unasked topics — one shown as "correct", other as "wrong"
    // (in tracks both lead to same flow; correctness used only for shuffle key)
    opts.push({
      id: `track_${trackId}_${ordered[0].id}`,
      text: ordered[0].text,
      isCorrect: true,
      topicId: ordered[0].id,
    });
    opts.push({
      id: `track_${trackId}_${ordered[1].id}`,
      text: ordered[1].text,
      isCorrect: false,
      topicId: ordered[1].id,
    });
  } else if (ordered.length === 1) {
    // One topic left + conclusion
    opts.push({
      id: `track_${trackId}_${ordered[0].id}`,
      text: ordered[0].text,
      isCorrect: true,
      topicId: ordered[0].id,
    });
    opts.push({
      id: `track_${trackId}_conclude`,
      text: conclusion.text,
      isCorrect: false,
      isConclusion: true,
    });
  } else {
    // No topics left — only conclusion
    opts.push({
      id: `track_${trackId}_conclude`,
      text: conclusion.text,
      isCorrect: true,
      isConclusion: true,
    });
  }

  return { options: opts, conclusion };
}

export function getChoices(state: GameState, shuffleSalt: number = 0): ChoicePresentation[] {
  if (state.isComplete) return [];

  // On a wrong track: build from topic pool
  if (state.currentNodeId === "ON_TRACK" && state.trackEntered) {
    const { options } = pickTrackOptions(
      state.trackEntered,
      state.askedTopicIds,
      state.questionsUsed,
      shuffleSalt
    );
    return options;
  }

  // On the spine: show fixed correct/wrong options
  const node = SPINE[state.currentNodeId as SpineNodeId];
  if (!node || node.id === "END") return [];

  const opts: ChoicePresentation[] = [
    { id: `${node.id}_correct`, text: node.correct.text, isCorrect: true },
    { id: `${node.id}_wrong`, text: node.wrong.text, isCorrect: false },
  ];

  const seed = node.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0) + shuffleSalt;
  if (seed % 2 === 0) opts.reverse();
  return opts;
}

// ============================================================
// APPLY CHOICE
// ============================================================

export interface ApplyChoiceResult {
  nextState: GameState;
  responseText: GenderText;
  evidenceId?: string;
  note?: { id: string; text: string };
  questionText: GenderText;
  isCorrect: boolean;
}

/**
 * Apply a choice. On the spine, choice is "correct"|"wrong".
 * When on a track, the engine receives the chosen ChoicePresentation
 * (so it knows which topic was picked). For backward-compat, we also
 * support an optional choice object.
 */
export function applyChoice(
  state: GameState,
  choice: ChoicePresentation
): ApplyChoiceResult {
  if (state.isComplete) {
    return {
      nextState: state,
      responseText: "",
      questionText: "",
      isCorrect: choice.isCorrect,
    };
  }

  // ===== ON A WRONG TRACK =====
  if (state.currentNodeId === "ON_TRACK" && state.trackEntered) {
    const trackId = state.trackEntered;
    const pool = TRACKS[trackId];
    let option: CaseQuestionOption;
    let askedTopicIds = state.askedTopicIds;
    let isConcluded = false;

    if (choice.isConclusion) {
      option = pool.conclusion;
      isConcluded = true;
    } else if (choice.topicId) {
      const topic = pool.topics.find((t) => t.id === choice.topicId);
      if (!topic) {
        return {
          nextState: state,
          responseText: "",
          questionText: "",
          isCorrect: false,
        };
      }
      option = topic;
      askedTopicIds = [...askedTopicIds, topic.id];
    } else {
      return {
        nextState: state,
        responseText: "",
        questionText: "",
        isCorrect: false,
      };
    }

    const questionsUsed = state.questionsUsed + 1;
    const collectedEvidence = option.evidenceId
      ? [...state.collectedEvidence, option.evidenceId]
      : state.collectedEvidence;

    const allTopicsExhausted =
      askedTopicIds.length >= pool.topics.length;
    const budgetExhausted = questionsUsed >= TOTAL_QUESTION_BUDGET;
    const isComplete = isConcluded || budgetExhausted || allTopicsExhausted;

    const nextState: GameState = {
      ...state,
      currentNodeId: isComplete ? "END" : "ON_TRACK",
      questionsUsed,
      askedTopicIds,
      history: [...state.history, { nodeId: "ON_TRACK", choice: "wrong" }],
      collectedEvidence,
      isComplete,
    };

    return {
      nextState,
      responseText: option.hishamReply,
      evidenceId: option.evidenceId,
      note: option.note ? { id: option.note.id, text: option.note.text } : undefined,
      questionText: option.text,
      isCorrect: choice.isCorrect,
    };
  }

  // ===== ON THE SPINE =====
  const node = SPINE[state.currentNodeId as SpineNodeId];
  const isCorrect = choice.isCorrect;
  const option = isCorrect ? node.correct : node.wrong;
  const questionsUsed = state.questionsUsed + 1;

  let trackEntered = state.trackEntered;
  let askedTopicIds = state.askedTopicIds;
  let nextNodeId: NodeId;

  if (isCorrect) {
    nextNodeId = node.nextOnCorrect;
  } else {
    if (node.wrongEntersTrack && !trackEntered) {
      trackEntered = node.wrongEntersTrack;
      // Pre-consume any topic the wrong question already covered
      if (node.wrongConsumesTopicId) {
        askedTopicIds = [...askedTopicIds, node.wrongConsumesTopicId];
      }
    }
    nextNodeId = node.nextOnWrong;
  }

  const reachedEnd = nextNodeId === "END";
  const budgetExhausted = questionsUsed >= TOTAL_QUESTION_BUDGET;

  // If we just entered a track and the budget is already exhausted, end
  let finalNodeId: NodeId = nextNodeId;
  let isComplete = reachedEnd || budgetExhausted;

  // If track has no topics left already (edge case), end
  if (nextNodeId === "ON_TRACK" && trackEntered) {
    const remaining = TRACKS[trackEntered].topics.filter(
      (t) => !askedTopicIds.includes(t.id)
    );
    if (remaining.length === 0) {
      isComplete = true;
      finalNodeId = "END";
    }
  }

  if (isComplete) finalNodeId = "END";

  const collectedEvidence = option.evidenceId
    ? [...state.collectedEvidence, option.evidenceId]
    : state.collectedEvidence;

  const nextState: GameState = {
    ...state,
    currentNodeId: finalNodeId,
    questionsUsed,
    trackEntered,
    askedTopicIds,
    history: [
      ...state.history,
      { nodeId: state.currentNodeId, choice: isCorrect ? "correct" : "wrong" },
    ],
    collectedEvidence,
    isComplete,
  };

  return {
    nextState,
    responseText: option.hishamReply,
    evidenceId: option.evidenceId,
    note: option.note ? { id: option.note.id, text: option.note.text } : undefined,
    questionText: option.text,
    isCorrect,
  };
}

// ============================================================
// EVALUATION
// ============================================================

/** Did the player open the S1 correct option at any point? */
export function askedS1Correct(state: GameState): boolean {
  return state.history.some((h) => h.nodeId === "S1" && h.choice === "correct");
}

/** Did the player walk the full correct spine without ever entering a wrong track? */
export function walkedFullSpine(state: GameState): boolean {
  return (
    !state.trackEntered &&
    state.history.length >= 5 &&
    state.history.every((h) => h.choice === "correct")
  );
}

export function evaluate(
  state: GameState,
  framing: FramingSelection
): { outcome: CaseOutcome; correctCount: number } {
  const correctCount = countCorrectFraming(framing);

  const wentFullSpine =
    !state.trackEntered &&
    state.history.length >= 5 &&
    state.history.every((h) => h.choice === "correct");

  const outcome: CaseOutcome =
    wentFullSpine && correctCount === 2 ? "strong" : "weak";

  return { outcome, correctCount };
}
