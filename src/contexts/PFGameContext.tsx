import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import {
  initialGameState,
  resetInquiryState,
  applyChoice as engineApply,
  getChoices as engineGetChoices,
  evaluate as engineEvaluate,
  askedS1Correct as engineAskedS1Correct,
  walkedFullSpine as engineWalkedFullSpine,
  type GameState,
  type ChoicePresentation,
} from "@/lib/pf-case-engine/gameStateMachine";
import {
  buildFramingSections,
  type FramingSection,
  type FramingSelection,
} from "@/lib/pf-case/framing-board";
import type { CaseOutcome } from "@/lib/pf-case/case-tree";
import { EVIDENCE, type EvidenceData } from "@/lib/pf-case/evidence-catalog";
import type { GenderText } from "@/lib/genderText";

interface SavedNote {
  id: string;
  text: string;
  roundId: number;
}

export interface PFGameState extends GameState {
  notes: SavedNote[];
  framing: FramingSelection;
  framingSubmitted: boolean;
  outcome: CaseOutcome | null;
  framingCorrectCount: number;
  /** Reports (evidence ids) Hisham handed over, in receipt order */
  collectedReports: string[];
  /** Number of times the player restarted the inquiry (max 2) */
  restartCount: number;
  /** Transient flag: navigate back to the start of the in-store flow */
  restartFromBeginning: boolean;
  /** Timestamp (ms) when the player first entered the inquiry */
  gameStartedAt: number | null;
}

interface ChoiceResult {
  questionText: GenderText;
  responseText: GenderText;
  evidence?: EvidenceData;
  noteId?: string;
  noteText?: string;
}

interface InquiryFindingPayload {
  evidenceId?: string;
  noteId?: string;
  noteText?: string;
}

interface PFGameContextValue {
  state: PFGameState;
  // Inquiry
  getChoices: () => ChoicePresentation[];
  pickChoice: (choice: ChoicePresentation) => ChoiceResult | null;
  collectInquiryFindings: (payload: InquiryFindingPayload) => void;
  saveNote: (id: string, text: string) => void;
  removeNote: (roundId: number) => void;
  // Restart inquiry (limited to 2 uses)
  restartInquiry: () => void;
  canRestart: boolean;
  consumeRestartFlag: () => void;
  // Framing
  framingSections: FramingSection[];
  setFramingSelection: (sectionId: keyof FramingSelection, optionId: string) => void;
  submitFraming: () => CaseOutcome;
  // Lifecycle
  resetGame: () => void;
  markGameStarted: () => void;
  // Helpers
  isInquiryComplete: () => boolean;
}

const initialState: PFGameState = {
  ...initialGameState,
  notes: [],
  framing: { client_view: null, true_frame: null, next_decision: null },
  framingSubmitted: false,
  outcome: null,
  framingCorrectCount: 0,
  collectedReports: [],
  restartCount: 0,
  restartFromBeginning: false,
  gameStartedAt: null,
};

const PFGameContext = createContext<PFGameContextValue | null>(null);

export const usePFGame = () => {
  const ctx = useContext(PFGameContext);
  if (!ctx) throw new Error("usePFGame must be used within PFGameProvider");
  return ctx;
};

export const PFGameProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<PFGameState>(initialState);

  const getChoices = useCallback(
    () => engineGetChoices(state, state.restartCount * 13),
    [state]
  );

  const restartInquiry = useCallback(() => {
    setState((prev) => {
      if (prev.restartCount >= 2) return prev;
      return {
        ...prev,
        ...resetInquiryState(),
        notes: [],
        collectedReports: [],
        restartCount: prev.restartCount + 1,
        restartFromBeginning: true,
      };
    });
  }, []);

  const consumeRestartFlag = useCallback(() => {
    setState((prev) => (prev.restartFromBeginning ? { ...prev, restartFromBeginning: false } : prev));
  }, []);

  const pickChoice = useCallback(
    (choice: ChoicePresentation): ChoiceResult | null => {
      const result = engineApply(state, choice);
      setState((prev) => {
        return {
          ...prev,
          ...result.nextState,
          collectedReports: prev.collectedReports,
          savedNoteIds: prev.savedNoteIds,
          notes: prev.notes,
        };
      });

      return {
        questionText: result.questionText,
        responseText: result.responseText,
        evidence: result.evidenceId ? EVIDENCE[result.evidenceId] : undefined,
        noteId: result.note?.id,
        noteText: result.note?.text,
      };
    },
    [state]
  );

  const collectInquiryFindings = useCallback((payload: InquiryFindingPayload) => {
    setState((prev) => {
      const shouldAddReport =
        !!payload.evidenceId && !prev.collectedReports.includes(payload.evidenceId);
      const shouldSaveNote =
        !!payload.noteId &&
        !!payload.noteText &&
        !prev.savedNoteIds.includes(payload.noteId);

      if (!shouldAddReport && !shouldSaveNote) return prev;

      return {
        ...prev,
        collectedReports: shouldAddReport
          ? [...prev.collectedReports, payload.evidenceId!]
          : prev.collectedReports,
        savedNoteIds: shouldSaveNote
          ? [...prev.savedNoteIds, payload.noteId!]
          : prev.savedNoteIds,
        notes: shouldSaveNote
          ? [
              ...prev.notes,
              {
                id: payload.noteId!,
                text: payload.noteText!,
                roundId: prev.notes.length + 1,
              },
            ]
          : prev.notes,
      };
    });
  }, []);

  const saveNote = useCallback((id: string, text: string) => {
    setState((prev) => {
      if (prev.savedNoteIds.includes(id)) return prev;
      return {
        ...prev,
        savedNoteIds: [...prev.savedNoteIds, id],
        notes: [...prev.notes, { id, text, roundId: prev.notes.length + 1 }],
      };
    });
  }, []);

  const removeNote = useCallback((roundId: number) => {
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((n) => n.roundId !== roundId),
    }));
  }, []);

  const setFramingSelection = useCallback(
    (sectionId: keyof FramingSelection, optionId: string) => {
      setState((prev) => ({
        ...prev,
        framing: { ...prev.framing, [sectionId]: optionId },
      }));
    },
    []
  );

  const submitFraming = useCallback((): CaseOutcome => {
    let outcome: CaseOutcome = "weak";
    setState((prev) => {
      const { outcome: o, correctCount } = engineEvaluate(prev, prev.framing);
      outcome = o;
      return {
        ...prev,
        framingSubmitted: true,
        outcome: o,
        framingCorrectCount: correctCount,
      };
    });
    return outcome;
  }, []);

  const resetGame = useCallback(() => setState(initialState), []);

  const markGameStarted = useCallback(() => {
    setState((prev) => (prev.gameStartedAt ? prev : { ...prev, gameStartedAt: Date.now() }));
  }, []);

  const isInquiryComplete = useCallback(() => state.isComplete, [state.isComplete]);

  const framingSections = useMemo<FramingSection[]>(
    () =>
      buildFramingSections({
        askedS1Correct: engineAskedS1Correct(state),
        walkedFullSpine: engineWalkedFullSpine(state),
        shuffleSeed: 7,
      }),
    [state]
  );

  return (
    <PFGameContext.Provider
      value={{
        state,
        getChoices,
        pickChoice,
        collectInquiryFindings,
        saveNote,
        removeNote,
        restartInquiry,
        canRestart: state.restartCount < 2,
        consumeRestartFlag,
        framingSections,
        setFramingSelection,
        submitFraming,
        resetGame,
        markGameStarted,
        isInquiryComplete,
      }}
    >
      {children}
    </PFGameContext.Provider>
  );
};

