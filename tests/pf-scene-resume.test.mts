import { test } from 'node:test';
import assert from 'node:assert/strict';

const values = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => { values.set(key, value); },
  removeItem: key => { values.delete(key); },
} as Storage;
const { setSceneScope, readSceneProgress, writeSceneProgress } = await import('../src/lib/pf-game-persistence');

test('a dialogue checkpoint survives a pending transition to the next scene', () => {
  values.clear();
  setSceneScope('player-1', 'round-1|company-briefing');
  writeSceneProgress('briefing', { phase: 'dialogue', index: 2 });
  setSceneScope('player-1', 'round-1|travel');
  writeSceneProgress('travel', { elapsed: 100 });
  setSceneScope('player-1', 'round-1|company-briefing');
  assert.deepEqual(readSceneProgress('briefing'), { phase: 'dialogue', index: 2 });
  setSceneScope('player-2', 'round-1|company-briefing');
  assert.equal(readSceneProgress('briefing'), undefined);
});

test('the existing single-scene format remains readable and writable', () => {
  values.clear();
  values.set('pf-scene-v1:player-1', JSON.stringify({ tag: 'old-round|phone-call', data: { 'phone-call': { index: 2 } } }));
  setSceneScope('player-1', 'old-round|phone-call');
  assert.deepEqual(readSceneProgress('phone-call'), { index: 2 });
  writeSceneProgress('phone-call', { index: 3 });
  assert.deepEqual(readSceneProgress('phone-call'), { index: 3 });
});
