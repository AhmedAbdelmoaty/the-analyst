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
  finishRun('user-a', 'failure', storage, 'causation');
  assert.deepEqual(readRun('user-a', storage), { version: 1, status: 'completed', outcome: 'failure', failureReason: 'causation' });
});

test('the public game bundle has no Flask template dependencies', async () => {
  const html = await read('public/investigation-file/index.html');
  assert.match(html, /\/investigation-file\/css\/investigation\.css/);
  assert.match(html, /\/investigation-file\/js\/investigation\.mjs/);
  assert.doesNotMatch(html, /url_for\(|\{\{\s*static/);
});

test('counterfactual mixes update independently and any shared mix reveals the reversal', async () => {
  const { records, originalRates, counterfactualRates } = await import('../public/investigation-file/js/case-data.mjs');
  const at25 = counterfactualRates(0.25, 0.25);
  assert.ok(Math.abs(at25.trained - 0.35) < 1e-12);
  assert.ok(Math.abs(at25.untrained - 0.2625) < 1e-12);
  assert.deepEqual(counterfactualRates(0.5, 0.5), { trained: 0.5, untrained: 0.425 });
  assert.deepEqual(counterfactualRates(0, 1), { trained: 0.2, untrained: 0.75 });
  for (const mix of [0, 0.01, 0.25, 0.5, 6 / 7, 0.99, 1]) {
    const rates = counterfactualRates(mix, mix);
    assert.ok(rates.trained > rates.untrained, `shared mix ${mix} should reverse the aggregate direction`);
  }
  assert.ok(Math.abs(counterfactualRates(0.25, 0).trained - 0.35) < 1e-12);
  assert.equal(counterfactualRates(0.25, 0).untrained, 0.1);
  assert.deepEqual(originalRates, { trained: 0.35, untrained: 460 / 700 });
  assert.deepEqual(records.map(({ promoted, total }) => [promoted, total]), [[80, 100], [450, 600], [60, 300], [10, 100]]);
  assert.throws(() => counterfactualRates(-0.01, 0.5), RangeError);
  assert.throws(() => counterfactualRates(0.5, Number.NaN), RangeError);
});

test('a cautious decision with missing evidence returns requirements instead of a loss', async () => {
  const { resolveVerdict } = await import('../public/investigation-file/js/engine.mjs');
  const result = resolveVerdict({ pairs: [], sawOriginal: false }, 'pause-review', {});
  assert.equal(result.status, 'needs-evidence');
  assert.ok(result.missing.length > 0);
  assert.notEqual(result.status, 'failure');
});

test('the final objection needs both fair comparisons, historic mix, and a valid shared-mix replay', async () => {
  const { resolveVerdict } = await import('../public/investigation-file/js/engine.mjs');
  const evidence = {
    pairs: [['jt', 'ju'], ['st', 'su']],
    sawOriginal: true,
    simulation: { trainedJuniorShare: 0.25, untrainedJuniorShare: 0.25, observed: true },
  };
  const argument = {
    comparisons: ['junior-comparison', 'senior-comparison'],
    composition: 'historical-distribution',
    replay: 'shared-mix-result',
  };
  assert.deepEqual(resolveVerdict(evidence, 'pause-review', argument), { status: 'success' });
  assert.equal(resolveVerdict(evidence, 'cancel-program', argument).status, 'failure');
  assert.equal(resolveVerdict(evidence, 'claim-causation', argument).status, 'failure');
  assert.equal(resolveVerdict(evidence, 'pause-review', { ...argument, composition: 'aggregate-rate' }).status, 'needs-evidence');
  assert.equal(resolveVerdict({ ...evidence, simulation: { ...evidence.simulation, untrainedJuniorShare: 0.85 } }, 'pause-review', argument).status, 'needs-evidence');
  assert.equal(resolveVerdict({ ...evidence, pairs: [['jt', 'su'], ['st', 'ju']] }, 'pause-review', argument).status, 'needs-evidence');
  assert.equal(resolveVerdict({ ...evidence, pairs: [['jt', 'ju'], ['jt', 'ju'], ['st', 'su']] }, 'pause-review', argument).status, 'needs-evidence');
});

test('missing comparison feedback names only the level that was not compared', async () => {
  const { missingObjectionEvidence } = await import('../public/investigation-file/js/engine.mjs');
  const argument = {};
  const seniorOnlyMissing = missingObjectionEvidence({ pairs: [['st', 'su'], []] }, argument);
  assert.ok(seniorOnlyMissing.includes('junior-comparison'));
  assert.ok(!seniorOnlyMissing.includes('senior-comparison'));
  const juniorOnlyMissing = missingObjectionEvidence({ pairs: [[], ['jt', 'ju']] }, argument);
  assert.ok(juniorOnlyMissing.includes('senior-comparison'));
  assert.ok(!juniorOnlyMissing.includes('junior-comparison'));
  const malformedOtherClip = missingObjectionEvidence({ pairs: [['jt', 'ju'], ['jt', 'su']] }, argument);
  assert.ok(malformedOtherClip.includes('senior-comparison'));
  assert.ok(!malformedOtherClip.includes('junior-comparison'));
});
