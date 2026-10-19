import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { newRun, evaluateReport, type FinalReport, type RewardRun } from '../src/features/reward-decision/engine/model';
import { SCRIPT } from '../src/features/reward-decision/data/script';
import { meetingLines } from '../src/features/reward-decision/components/Meeting';
import { endingCalls } from '../src/features/reward-decision/data/endingCalls';
import { resolveScene } from '../src/features/reward-decision/engine/resolveScene';
import { graphemes, lineDuration, narrativeSpec } from '../src/features/reward-decision/engine/narrativeClock';

const run = (phase: RewardRun['phase'], stage = 'talk'): RewardRun => ({ ...newRun('synthetic'), phase, stage });
const report = (teamId: FinalReport['teamId']): FinalReport => ({
  teamId, documentId: 'policy', arguments: ['records-coverage', 'range-mahmoud'], submittedAt: 'synthetic',
});
const complete = evaluateReport(report('mahmoud'), ['range'], ['policy', 'individual-records']);

describe('scene manifest and semantic resolver', () => {
  test('every literal manifest file exists; 34 pairs and seven masters are distinct', () => {
    const source = readFileSync(join(import.meta.dir, '../src/features/reward-decision/data/assets.ts'), 'utf8');
    const names = [...source.matchAll(/(?:pair|url)\('([^']+\.(?:webp|png))'/g)].map(match => match[1]);
    // pair() calls contain two names; capture both arguments too.
    const pairNames = [...source.matchAll(/pair\('([^']+)', '([^']+)'\)/g)].flatMap(match => [match[1], match[2]]);
    const masterNames = [...source.matchAll(/: url\('([^']+)'\)/g)].map(match => match[1]);
    const actual = readdirSync(join(import.meta.dir, '../src/features/reward-decision/assets/scenes'));
    expect(names.length).toBeGreaterThan(0);
    expect(pairNames.length).toBe(68);
    expect(masterNames.length).toBe(7);
    expect(new Set([...pairNames, ...masterNames]).size).toBe(75);
    expect([...pairNames, ...masterNames].sort()).toEqual(actual.sort());
  });
  test('opening, debate, CEO, hub and two visit orders map to story lines', () => {
    for (const gender of ['male', 'female'] as const) {
      expect(resolveScene(run('celebration', 'intro'), gender, null)).toBe('opening');
      expect(resolveScene(run('celebration'), gender, SCRIPT.celebration[0])).toBe('opening');
      expect(SCRIPT.celebration.slice(1).map(line => resolveScene(run('celebration'), gender, line))).toEqual(['marwan-reply', 'marwan-reply']);
      expect(SCRIPT.debate.map(line => resolveScene(run('debate'), gender, line))).toEqual(['debate', 'debate', 'policy-debate']);
      expect(resolveScene(run('debate', 'door'), gender, null)).toBe(`door-${gender}`);
      expect(SCRIPT.briefing.map(line => resolveScene(run('briefing'), gender, line))).toEqual([`briefing-${gender}`, `briefing-${gender}`, 'final-directions']);
      expect(resolveScene(run('hub', ''), gender, null)).toBe('corridor');
      for (const order of [['sales', 'hr'], ['hr', 'sales']] as const) {
        expect(order.flatMap(place => SCRIPT[place].map(line => resolveScene(run(place), gender, line)))).toEqual(
          order.flatMap(place => place === 'sales' ? [`sales-${gender}`, `sales-${gender}`, 'sales-records'] : [`hr-${gender}`, `hr-${gender}`, 'hr-guidance']),
        );
      }
      expect(resolveScene(run('workbench', ''), gender, null)).toBe(`analyst-${gender}`);
      expect(resolveScene(run('recommendation', ''), gender, null)).toBe(`report-${gender}`);
    }
    expect(SCRIPT.sales.filter(line => line.documentId).map(line => [line.id, line.documentId])).toEqual([['sales_01', 'sales-summary'], ['sales_03', 'individual-records']]);
    expect(SCRIPT.hr.filter(line => line.documentId).map(line => [line.id, line.documentId])).toEqual([['hr_01', 'policy']]);
  });
  test('meeting reaction uses evaluation reason, never team alone', () => {
    for (const gender of ['male', 'female'] as const) {
      for (const reason of ['complete', 'wrong_team', 'wrong_document', 'missing_performance', 'missing_spread', 'weak_arguments'] as const) {
        const state = { ...run('meeting', 'open'), submitted: report('mahmoud'), evaluation: { ...complete, reason } };
        const lines = meetingLines(state.submitted, state.evaluation);
        expect(resolveScene(state, gender, lines[0])).toBe('meeting-opening');
        expect(resolveScene({ ...state, dialogueIndex: 1 }, gender, lines[1])).toBe(`meeting-player-${gender}`);
        for (let index = 2; index < lines.length; index++)
          expect(resolveScene({ ...state, dialogueIndex: index }, gender, lines[index])).toBe(reason === 'complete' ? 'meeting-neutral' : 'meeting-concerned');
      }
    }
  });
  test('both phone branches use the actual caller and player line, including weak Mahmoud report', () => {
    for (const gender of ['male', 'female'] as const) for (const teamId of ['mahmoud', 'marwan'] as const) {
      const submitted = report(teamId);
      const evaluation = teamId === 'marwan' ? evaluateReport(submitted, ['range'], ['policy', 'individual-records']) : complete;
      const calls = endingCalls(submitted, evaluation, gender);
      expect(calls.map(call => call.caller)).toEqual(['mahmoud', 'marwan']);
      for (const [callIndex, call] of calls.entries()) for (const line of call.lines) {
        const state = { ...run('resolution', 'talking'), submitted, evaluation, endingCall: callIndex as 0 | 1 };
        const mood = teamId === 'marwan' ? 'concerned' : 'calm';
        const expected = line.speaker === 'player' ? `phone-player-${gender}-${mood}`
          : line.speaker === 'mahmoud' ? `phone-mahmoud-${teamId === 'marwan' ? 'upset' : 'happy'}`
            : `phone-marwan-${teamId === 'marwan' ? 'happy' : 'upset'}`;
        expect(resolveScene(state, gender, line)).toBe(expected);
      }
      for (const stage of ['office', 'incoming', 'gap'])
        expect(resolveScene({ ...run('resolution', stage), submitted, evaluation }, gender, null)).toBe(`analyst-${gender}`);
      expect(resolveScene(run('debrief', 'notes'), gender, null)).toBe('completed-folder');
    }
  });
  test('typing progress never changes scene key', () => {
    const line = SCRIPT.briefing[0], state = run('briefing');
    const key = resolveScene(state, 'female', line);
    for (const visibleGraphemes of [0, 1, 12, 90])
      expect(resolveScene({ ...state, visibleGraphemes }, 'female', line)).toBe(key);
  });
});

describe('automatic narration boundaries and reading policy', () => {
  test('graphemes and long-line minimum leave full text visible', () => {
    expect(graphemes('أَ')).toHaveLength(1);
    for (const n of [35, 90, 160]) {
      const { revealMs, totalMs } = lineDuration(n);
      expect(revealMs).toBe(n * 34);
      expect(totalMs).toBeGreaterThan(revealMs);
      expect(totalMs).toBeGreaterThanOrEqual(Math.ceil(n / 14 * 1000));
    }
  });
  test('only narrative lines and finite transition stages are scheduled', () => {
    for (const [phase, stage] of [['celebration', 'intro'], ['celebration', 'draft'], ['debate', 'door'], ['briefing', 'done'], ['resolution', 'office'], ['resolution', 'gap']] as const)
      expect(narrativeSpec(run(phase, stage), null)?.totalMs).toBeGreaterThan(0);
    for (const phase of ['cover', 'hub', 'workbench', 'recommendation', 'debrief'] as const)
      expect(narrativeSpec(run(phase, ''), null)).toBeNull();
    expect(narrativeSpec(run('resolution', 'incoming'), null)).toBeNull();
    const current = run('sales');
    const before = narrativeSpec(current, SCRIPT.sales[0]);
    expect(narrativeSpec({ ...current, visibleGraphemes: 20 }, SCRIPT.sales[0])?.key).toBe(before?.key);
    expect(narrativeSpec({ ...current, dialogueIndex: 1 }, SCRIPT.sales[1])?.key).not.toBe(before?.key);
    expect(narrativeSpec({ ...newRun('synthetic'), runId: 'new-run', phase: 'sales', stage: 'talk' }, SCRIPT.sales[0])?.key).not.toBe(before?.key);
  });
});
