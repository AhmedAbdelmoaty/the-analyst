import { newRun, type RewardRun } from './model';

export const storageKey = (uid: string) => `the-analyst:reward-decision:v1:${uid}`;

export type LoadResult = { status: 'none' } | { status: 'ok'; run: RewardRun } | { status: 'corrupt' };

export function inspectRun(uid: string): LoadResult {
  let raw: string | null = null;
  try { raw = localStorage.getItem(storageKey(uid)); } catch { return { status: 'none' }; }
  if (!raw) return { status: 'none' };
  try {
    const d = JSON.parse(raw) as RewardRun;
    if (!d || d.schemaVersion !== 2 || d.gameId !== 'reward-decision' || d.caseVersion !== 'rowad-v1' || d.userId !== uid || typeof d.phase !== 'string') return { status: 'corrupt' };
    const base = newRun(uid);
    return { status: 'ok', run: { ...base, ...d, optional: { ...base.optional, ...d.optional }, meeting: { ...base.meeting, ...d.meeting }, tools: d.tools ?? {}, paused: d.phase !== 'cover' } };
  } catch { return { status: 'corrupt' }; }
}

export function loadRun(uid: string): RewardRun | null {
  const r = inspectRun(uid);
  return r.status === 'ok' ? r.run : null;
}

export type SaveResult = 'saved' | 'stale' | 'unavailable';

/** Writes a snapshot unless storage already holds a newer revision of the same run (another tab moved on). */
export function saveRun(run: RewardRun): SaveResult {
  try {
    const raw = localStorage.getItem(storageKey(run.userId));
    if (raw) {
      const cur = JSON.parse(raw) as Partial<RewardRun>;
      if (cur.runId === run.runId && typeof cur.revision === 'number' && cur.revision > run.revision) return 'stale';
    }
  } catch { /* unreadable snapshot: overwrite */ }
  try {
    localStorage.setItem(storageKey(run.userId), JSON.stringify({ ...run, savedAt: new Date().toISOString() }));
    return 'saved';
  } catch { return 'unavailable'; }
}

export function clearRun(uid: string) { try { localStorage.removeItem(storageKey(uid)); } catch { /* unavailable */ } }
