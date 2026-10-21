import { beforeEach, describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ANSWER_KEY, DOCUMENTS, POLICY, QUESTIONS, TEAMS } from '../src/features/reward-decision/data/case';
import { SOURCE_SCRIPT, scriptFor } from '../src/features/reward-decision/data/script';
import { endingCalls } from '../src/features/reward-decision/data/endingCalls';
import { evaluateDeduction, shuffledOrder, SERVER_V3_EVALUATION_ENABLED } from '../src/features/reward-decision/engine/deduction';
import { canSubmit, newRun, salesReady } from '../src/features/reward-decision/engine/model';
import { stats } from '../src/features/reward-decision/engine/statistics';
import { histogramBins } from '../src/features/reward-decision/presentation';
import { inspectRun, storageKey } from '../src/features/reward-decision/engine/persistence';
import { resolveScene } from '../src/features/reward-decision/engine/resolveScene';
import { FinalReport } from '../src/features/reward-decision/components/FinalReport';
import { DeductionNotebook } from '../src/features/reward-decision/components/DeductionNotebook';
import { ChartBoard } from '../src/features/reward-decision/components/AnalysisRoom';
import { GameResults } from '../src/features/reward-decision/components/GameResults';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k) };
beforeEach(() => mem.clear());
const uid = 'u-1';

describe('approved data unchanged', () => {
  test('raw records and statistics', () => {
    expect(TEAMS.marwan.members.map(m => m.value)).toEqual([72, 75, 78, 80, 82, 84, 99, 112, 119, 149]);
    expect(TEAMS.mahmoud.members.map(m => m.value)).toEqual([85, 86, 87, 87, 88, 88, 89, 89, 90, 91]);
    const a = stats('marwan'), b = stats('mahmoud');
    expect([a.mean, a.median, a.range, a.sd.toFixed(1), a.iqr, a.threshold]).toEqual([95, 83, 77, '23.5', 34, 4]);
    expect([b.mean, b.median, b.range, b.sd.toFixed(1), b.iqr, b.threshold]).toEqual([88, 88, 6, '1.7', 2, 10]);
  });
  test('histogram counts are exactly the employees, never invented', () => {
    for (const team of ['marwan', 'mahmoud'] as const) expect(histogramBins(stats(team).values).reduce((n, b) => n + b.count, 0)).toBe(10);
    expect(histogramBins(stats('mahmoud').values).filter(b => b.count).map(b => b.count)).toEqual([1, 3, 4, 2]);
    expect(histogramBins(stats('marwan').values).filter(b => b.count).every(b => b.count === 1)).toBe(true);
  });
  test('policy is only the 85% standard, renamed', () => {
    expect(DOCUMENTS.policy.title).toBe('ملف معيار الأداء');
    expect(POLICY).not.toContain('انتشار');
    expect(POLICY).not.toContain('تقارب');
    expect(POLICY).toContain('85%');
  });
});

describe('deduction contract', () => {
  test('two questions, four choices, one correct each', () => {
    expect(Object.keys(QUESTIONS)).toEqual(['center', 'spread']);
    for (const q of ['center', 'spread'] as const) {
      expect(QUESTIONS[q].choices).toHaveLength(4);
      expect(QUESTIONS[q].choices.filter(c => c.id === ANSWER_KEY[q])).toHaveLength(1);
    }
  });
  test('four combinations → two endings', () => {
    expect(evaluateDeduction({ center: 'center_a', spread: 'spread_c' })).toEqual({ score: 2, success: true, outcome: 'supported', awardedTeam: 'mahmoud' });
    expect(evaluateDeduction({ center: 'center_a', spread: 'spread_d' })).toEqual({ score: 1, success: false, outcome: 'insufficient', awardedTeam: 'marwan' });
    expect(evaluateDeduction({ center: 'center_b', spread: 'spread_c' })).toEqual({ score: 1, success: false, outcome: 'insufficient', awardedTeam: 'marwan' });
    expect(evaluateDeduction({ center: 'center_c', spread: 'spread_a' })).toEqual({ score: 0, success: false, outcome: 'insufficient', awardedTeam: 'marwan' });
  });
  test('shuffle keeps ids; a run stores its order; nothing selected initially', () => {
    const ids = QUESTIONS.center.choices.map(c => c.id);
    expect([...shuffledOrder(ids, () => 0.1)].sort()).toEqual([...ids].sort());
    const r = newRun(uid);
    expect(r.answers).toEqual({ center: null, spread: null });
    expect([...r.choiceOrder.spread].sort()).toEqual(QUESTIONS.spread.choices.map(c => c.id).sort());
  });
  test('submission needs all three documents and both answers, once', () => {
    const r = { ...newRun(uid), answers: { center: 'center_a', spread: 'spread_c' } };
    expect(canSubmit({ ...r, collectedDocs: ['sales-summary', 'individual-records'] })).toBe(false);
    expect(canSubmit({ ...r, collectedDocs: ['sales-summary', 'individual-records', 'policy'] })).toBe(true);
    expect(canSubmit({ ...r, collectedDocs: ['sales-summary', 'individual-records', 'policy'], submitted: { answers: r.answers as any, submittedAt: 'x' } })).toBe(false);
    expect(salesReady(['sales-summary'])).toBe(false);
    expect(salesReady(['individual-records', 'sales-summary'])).toBe(true);
  });
  test('server submit stays off until the backend evaluator is approved', () => expect(SERVER_V3_EVALUATION_ENABLED).toBe(false));
});

