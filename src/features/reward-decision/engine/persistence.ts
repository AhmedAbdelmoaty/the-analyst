import { newRun, type RewardRun } from './model';
import type { DocumentId, ToolId } from '../data/case';
import type { Outcome } from '../data/case';

/** The storage key is unchanged since v1 so every older save is found and migrated, never wiped. */
export const storageKey = (uid: string) => `the-analyst:reward-decision:v1:${uid}`;
export type LoadResult = { status: 'none' } | { status: 'ok'; run: RewardRun; migrated?: boolean } | { status: 'corrupt' };
const toolMap: Record<string, ToolId | undefined> = { ev_mean: 'mean', ev_median: 'median', ev_range: 'range', ev_sd: 'sd', ev_iqr: 'iqr' };
const TOOL_IDS: ToolId[] = ['mean', 'median', 'range', 'sd', 'iqr'];
const DOC_IDS: DocumentId[] = ['sales-summary', 'individual-records', 'policy'];
const DIALOGUE_PHASES = ['celebration', 'debate', 'briefing', 'sales', 'hr'];
type Raw = Record<string, unknown>;
const arr = (x: unknown) => Array.isArray(x) ? x : [];

/** v2 used other ids; normalise its documents/tools before the common v5 conversion. */
function normaliseV2(d: Raw): Raw {
  const evidence = arr(d.evidence).filter(x => typeof x === 'string') as string[];
  const oldTools = d.tools && typeof d.tools === 'object' ? Object.keys(d.tools as object) : [];
  const usedTools = [...new Set([...evidence, ...oldTools].map(x => toolMap[x]).filter(Boolean))];
  const oldDocs = arr(d.collectedDocs);
  const collectedDocs: DocumentId[] = [];
  if (oldDocs.includes('sales')) collectedDocs.push('sales-summary');
  if (oldDocs.includes('records') || d.openedIndividualRecords) collectedDocs.push('individual-records');
  if (oldDocs.includes('policy')) collectedDocs.push('policy');
  return { ...d, usedTools, visibleTools: usedTools, collectedDocs };
}

/**
 * Any older save becomes a valid v5 run. Unfinished rounds keep their progress (dialogue scenes restart
 * at their first line because the script changed); a finished pre-V2 round is shown as ended and never
 * becomes a V2 success. Retired phases (recommendation/meeting) cannot reappear.
 */
export function migrateToV5(d: Raw, uid: string): RewardRun {
  const base = newRun(uid);
  const oldPhase = typeof d.phase === 'string' ? d.phase : 'hub';
  const submitted = d.submitted && typeof d.submitted === 'object';
  const oldEval = d.evaluation && typeof d.evaluation === 'object' ? d.evaluation as { outcome?: Outcome } : null;
  const usedTools = arr(d.usedTools).filter((x): x is ToolId => TOOL_IDS.includes(x as ToolId));
  const visibleTools = arr(d.visibleTools).filter((x): x is ToolId => TOOL_IDS.includes(x as ToolId));
  const keep = {
    ...base,
    runId: typeof d.runId === 'string' ? d.runId : base.runId,
    revision: typeof d.revision === 'number' ? d.revision + 1 : 1,
    visited: arr(d.visited).filter(x => x === 'sales' || x === 'hr') as ('sales' | 'hr')[],
    collectedDocs: arr(d.collectedDocs).filter((x): x is DocumentId => DOC_IDS.includes(x as DocumentId)),
    usedTools, visibleTools, activeTool: visibleTools[visibleTools.length - 1] ?? null,
    paused: oldPhase !== 'cover',
  };
  if (oldPhase === 'cover') return { ...keep, phase: 'cover', paused: false };
  if (submitted || ['meeting', 'resolution', 'debrief'].includes(oldPhase)) {
    return { ...keep, phase: 'debrief', stage: 'legacy', legacy: { outcome: oldEval?.outcome ?? 'insufficient' } };
  }
  if (DIALOGUE_PHASES.includes(oldPhase)) {
    const stage = typeof d.stage === 'string' && d.stage ? d.stage : 'talk';
    return { ...keep, phase: oldPhase as RewardRun['phase'], stage: stage === 'talk' ? 'talk' : stage };
  }
  if (oldPhase === 'workbench' || oldPhase === 'recommendation') return { ...keep, phase: 'workbench' };
  return { ...keep, phase: 'hub' };
}

function sanitizeV5(r: RewardRun, uid: string): RewardRun {
  const base = newRun(uid);
  const next: RewardRun = { ...base, ...r, answers: { ...base.answers, ...r.answers }, choiceOrder: r.choiceOrder?.center?.length === 4 && r.choiceOrder?.spread?.length === 4 ? r.choiceOrder : base.choiceOrder, paused: r.phase !== 'cover' };
  // The send animation is presentation only; a reload after the frozen submission continues in the office.
  if (next.phase === 'report' && next.stage === 'sending' && next.submitted) return { ...next, phase: 'resolution', stage: 'office', dialogueIndex: 0, visibleGraphemes: 0, endingCall: 0, callAnswered: false };
  if (next.phase === 'recommendation' || next.phase === 'meeting') return { ...next, phase: next.submitted ? 'debrief' : 'workbench', stage: '' };
  return next;
}

export function inspectRun(uid: string): LoadResult {
  let raw: string | null = null; try { raw = localStorage.getItem(storageKey(uid)); } catch { return { status: 'none' }; }
  if (!raw) return { status: 'none' };
  try {
    const d = JSON.parse(raw) as Raw;
    if (!d || d.gameId !== 'reward-decision' || d.userId !== uid) return { status: 'corrupt' };
    if (d.schemaVersion === 2) return { status: 'ok', run: migrateToV5(normaliseV2(d), uid), migrated: true };
    if ((d.schemaVersion === 3 || d.schemaVersion === 4) && d.caseVersion === 'rowad-v2') return { status: 'ok', run: migrateToV5(d, uid), migrated: true };
    if (d.schemaVersion !== 5 || d.caseVersion !== 'rowad-v3') return { status: 'corrupt' };
    return { status: 'ok', run: sanitizeV5(d as unknown as RewardRun, uid) };
  } catch { return { status: 'corrupt' }; }
}
export function loadRun(uid: string) { const r = inspectRun(uid); return r.status === 'ok' ? r.run : null; }
export type SaveResult = 'saved' | 'stale' | 'unavailable';
export function saveRun(run: RewardRun): SaveResult { try { const raw = localStorage.getItem(storageKey(run.userId)); if (raw) { const cur = JSON.parse(raw) as Partial<RewardRun>; if (cur.runId === run.runId && typeof cur.revision === 'number' && cur.revision > run.revision) return 'stale'; } } catch { /* overwrite */ }
  try { localStorage.setItem(storageKey(run.userId), JSON.stringify({ ...run, savedAt: new Date().toISOString() })); return 'saved'; } catch { return 'unavailable'; } }
export function clearRun(uid: string) { try { localStorage.removeItem(storageKey(uid)); } catch { /* unavailable */ } }
