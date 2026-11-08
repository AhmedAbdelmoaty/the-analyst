import assert from 'node:assert/strict';
import test from 'node:test';
import { SOURCE, change, companyMetrics, gameReducer, initialState, mixRevealed, productMetrics, revenueShare, weightedMargin, type Choice } from '../src/features/profit-paradox/model.ts';

test('the case figures and weighted margins stay exact', () => {
  assert.deepEqual(SOURCE.jan, { premium: { revenue: 75000, grossProfit: 28500 }, basic: { revenue: 25000, grossProfit: 1500 } });
  assert.deepEqual(SOURCE.feb, { premium: { revenue: 20000, grossProfit: 8000 }, basic: { revenue: 100000, grossProfit: 7000 } });
  assert.deepEqual(companyMetrics('jan'), { revenue: 100000, grossProfit: 30000, margin: .3 });
  assert.deepEqual(companyMetrics('feb'), { revenue: 120000, grossProfit: 15000, margin: .125 });
  assert.equal(change('revenue'), .2);
  assert.equal(change('grossProfit'), -.5);
  assert.equal(productMetrics('jan', 'premium').margin, .38);
  assert.equal(productMetrics('feb', 'premium').margin, .4);
  assert.equal(productMetrics('jan', 'basic').margin, .06);
  assert.equal(productMetrics('feb', 'basic').margin, .07);
  assert.equal(revenueShare('jan', 'premium'), .75);
  assert.equal(revenueShare('feb', 'premium'), 1 / 6);
  assert.ok(Math.abs(weightedMargin('jan') - .3) < 1e-12);
  assert.ok(Math.abs(weightedMargin('feb') - .125) < 1e-12);
});

test('choice cards reshuffle between rounds without changing their semantic answers', () => {
  const first = initialState();
  const second = gameReducer(first, { type: 'replay' });
  for (const question of ['q1', 'q2', 'q3'] as const) {
    assert.deepEqual([...first.choiceOrder[question]].sort(), ['A', 'B', 'C', 'D']);
    assert.deepEqual([...second.choiceOrder[question]].sort(), ['A', 'B', 'C', 'D']);
    assert.notDeepEqual(second.choiceOrder[question], first.choiceOrder[question]);
  }
});

test('every original Q1 answer advances, Q2 is recorded once and never blocks review', () => {
  for (const choice of ['A', 'B', 'C', 'D'] as Choice[]) {
    let state = gameReducer(initialState(), { type: 'q1', choice });
    state = gameReducer(state, { type: 'next' });
    assert.equal(state.level, 2);
    state = gameReducer(state, { type: 'q2', choice });
    assert.equal(gameReducer(state, { type: 'q2', choice: 'C' }).q2, choice);
    state = gameReducer(state, { type: 'next' });
    assert.equal(state.level, 3);
    state = gameReducer(state, { type: 'back' });
    assert.equal(gameReducer(state, { type: 'q2', choice: 'C' }).q2, choice);
  }
});

test('four unique revenue cells earn reveal; wrong or repeated input cannot bypass it', () => {
  let state = gameReducer(gameReducer(gameReducer(initialState(), { type: 'q1', choice: 'A' }), { type: 'next' }), { type: 'q2', choice: 'B' });
  state = gameReducer(state, { type: 'next' });
  assert.equal(gameReducer(state, { type: 'next' }).level, 3);
  for (const key of ['jan-premium', 'jan-basic', 'feb-premium'] as const) state = gameReducer(state, { type: 'revenue', key });
  assert.equal(mixRevealed(state), false);
  assert.equal(gameReducer(state, { type: 'next' }).level, 3);
  state = gameReducer(state, { type: 'revenue', key: 'feb-premium' });
  assert.equal(state.revenueKeys.length, 2);
  state = gameReducer(state, { type: 'revenue', key: 'feb-premium' });
  state = gameReducer(state, { type: 'revenue', key: 'feb-basic' });
  assert.equal(mixRevealed(state), true);
  assert.equal(gameReducer(state, { type: 'revenue', key: 'jan-premium' }).revenueKeys.length, 4);
  state = gameReducer(state, { type: 'next' });
  assert.equal(state.level, 4);
  for (const choice of ['A', 'B', 'C', 'D'] as Choice[]) {
    const decided = gameReducer(state, { type: 'q3', choice });
    assert.equal(decided.accepted, choice === 'D');
    assert.equal(gameReducer(decided, { type: 'q3', choice: 'D' }).q3, choice);
    const ended = gameReducer(decided, { type: 'next' });
    assert.equal(ended.level, 5);
    assert.equal(ended.q1, 'A');
    assert.equal(ended.q2, 'B');
    assert.equal(gameReducer(ended, { type: 'replay' }).level, 1);
  }
});
