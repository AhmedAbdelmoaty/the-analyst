import { beforeEach, describe, expect, test } from 'bun:test';
import { newRun, evaluate, shotFor, type Link, type RewardRun } from '../src/features/reward-decision/engine/model';
import { stats } from '../src/features/reward-decision/engine/statistics';
import { ALL_LINES, SCRIPT, SPEAKERS } from '../src/features/reward-decision/data/script';
import { evidenceFigures } from '../src/features/reward-decision/engine/evidence';

class MemStorage { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } removeItem(k: string) { this.m.delete(k); } clear() { this.m.clear(); } key() { return null; } get length() { return this.m.size; } }
const store = new MemStorage();
(globalThis as unknown as { localStorage: Storage }).localStorage = store as unknown as Storage;

const { saveRun, loadRun, inspectRun, storageKey } = await import('../src/features/reward-decision/engine/persistence');
const { createOwnership } = await import('../src/features/reward-decision/engine/ownership');

describe('Reward Decision', () => {
  test('uses the approved team figures', () => { const m = stats('marwan'), b = stats('mahmoud'); expect(m.mean).toBe(95); expect(m.median).toBe(83); expect(m.range).toBe(77); expect(m.sd.toFixed(1)).toBe('23.5'); expect(m.iqr).toBe(34); expect(m.threshold).toBe(4); expect(b.mean).toBe(88); expect(b.range).toBe(6); expect(b.sd.toFixed(1)).toBe('1.7'); expect(b.iqr).toBe(2); expect(b.threshold).toBe(10); });
  test('case file figures come from the record', () => { expect(evidenceFigures('ev_threshold').marwan).toContain('4 من 10'); expect(evidenceFigures('ev_iqr').mahmoud).toContain('87–89'); });
  const run = (team: 'marwan' | 'mahmoud', links: Link[], defense: Link | null = null): RewardRun => ({ ...newRun('u'), evidence: ['ev_threshold', 'ev_range', 'ev_median', 'ev_mean'], submitted: { teamId: team, links }, meeting: { defense, followupUsed: false } });
  test('supports Mahmoud only with coverage and spread interpreted correctly', () => expect(evaluate(run('mahmoud', [{ evidenceId: 'ev_threshold', claimId: 'coverage' }, { evidenceId: 'ev_range', claimId: 'spread' }]))).toBe('supported'));
  test('median or a correct team name alone is insufficient', () => expect(evaluate(run('mahmoud', [{ evidenceId: 'ev_threshold', claimId: 'coverage' }, { evidenceId: 'ev_median', claimId: 'middle' }]))).toBe('insufficient'));
  test('wrong interpretation does not prove spread', () => expect(evaluate(run('mahmoud', [{ evidenceId: 'ev_threshold', claimId: 'coverage' }, { evidenceId: 'ev_range', claimId: 'coverage' }]))).toBe('insufficient'));
  test('meeting defence can fill the missing link', () => expect(evaluate(run('mahmoud', [{ evidenceId: 'ev_threshold', claimId: 'coverage' }, { evidenceId: 'ev_mean', claimId: 'aggregate' }], { evidenceId: 'ev_range', claimId: 'spread' }))).toBe('supported'));
  test('Marwan is a criterion mismatch even with valid evidence', () => expect(evaluate(run('marwan', [{ evidenceId: 'ev_threshold', claimId: 'coverage' }, { evidenceId: 'ev_range', claimId: 'spread' }]))).toBe('criterion_mismatch'));
  test('meeting shots follow the nominated team', () => { const r = { ...run('mahmoud', []), phase: 'meeting' as const, stage: 'objection' }; expect(shotFor(r)).toBe('A19'); expect(shotFor({ ...r, submitted: { teamId: 'marwan', links: [] } })).toBe('A20'); expect(shotFor({ ...r, stage: 'open' })).toBe('A18'); expect(shotFor({ ...r, phase: 'resolution', stage: 'paper', outcome: 'supported' })).toBe('A22'); expect(shotFor({ ...r, phase: 'resolution', stage: 'news', outcome: 'supported' })).toBe('A23'); });
});

describe('dialogue contract', () => {
  test('every line is an object with id, known speaker and non-empty text', () => {
    for (const l of ALL_LINES) {
      expect(typeof l).toBe('object'); expect(Array.isArray(l)).toBe(false);
      expect(l.id).toMatch(/^[a-z0-9_]+$/); expect(Object.keys(SPEAKERS)).toContain(l.speaker);
      expect(typeof l.text).toBe('string'); expect(l.text.length).toBeGreaterThan(0);
      expect(() => Array.from(l.text)).not.toThrow();
    }
  });
  test('line ids are unique and blocks match the contract sizes', () => {
    const ids = ALL_LINES.map(l => l.id); expect(new Set(ids).size).toBe(ids.length);
    expect([SCRIPT.D01, SCRIPT.D02, SCRIPT.D03, SCRIPT.D04, SCRIPT.D05, SCRIPT.D06, SCRIPT.D07, SCRIPT.D08].map(b => b.length)).toEqual([4, 7, 7, 5, 7, 3, 3, 3]);
  });
});

describe('snapshot and tab ownership', () => {
  beforeEach(() => store.clear());
  test('round trip restores paused with tool progress', () => {
    const r: RewardRun = { ...newRun('u1'), phase: 'workbench', stage: '', revision: 3, activeTool: 'ev_median', tools: { ev_median: { step: 1, selected: ['m05'] } } };
    expect(saveRun(r)).toBe('saved');
    const back = loadRun('u1')!; expect(back.paused).toBe(true); expect(back.tools.ev_median).toEqual({ step: 1, selected: ['m05'] }); expect(back.activeTool).toBe('ev_median');
  });
  test('old schema is reported as not restorable, not silently dropped', () => { store.setItem(storageKey('u2'), JSON.stringify({ schemaVersion: 1, gameId: 'reward-decision' })); expect(inspectRun('u2').status).toBe('corrupt'); });
  test('a stale tab cannot overwrite newer progress of the same run', () => {
    const r = { ...newRun('u3'), phase: 'hub' as const, revision: 10 };
    expect(saveRun(r)).toBe('saved');
    expect(saveRun({ ...r, revision: 4, phase: 'cover' as const })).toBe('stale');
    expect(loadRun('u3')!.revision).toBe(10);
  });
  test('second tab is refused while the lease is fresh, and taking control renews it', async () => {
    const a = createOwnership('A', store as unknown as Storage), b = createOwnership('B', store as unknown as Storage);
    let aLost = false;
    expect(a.claim('u', 'r', () => { aLost = true; })).toBe(true);
    expect(b.claim('u', 'r', () => {})).toBe(false);
    expect(b.mayWrite()).toBe(false);
    b.take();
    expect(b.mayWrite()).toBe(true);
    await new Promise(r => setTimeout(r, 50));
    expect(aLost).toBe(true); expect(a.mayWrite()).toBe(false);
    const lease = JSON.parse(store.getItem('the-analyst:reward-decision:owner:u:r')!); expect(lease.tabId).toBe('B');
    a.release(); b.release();
  });
});
