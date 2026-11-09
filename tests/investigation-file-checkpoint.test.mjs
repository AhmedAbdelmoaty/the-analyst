import assert from 'node:assert/strict';
import test from 'node:test';
import { beginRun, finishRun, readRun, saveCheckpoint, saveKey } from '../public/investigation-file/js/persistence.mjs';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

const checkpoint = { scene: 'confrontation', introStep: 3, selected: ['jt', 'ju'], labVisited: true, hint: 2,
  decision: 'pause-review', reason: 'composition', trainedMix: 500, untrainedMix: 650, tab: 'lab' };

test('investigation checkpoint restores only for its owner and keeps the scene position', () => {
  const store = storage();
  beginRun('player-a', store);
  saveCheckpoint('player-a', checkpoint, store);
  assert.deepEqual(readRun('player-a', store).checkpoint, checkpoint);
  assert.equal(readRun('player-b', store).status, 'new');
  assert.notEqual(saveKey('player-a'), saveKey('player-b'));
});

test('old in-progress saves remain readable; invalid checkpoints are not resumable', () => {
  const store = storage();
  beginRun('player-a', store);
  assert.deepEqual(readRun('player-a', store), { version: 1, status: 'in-progress' });
  store.setItem(saveKey('player-a'), JSON.stringify({ version: 1, status: 'in-progress', checkpoint: { ...checkpoint, scene: 'unknown' } }));
  assert.deepEqual(readRun('player-a', store), { version: 1, status: 'in-progress' });
});

test('a completed result cannot be overwritten by a late checkpoint', () => {
  const store = storage();
  beginRun('player-a', store);
  finishRun('player-a', 'success', store);
  saveCheckpoint('player-a', checkpoint, store);
  assert.deepEqual(readRun('player-a', store), { version: 1, status: 'completed', outcome: 'success' });
});
