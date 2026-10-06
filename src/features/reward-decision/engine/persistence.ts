import { newRun, type DraftReport, type RewardRun } from './model';
import type { ArgumentId, DocumentId, TeamId, ToolId } from '../data/case';

export const storageKey = (uid: string) => `the-analyst:reward-decision:v1:${uid}`;
export type LoadResult = { status: 'none' } | { status: 'ok'; run: RewardRun; migrated?: boolean } | { status: 'corrupt' };
const toolMap: Record<string, ToolId | undefined> = { ev_mean: 'mean', ev_median: 'median', ev_range: 'range', ev_sd: 'sd', ev_iqr: 'iqr' };
const argMap: Record<string, ArgumentId | undefined> = { ev_mean: 'mean-marwan', ev_median: 'median-mahmoud', ev_range: 'range-mahmoud', ev_sd: 'sd-mahmoud', ev_iqr: 'iqr-mahmoud', ev_threshold: 'records-coverage' };

function migrateV2(d: Record<string, unknown>, uid: string): RewardRun {
  const base = newRun(uid);
  const evidence = Array.isArray(d.evidence) ? d.evidence.filter(x => typeof x === 'string') as string[] : [];
  const oldTools = d.tools && typeof d.tools === 'object' ? Object.keys(d.tools as object) : [];
  const usedTools = [...new Set([...evidence, ...oldTools].map(x => toolMap[x]).filter((x): x is ToolId => Boolean(x)))];
  const oldDocs = Array.isArray(d.collectedDocs) ? d.collectedDocs : [];
  const collectedDocs: DocumentId[] = [];
  if (oldDocs.includes('sales')) collectedDocs.push('sales-summary');
  if (oldDocs.includes('records') || d.openedIndividualRecords) collectedDocs.push('individual-records');
  if (oldDocs.includes('policy')) collectedDocs.push('policy');
  const oldDraft = d.draft && typeof d.draft === 'object' ? d.draft as { teamId?: TeamId; links?: { evidenceId?: string }[] } : {};
  const oldSubmitted = d.submitted && typeof d.submitted === 'object' ? d.submitted as { teamId?: TeamId; links?: { evidenceId?: string }[] } : undefined;
  const source = oldSubmitted ?? oldDraft;
  const mappedArgs = (source.links ?? []).map(l => l.evidenceId ? argMap[l.evidenceId] : undefined).filter((x): x is ArgumentId => Boolean(x)).slice(0, 2);
  const draft: DraftReport = { teamId: source.teamId ?? null, documentId: collectedDocs.includes('policy') ? 'policy' : null, arguments: [mappedArgs[0] ?? null, mappedArgs[1] ?? null] };
  const oldPhase = typeof d.phase === 'string' ? d.phase : 'hub';
  const safePhase = ['cover','celebration','debate','briefing','hub','sales','hr','workbench'].includes(oldPhase) ? oldPhase as RewardRun['phase'] : 'recommendation';
  const safeStage = safePhase === 'workbench' || safePhase === 'hub' || safePhase === 'recommendation' ? '' : typeof d.stage === 'string' ? d.stage : '';
  return { ...base, runId: typeof d.runId === 'string' ? d.runId : base.runId, revision: typeof d.revision === 'number' ? d.revision + 1 : 1,
    phase: safePhase, stage: safeStage, dialogueIndex: typeof d.dialogueIndex === 'number' ? d.dialogueIndex : 0,
    visibleGraphemes: typeof d.visibleGraphemes === 'number' ? d.visibleGraphemes : 0,
    visited: Array.isArray(d.visited) ? d.visited.filter(x => x === 'sales' || x === 'hr') as ('sales'|'hr')[] : [],
    collectedDocs, usedTools, visibleTools: usedTools, draft, paused: safePhase !== 'cover' };
}

export function inspectRun(uid: string): LoadResult {
  let raw: string | null = null; try { raw = localStorage.getItem(storageKey(uid)); } catch { return { status: 'none' }; }
  if (!raw) return { status: 'none' };
  try {
    const d = JSON.parse(raw) as Record<string, unknown>;
    if (!d || d.gameId !== 'reward-decision' || d.userId !== uid) return { status: 'corrupt' };
    if (d.schemaVersion === 2) return { status: 'ok', run: migrateV2(d, uid), migrated: true };
    if (d.schemaVersion !== 3 || d.caseVersion !== 'rowad-v2') return { status: 'corrupt' };
    const base = newRun(uid), r = d as unknown as RewardRun;
    return { status: 'ok', run: { ...base, ...r, draft: { ...base.draft, ...r.draft }, paused: r.phase !== 'cover' } };
  } catch { return { status: 'corrupt' }; }
}
export function loadRun(uid: string) { const r = inspectRun(uid); return r.status === 'ok' ? r.run : null; }
export type SaveResult = 'saved' | 'stale' | 'unavailable';
export function saveRun(run: RewardRun): SaveResult { try { const raw = localStorage.getItem(storageKey(run.userId)); if (raw) { const cur = JSON.parse(raw) as Partial<RewardRun>; if (cur.runId === run.runId && typeof cur.revision === 'number' && cur.revision > run.revision) return 'stale'; } } catch { /* overwrite */ }
  try { localStorage.setItem(storageKey(run.userId), JSON.stringify({ ...run, savedAt: new Date().toISOString() })); return 'saved'; } catch { return 'unavailable'; } }
export function clearRun(uid: string) { try { localStorage.removeItem(storageKey(uid)); } catch { /* unavailable */ } }