export type Phase = "intro" | "brief" | "road" | "meeting" | "office" | "verdict";
export type View = "think" | "guess" | "preparingData" | "data" | "ask" | "email";
export type Path = "data" | "ask";
export type ClaimId = "aBetter" | "bBetter" | "equal" | "notRep" | "trainer" | "trainees";
export type EvidenceId = "participants" | "complaintsRate" | "complaints" | "satisfaction" | "attendance" | "assignments" | "projects" | "respondents";
export type QuestionId = "respondents" | "complaintsOfAll" | "attendance" | "complaintsCount" | "allData";
export type SayesPay = "later" | "ten" | "fifty";
export type Outcome = "win" | "lossGuess" | "lossData";

export const DEADLINE_SECONDS = 120;
export const DATA_PREPARATION_SECONDS = 5;
export const BRIEF_LENGTH = 2;
export const MEETING_LENGTH = 5;

export const ALL_CLAIMS: ClaimId[] = ["aBetter", "bBetter", "equal", "notRep"];
export const DATA_CLAIMS: ClaimId[] = ["aBetter", "bBetter", "equal"];
export const ASK_CLAIMS: ClaimId[] = ["aBetter", "bBetter", "notRep"];
export const EVIDENCE: EvidenceId[] = ["participants", "complaintsRate", "complaints", "satisfaction", "attendance", "assignments", "projects", "respondents"];

export const SUPPORTS: Record<"aBetter" | "bBetter" | "equal" | "notRep", EvidenceId[]> = {
  aBetter: ["complaints", "complaintsRate"],
  bBetter: ["attendance"],
  equal: ["assignments"],
  notRep: ["respondents"],
};

export interface State {
  phase: Phase;
  line: number;
  officeEntered: boolean;
  view: View;
  path: Path | null;
  penalty: number;
  asked: QuestionId[];
  claim: ClaimId | null;
  evidence: EvidenceId | null;
  mismatch: boolean;
  outcome: Outcome | null;
  timedOut: boolean;
  order: ClaimId[];
  sayes: SayesPay | null;
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const current = a[i];
    const other = a[j];
    if (current === undefined || other === undefined) continue;
    [a[i], a[j]] = [other, current];
  }
  return a;
}

const officeReset = { view: "think" as View, path: null, asked: [], claim: null, evidence: null, mismatch: false };

export function initialState(): State {
  return { phase: "intro", line: 0, officeEntered: false, penalty: 0, outcome: null, timedOut: false, order: ALL_CLAIMS, sayes: null, ...officeReset };
}

export type Action =
  | { type: "start"; rng?: () => number }
  | { type: "next" }
  | { type: "paySayes"; pay: SayesPay }
  | { type: "sayesFifty" }
  | { type: "enterOffice" }
  | { type: "think"; to: "guess" | "data" | "ask" }
  | { type: "guess"; id: "trainer" | "trainees" | "data"; evidence?: EvidenceId | null }
  | { type: "ask"; id: QuestionId }
  | { type: "resetAsk" }
  | { type: "dataReady" }
  | { type: "claim"; id: ClaimId }
  | { type: "evidence"; id: EvidenceId }
  | { type: "confirm" }
  | { type: "backToThink" }
  | { type: "backFromEmail" }
  | { type: "send" }
  | { type: "timeout" }
  | { type: "retry" }
  | { type: "restart" };

export const isCorrect = (claim: ClaimId | null, evidence: EvidenceId | null) => claim === "notRep" && evidence === "respondents";
export const supports = (claim: ClaimId, ev: EvidenceId) => claim in SUPPORTS && SUPPORTS[claim as keyof typeof SUPPORTS].includes(ev);
export const claimsFor = (s: State) => (s.path === "ask" ? s.order.filter((c) => ASK_CLAIMS.includes(c)) : s.order.filter((c) => DATA_CLAIMS.includes(c)));
export const timeLeft = (elapsed: number, penalty: number) => Math.max(0, DEADLINE_SECONDS - elapsed - penalty);

function toData(s: State): State {
  return { ...s, view: "preparingData", path: "data", claim: null, evidence: null, mismatch: false };
}

