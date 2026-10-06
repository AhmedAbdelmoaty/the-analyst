import type { ClaimId, EvidenceId, Outcome, TeamId } from '../data/case';
import type { OptionalId } from '../data/script';
import { MEANINGS } from './evidence';

export type Phase = 'cover' | 'celebration' | 'debate' | 'briefing' | 'hub' | 'sales' | 'hr' | 'workbench' | 'recommendation' | 'meeting' | 'resolution' | 'debrief';
export interface Link { evidenceId: EvidenceId; claimId: ClaimId }
export interface DraftLink { evidenceId: EvidenceId | ''; claimId: ClaimId | '' }
export interface ToolState { step: number; selected: string[] }
export interface RewardRun {
  schemaVersion: 2; gameId: 'reward-decision'; caseVersion: 'rowad-v1';
  userId: string; runId: string; revision: number;
  phase: Phase;
  /** Sub-step inside a phase (e.g. talk/draft/menu/doc/defend). */
  stage: string;
  dialogueIndex: number; visibleGraphemes: number;
  visited: ('sales' | 'hr')[]; collectedDocs: string[]; completedCameos: string[];
  pendingDestination: 'sales' | 'hr' | null;
  openedIndividualRecords: boolean;
  evidence: EvidenceId[];
  activeTool: EvidenceId | null;
  tools: Partial<Record<EvidenceId, ToolState>>;
  optional: { id: OptionalId | null; index: number; visible: number; asked: OptionalId[]; leadersOpen: boolean };
  draft: { teamId: TeamId | null; links: DraftLink[] };
  submitted: { teamId: TeamId; links: Link[] } | null;
  meeting: { defense: Link | null; followupUsed: boolean };
  outcome: Outcome | null;
  debriefStep: number;
  reviewCount: number;
  paused: boolean;
  savedAt: string;
}

export const newRun = (userId: string): RewardRun => ({
  schemaVersion: 2, gameId: 'reward-decision', caseVersion: 'rowad-v1', userId, runId: crypto.randomUUID(), revision: 0,
  phase: 'cover', stage: '', dialogueIndex: 0, visibleGraphemes: 0,
  visited: [], collectedDocs: [], completedCameos: [], pendingDestination: null, openedIndividualRecords: false,
  evidence: [], activeTool: null, tools: {},
  optional: { id: null, index: 0, visible: 0, asked: [], leadersOpen: false },
  draft: { teamId: null, links: [] }, submitted: null,
  meeting: { defense: null, followupUsed: false }, outcome: null, debriefStep: 0, reviewCount: 0,
  paused: false, savedAt: new Date().toISOString(),
});

export const effectiveLinks = (run: RewardRun): Link[] => [...(run.submitted?.links ?? []), ...(run.meeting.defense ? [run.meeting.defense] : [])];

export const evaluate = (run: RewardRun): Outcome => {
  const links = effectiveLinks(run);
  const valid = (ev: EvidenceId, claim: ClaimId) => run.evidence.includes(ev) && MEANINGS[ev] === claim && links.some(l => l.evidenceId === ev && l.claimId === claim);
  const coverage = valid('ev_threshold', 'coverage');
  const spread = (['ev_range', 'ev_sd', 'ev_iqr'] as EvidenceId[]).some(ev => valid(ev, 'spread'));
  if (run.submitted?.teamId !== 'mahmoud') return 'criterion_mismatch';
  return coverage && spread ? 'supported' : 'insufficient';
};

/** Every shot has its own id; the visible shot is derived from state so reloads land on the same picture. */
export function shotFor(r: RewardRun): string {
  switch (r.phase) {
    case 'cover': return 'A00';
    case 'celebration': return r.stage === 'intro' ? 'A01' : r.stage === 'draft' ? 'A03' : 'A02';
    case 'debate': return r.stage === 'door' ? 'A06' : r.dialogueIndex < 3 ? 'A04' : 'A05';
    case 'briefing': return r.dialogueIndex < 5 ? 'A07' : 'A08';
    case 'hub': return r.stage === 'cameo' ? 'A10' : 'A09';
    case 'sales': return r.stage === 'doc' ? 'A12' : 'A11';
    case 'hr': return r.stage === 'doc' ? 'A14' : 'A13';
    case 'workbench': return r.activeTool ? 'A16' : 'A15';
    case 'recommendation': return 'A17';
    case 'meeting': return r.stage === 'open' ? 'A18' : r.stage === 'objection' || r.stage === 'defend' ? (r.submitted?.teamId === 'mahmoud' ? 'A19' : 'A20') : 'A21';
    case 'resolution': return r.outcome !== 'supported' ? 'A24' : r.stage === 'paper' ? 'A22' : r.stage === 'news' ? 'A23' : 'A21';
    case 'debrief': return 'A25';
  }
}
