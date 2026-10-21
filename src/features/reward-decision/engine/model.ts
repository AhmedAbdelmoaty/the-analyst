import { ARGUMENTS, QUESTIONS, type ArgumentId, type DocumentId, type Outcome, type QuestionId, type TeamId, type ToolId } from '../data/case';
import { randomUuid } from '../../../lib/random-uuid';
import { shuffledOrder } from './deduction';

/** Active V2 phases. 'recommendation' and 'meeting' are retired and only exist for old saves. */
export type Phase = 'cover' | 'celebration' | 'debate' | 'briefing' | 'hub' | 'sales' | 'hr' | 'workbench' | 'notebook' | 'report' | 'resolution' | 'debrief' | 'recommendation' | 'meeting';
export type Answers = Record<QuestionId, string | null>;
export interface Submission { answers: Record<QuestionId, string>; submittedAt: string }
export interface DeductionResult { score: 0 | 1 | 2; success: boolean; outcome: 'supported' | 'insufficient'; awardedTeam: TeamId }
/** A finished pre-V2 round kept only to show that it ended; it never maps to a V2 result. */
export interface LegacyResult { outcome: Outcome }

export interface RewardRun {
  schemaVersion: 5; gameId: 'reward-decision'; caseVersion: 'rowad-v3';
  userId: string; runId: string; revision: number;
  phase: Phase; stage: string; dialogueIndex: number; visibleGraphemes: number;
  visited: ('sales' | 'hr')[]; collectedDocs: DocumentId[];
  usedTools: ToolId[]; visibleTools: ToolId[]; activeTool: ToolId | null;
  answers: Answers; choiceOrder: Record<QuestionId, string[]>; notebookPage: 0 | 1;
  submitted: Submission | null; evaluation: DeductionResult | null; legacy: LegacyResult | null;
  endingCall: 0 | 1; callAnswered: boolean;
  paused: boolean; savedAt: string;
}

export const emptyAnswers = (): Answers => ({ center: null, spread: null });
export const newChoiceOrder = (): Record<QuestionId, string[]> => ({
  center: shuffledOrder(QUESTIONS.center.choices.map(c => c.id)),
  spread: shuffledOrder(QUESTIONS.spread.choices.map(c => c.id)),
});
export const newRun = (userId: string): RewardRun => ({
  schemaVersion: 5, gameId: 'reward-decision', caseVersion: 'rowad-v3', userId, runId: randomUuid(), revision: 0,
  phase: 'cover', stage: '', dialogueIndex: 0, visibleGraphemes: 0, visited: [], collectedDocs: [],
  usedTools: [], visibleTools: [], activeTool: null,
  answers: emptyAnswers(), choiceOrder: newChoiceOrder(), notebookPage: 0,
  submitted: null, evaluation: null, legacy: null, endingCall: 0, callAnswered: false,
  paused: false, savedAt: new Date().toISOString(),
});

export const SALES_DOCS: DocumentId[] = ['sales-summary', 'individual-records'];
export const REQUIRED_DOCS: DocumentId[] = ['sales-summary', 'individual-records', 'policy'];
export const salesReady = (docs: DocumentId[]) => SALES_DOCS.every(d => docs.includes(d));
export const canSubmit = (r: Pick<RewardRun, 'collectedDocs' | 'answers' | 'submitted'>) =>
  !r.submitted && REQUIRED_DOCS.every(d => r.collectedDocs.includes(d)) && Boolean(r.answers.center && r.answers.spread);

/* ---------------- Legacy (pre-V2) report types: retained only so old modules still compile. ---------------- */
export interface DraftReport { teamId: TeamId | null; documentId: DocumentId | null; arguments: [ArgumentId | null, ArgumentId | null] }
export interface FinalReport { teamId: TeamId; documentId: DocumentId; arguments: [ArgumentId, ArgumentId]; submittedAt: string }
export interface Evaluation { outcome: Outcome; reason: 'complete' | 'wrong_team' | 'wrong_document' | 'missing_performance' | 'missing_spread' | 'weak_arguments'; argumentValidity: [boolean, boolean] }
export const emptyDraft = (): DraftReport => ({ teamId: null, documentId: null, arguments: [null, null] });
export function evaluateReport(report: FinalReport, usedTools: ToolId[], docs: DocumentId[]): Evaluation {
  const valid = report.arguments.map(id => { const a = ARGUMENTS[id]; return a.correct && (!a.tool || usedTools.includes(a.tool)) && (!a.document || docs.includes(a.document)); }) as [boolean, boolean];
  const validArgs = report.arguments.filter((_, i) => valid[i]).map(id => ARGUMENTS[id]);
  let reason: Evaluation['reason'] = 'complete';
  if (report.teamId !== 'mahmoud') reason = 'wrong_team';
  else if (report.documentId !== 'policy') reason = 'wrong_document';
  else if (!validArgs.some(a => a.kind === 'performance')) reason = valid.every(Boolean) ? 'missing_performance' : 'weak_arguments';
  else if (!validArgs.some(a => a.kind === 'spread')) reason = valid.every(Boolean) ? 'missing_spread' : 'weak_arguments';
  return { outcome: reason === 'complete' ? 'supported' : reason === 'wrong_team' ? 'criterion_mismatch' : 'insufficient', reason, argumentValidity: valid };
}