const questionEvidence: Partial<Record<QuestionId, EvidenceId>> = { respondents: "respondents", attendance: "attendance", complaintsCount: "complaints" };

export function reduce(s: State, a: Action): State {
  const inOffice = s.phase === "office" && s.officeEntered;
  switch (a.type) {
    case "start":
      return s.phase === "intro" ? { ...initialState(), phase: "brief", order: shuffle(ALL_CLAIMS, a.rng ?? Math.random) } : s;
    case "next":
      if (s.phase === "brief") return s.line + 1 < BRIEF_LENGTH ? { ...s, line: s.line + 1 } : { ...s, phase: "road", line: 0 };
      if (s.phase === "road") return { ...s, phase: "meeting", line: 0 };
      if (s.phase === "meeting") return s.line + 1 < MEETING_LENGTH ? { ...s, line: s.line + 1 } : { ...s, phase: "office", line: 0 };
      return s;
    case "paySayes":
      return s.phase === "road" && !s.sayes ? { ...s, sayes: a.pay } : s;
    case "sayesFifty":
      return inOffice && s.view === "email" && s.sayes && s.sayes !== "fifty" ? { ...s, sayes: "fifty" } : s;
    case "enterOffice":
      return s.phase === "office" ? { ...s, officeEntered: true } : s;
    case "think":
      if (!inOffice || s.view !== "think") return s;
      if (a.to === "data") return toData(s);
      return { ...s, view: a.to, path: a.to === "ask" ? "ask" : null };
    case "guess":
      if (!inOffice || s.view !== "guess") return s;
      if (a.id === "data") return toData(s);
      return { ...s, claim: a.id, evidence: a.evidence ?? null, view: "email" };
    case "ask":
      if (!inOffice || s.view !== "ask") return s;
      if (a.id === "allData") return toData(s);
      return s.asked.length ? s : { ...s, asked: [a.id], evidence: questionEvidence[a.id] ?? null, claim: null };
    case "dataReady":
      return inOffice && s.view === "preparingData" ? { ...s, view: "data" } : s;
    case "resetAsk":
      if (!inOffice || s.view !== "ask") return s;
      return { ...s, asked: [], claim: null, evidence: null, mismatch: false };
    case "claim":
      if (!inOffice || !s.evidence || (s.view !== "data" && s.view !== "ask") || !claimsFor(s).includes(a.id)) return s;
      return { ...s, claim: a.id, mismatch: false };
    case "evidence":
      if (!inOffice || (s.view !== "data" && s.view !== "ask") || !EVIDENCE.includes(a.id)) return s;
      if (s.path === "ask" && questionEvidence[s.asked[0] ?? "complaintsOfAll"] !== a.id) return s;
      return { ...s, evidence: a.id, claim: null, mismatch: false };
    case "confirm":
      if (!inOffice || !s.claim || !s.evidence) return s;
      return { ...s, view: "email" };
    case "backFromEmail":
      if (!inOffice || s.view !== "email") return s;
      if (s.claim === "trainer" || s.claim === "trainees") return { ...s, view: "guess", claim: null, evidence: null };
      return { ...s, view: s.path === "ask" ? "ask" : "data" };
    case "backToThink":
      return {
        ...s,
        phase: "office",
        officeEntered: true,
        penalty: 0,
        outcome: null,
        timedOut: false,
        ...officeReset,
      };
    case "send": {
      if (!inOffice || s.view !== "email" || !s.claim) return s;
      let outcome: Outcome = "lossData";
      if (s.claim === "trainer" || s.claim === "trainees") outcome = "lossGuess";
      else if (isCorrect(s.claim, s.evidence)) outcome = "win";
      return { ...s, phase: "verdict", outcome };
    }
    case "timeout":
      return inOffice ? { ...s, phase: "verdict", outcome: null, timedOut: true } : s;
    case "retry":
      if (s.phase !== "verdict" || s.outcome === "win") return s;
      return { ...s, phase: "office", officeEntered: false, penalty: 0, outcome: null, timedOut: false, ...officeReset };
    case "restart":
      return initialState();
  }
}
