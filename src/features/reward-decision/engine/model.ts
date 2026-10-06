import { ARGUMENTS, type ArgumentId, type DocumentId, type Outcome, type TeamId, type ToolId } from '../data/case';

export type Phase = 'cover' | 'celebration' | 'debate' | 'briefing' | 'hub' | 'sales' | 'hr' | 'workbench' | 'recommendation' | 'meeting' | 'resolution' | 'debrief';
export interface DraftReport { teamId: TeamId | null; documentId: DocumentId | null; arguments: [ArgumentId | null, ArgumentId | null] }
export interface FinalReport { teamId: TeamId; documentId: DocumentId; arguments: [ArgumentId, ArgumentId]; submittedAt: string }
export interface Evaluation { outcome: Outcome; reason: 'complete' | 'wrong_team' | 'wrong_document' | 'missing_performance' | 'missing_spread' | 'weak_arguments'; argumentValidity: [boolean, boolean] }
export interface RewardRun {
  schemaVersion: 3; gameId: 'reward-decision'; caseVersion: 'rowad-v2';
  userId: string; runId: string; revision: number;
  phase: Phase; stage: string; dialogueIndex: number; visibleGraphemes: number;
  visited: ('sales' | 'hr')[]; collectedDocs: DocumentId[];
  usedTools: ToolId[]; visibleTools: ToolId[]; activeTeamChart: TeamId;
  draft: DraftReport; submitted: FinalReport | null; evaluation: Evaluation | null;
  meetingIndex: number; debriefStep: number; paused: boolean; savedAt: string;
}

export const emptyDraft = (): DraftReport => ({ teamId: null, documentId: null, arguments: [null, null] });
export const newRun = (userId: string): RewardRun => ({
  schemaVersion: 3, gameId: 'reward-decision', caseVersion: 'rowad-v2', userId, runId: crypto.randomUUID(), revision: 0,
  phase: 'cover', stage: '', dialogueIndex: 0, visibleGraphemes: 0, visited: [], collectedDocs: [],
  usedTools: [], visibleTools: [], activeTeamChart: 'marwan', draft: emptyDraft(), submitted: null, evaluation: null,
  meetingIndex: 0, debriefStep: 0, paused: false, savedAt: new Date().toISOString(),
});

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

export function shotFor(r: RewardRun): string {
  switch (r.phase) {
    case 'cover': return 'A00'; case 'celebration': return r.stage === 'intro' ? 'A01' : 'A02';
    case 'debate': return r.dialogueIndex < 2 ? 'A04' : 'A05'; case 'briefing': return 'A07';
    case 'hub': return 'A09'; case 'sales': return 'A11'; case 'hr': return 'A13';
    case 'workbench': return 'A15'; case 'recommendation': return 'A17';
    case 'meeting': return r.stage === 'open' ? 'A18' : r.submitted?.teamId === 'mahmoud' ? 'A19' : 'A20';
    case 'resolution': return r.evaluation?.outcome === 'supported' ? (r.stage === 'impact' ? 'A23' : 'A22') : 'A24';
    case 'debrief': return 'A25';
  }
}