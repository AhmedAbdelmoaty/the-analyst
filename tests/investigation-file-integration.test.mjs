import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(root, file), 'utf8');

test('investigation game is in the shared annual catalog and profile-gated router', async () => {
  const [catalog, app, gameRoutes, progress] = await Promise.all([
    read('src/features/discovery/catalog.ts'),
    read('src/App.tsx'),
    read('src/lib/gameRoutes.ts'),
    read('src/features/discovery/progress.ts'),
  ]);
  assert.match(catalog, /id:\s*'investigation-file'.*route:\s*'\/games\/investigation-file'.*tier:\s*'annual'/);
  assert.match(app, /path="\/games\/investigation-file" element={<RequireProfile><GameGate game="investigation-file">/);
  assert.match(gameRoutes, /"\/games\/investigation-file"/);
  assert.match(progress, /case 'investigation-file'/);
});

test('packaged case data preserves the four source groups and the actual rate reversal', async () => {
  const { records, originalRates, balancedRates } = await import('../public/investigation-file/js/case-data.mjs');
  assert.deepEqual(records.map(({ id, promoted, total }) => [id, promoted, total]), [
    ['jt', 80, 100], ['ju', 450, 600], ['st', 60, 300], ['su', 10, 100],
  ]);
  assert.equal(originalRates.trained, 0.35);
  assert.ok(originalRates.untrained > 0.657 && originalRates.untrained < 0.658);
  assert.ok(balancedRates.trained > balancedRates.untrained);
});

test('Contrary sound cues map to distinct shipped SFX files with license notice', async () => {
  const { SOUND_CUES } = await import('../public/investigation-file/js/audio.mjs');
  const notice = await read('public/investigation-file/CONTRARY-LICENSE.txt');
  const cues = Object.values(SOUND_CUES);
  assert.ok(new Set(cues).size >= 7, 'different game actions should have distinct cues');
  assert.match(SOUND_CUES.recordSelect, /pop\.mp3$/);
  assert.match(SOUND_CUES.clipAttach, /woosh\.mp3$/);
  assert.match(SOUND_CUES.success, /win\.mp3$/);
  assert.match(SOUND_CUES.failure, /lose\.mp3$/);
  for (const cue of cues) await readFile(path.join(root, 'public/investigation-file/audio', cue));
  assert.match(notice, /MIT License/);
});

test('owner-scoped progress distinguishes an attempt from either ending', async () => {
  const { saveKey, beginRun, finishRun, readRun } = await import('../public/investigation-file/js/persistence.mjs');
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  beginRun('user-a', storage);
  assert.equal(readRun('user-a', storage).status, 'in-progress');
  assert.equal(readRun('user-b', storage).status, 'new');
  finishRun('user-a', 'failure', storage);
  assert.deepEqual(readRun('user-a', storage), { version: 1, status: 'completed', outcome: 'failure' });
  assert.equal(saveKey('user-a'), 'the-analyst:investigation-file:v1:user-a');
});

test('the public game bundle has no Flask template dependencies', async () => {
  const html = await read('public/investigation-file/index.html');
  assert.match(html, /\/investigation-file\/css\/investigation\.css/);
  assert.match(html, /\/investigation-file\/js\/investigation\.mjs/);
  assert.doesNotMatch(html, /url_for\(|\{\{\s*static/);
});