describe('story', () => {
  test('separate document handoffs and line counts', () => {
    expect(SOURCE_SCRIPT.sales.map(l => l.documentId ?? null)).toEqual(['sales-summary', null, 'individual-records']);
    expect(SOURCE_SCRIPT.hr[0].documentId).toBe('policy');
    expect(SOURCE_SCRIPT.debate).toHaveLength(4);
  });
  test('gender variants render', () => {
    expect(scriptFor('female').briefing[0].text).toStartWith('بصي،');
    expect(scriptFor('male').briefing[0].text).toStartWith('بص،');
    expect(scriptFor('female').sales[1].text).toContain('محتاجة');
  });
  test('calls: Mahmoud then Marwan, five turns, both branches and genders', () => {
    for (const ok of [true, false]) for (const g of ['male', 'female'] as const) {
      const [a, b] = endingCalls(ok, g);
      expect([a.caller, b.caller]).toEqual(['mahmoud', 'marwan']);
      expect(a.lines).toHaveLength(5); expect(b.lines).toHaveLength(5);
    }
    expect(endingCalls(true, 'female')[0].lines[4].text).toContain('تسلمي يا نجمة!');
    expect(endingCalls(false, 'male')[0].lines[2].text).toContain('إنت فاهم إحصاء');
  });
  test('phone scenes follow the frozen outcome', () => {
    const r = { ...newRun(uid), phase: 'resolution' as const, stage: 'talking', evaluation: evaluateDeduction({ center: 'center_b', spread: 'spread_c' }) };
    expect(resolveScene(r, 'male', { id: 'x', speaker: 'mahmoud', text: '' })).toBe('phone-mahmoud-upset');
    expect(resolveScene(r, 'male', { id: 'x', speaker: 'marwan', text: '' })).toBe('phone-marwan-happy');
  });
});

describe('no spoilers before submission', () => {
  const base = { runId: 'abcd-1', docs: ['sales-summary', 'individual-records', 'policy'] as any, sending: false, onReview() {}, onSubmit() {}, onSent() {} };
  test('report shows chosen statements, not a team', () => {
    const html = renderToStaticMarkup(createElement(FinalReport, { ...base, answers: { center: 'center_b', spread: 'spread_c' } }));
    expect(html).toContain(QUESTIONS.center.choices[1].text);
    expect(html).not.toContain('ترشيح فريق');
    expect(html).not.toContain('2/2');
  });
  test('notebook has no preselected choice and no correctness marking', () => {
    const r = newRun(uid);
    const html = renderToStaticMarkup(createElement(DeductionNotebook, { answers: r.answers, order: r.choiceOrder, page: 0, used: [], locked: false, onAnswer() {}, onPage() {}, onCharts() {}, onReview() {} }));
    expect(html).not.toContain('aria-checked="true"');
    expect(html).not.toMatch(/correct|wrong|kde|density/i);
  });
  test('analysis room is empty before sales data and has no KDE', () => {
    expect(renderToStaticMarkup(createElement(ChartBoard, { ready: false, used: [], visible: [], active: null, onToggle() {}, onBack() {} }))).toContain('لسه بيانات المبيعات ما وصلتش لملف التحليل.');
    const html = renderToStaticMarkup(createElement(ChartBoard, { ready: true, used: [], visible: ['mean', 'median', 'range', 'sd', 'iqr'], active: 'mean', onToggle() {}, onBack() {} }));
    for (const name of ['المتوسط الحسابي', 'الوسيط', 'المدى', 'الانحراف المعياري', 'المدى الربيعي']) expect(html).toContain(name);
    expect(html).not.toMatch(/density|kde/i);
  });
  test('results never name the questions', () => {
    for (const score of [0, 1, 2] as const) {
      const html = renderToStaticMarkup(createElement(GameResults, { score, activeMs: 61000, onReplay() {}, onExit() {} }));
      expect(html).toContain(`${score}/2`);
      expect(html).not.toContain('المركز');
      expect(html).not.toContain('center_');
    }
  });
});

describe('migration', () => {
  test('v4 run in the retired meeting ends as legacy, never a V2 success', () => {
    mem.set(storageKey(uid), JSON.stringify({ schemaVersion: 4, caseVersion: 'rowad-v2', gameId: 'reward-decision', userId: uid, runId: 'r', revision: 3, phase: 'meeting', submitted: { teamId: 'mahmoud' }, evaluation: { outcome: 'supported' }, collectedDocs: ['policy'] }));
    const r = inspectRun(uid);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') { expect(r.run.phase).toBe('debrief'); expect(r.run.evaluation).toBeNull(); expect(r.run.schemaVersion).toBe(5); }
  });
  test('v4 recommendation returns to the analysis room with empty answers', () => {
    mem.set(storageKey(uid), JSON.stringify({ schemaVersion: 4, caseVersion: 'rowad-v2', gameId: 'reward-decision', userId: uid, runId: 'r', revision: 1, phase: 'recommendation', collectedDocs: ['sales-summary', 'individual-records'], usedTools: ['mean'] }));
    const r = inspectRun(uid);
    if (r.status !== 'ok') throw new Error('expected ok');
    expect(r.run.phase).toBe('workbench');
    expect(r.run.usedTools).toEqual(['mean']);
    expect(r.run.answers).toEqual({ center: null, spread: null });
  });
  test('reload during the send animation continues in the office, keeping the frozen result', () => {
    const run = { ...newRun(uid), phase: 'report', stage: 'sending', submitted: { answers: { center: 'center_a', spread: 'spread_c' }, submittedAt: 'x' }, evaluation: evaluateDeduction({ center: 'center_a', spread: 'spread_c' }) };
    mem.set(storageKey(uid), JSON.stringify(run));
    const r = inspectRun(uid);
    if (r.status !== 'ok') throw new Error('expected ok');
    expect([r.run.phase, r.run.stage, r.run.evaluation?.score]).toEqual(['resolution', 'office', 2]);
  });
});
