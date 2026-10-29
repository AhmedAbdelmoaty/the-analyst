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

test('V2.1 requires two saved same-level comparisons and a consistent decision with justification', async () => {
  const { resolveVerdict, hasSupportingComparisons } = await import('../public/investigation-file/js/engine.mjs');
  const savedPairs = [['jt', 'ju'], ['st', 'su']];
  assert.equal(hasSupportingComparisons(savedPairs), true);
  assert.deepEqual(resolveVerdict({ savedPairs }, 'pause-review', 'composition'), { status: 'success' });
  assert.equal(resolveVerdict({ savedPairs: [savedPairs[0], []] }, 'pause-review', 'composition').status, 'needs-evidence');
  assert.equal(resolveVerdict({ savedPairs: [['jt', 'su'], savedPairs[1]] }, 'pause-review', 'composition').status, 'needs-evidence');
  assert.equal(resolveVerdict({ savedPairs: [savedPairs[0], savedPairs[0]] }, 'pause-review', 'composition').status, 'needs-evidence');
  assert.equal(resolveVerdict({ savedPairs }, 'pause-review', 'aggregate').status, 'failure');
  assert.equal(resolveVerdict({ savedPairs }, 'cancel-program', 'composition').status, 'failure');
  assert.equal(resolveVerdict({ savedPairs }, 'claim-causation', 'causation').reason, 'causation');
  assert.equal(resolveVerdict({ savedPairs }, 'pause-review', null).status, 'needs-choice');
  assert.equal(resolveVerdict({ savedPairs, simulation: null }, 'pause-review', 'composition').status, 'success');
});

test('experiment notes are checked against the saved hypothetical mix without making a snapshot mandatory', async () => {
  const { assessExperiment, resolveVerdict } = await import('../public/investigation-file/js/engine.mjs');
  const { counterfactualRates, share } = await import('../public/investigation-file/js/case-data.mjs');
  const savedPairs = [['jt', 'ju'], ['st', 'su']];
  const originalShare = share(false, 'junior');
  assert.equal(originalShare, 6 / 7);
  const unchanged = { trainedShare: .25, untrainedShare: originalShare,
    trainedRate: .35, untrainedRate: 460 / 700, interpretation: 'unchanged' };
  assert.equal(assessExperiment(unchanged).status, 'supported');
  const recalculated = counterfactualRates(.4, .65);
  const changed = { trainedShare: .4, untrainedShare: .65,
    trainedRate: recalculated.trained, untrainedRate: recalculated.untrained,
    interpretation: 'composition-impact' };
  assert.equal(assessExperiment(changed).status, 'supported');
  assert.equal(resolveVerdict({ savedPairs, snapshot: changed }, 'pause-review', 'composition').status, 'success');
  assert.equal(resolveVerdict({ savedPairs }, 'pause-review', 'composition').status, 'success');
  changed.interpretation = 'causation';
  assert.deepEqual(resolveVerdict({ savedPairs, snapshot: changed }, 'pause-review', 'composition'),
    { status: 'needs-evidence', missing: ['experiment-interpretation'] });
  changed.interpretation = 'within-rates-change';
  assert.equal(assessExperiment(changed).status, 'unsupported');
});

test('approved Felfel reference and four transparent animation poses are packaged with the game work', async () => {
  const source = await readFile(path.join(root, 'docs/investigation-file/felfel-reference.png'));
  assert.equal(source.subarray(1, 4).toString(), 'PNG');
  for (const pose of ['idle', 'inspect', 'celebrate', 'concerned']) {
    const image = await readFile(path.join(root, `public/investigation-file/assets/felfel/${pose}.png`));
    assert.equal(image.subarray(1, 4).toString(), 'PNG');
    assert.equal(image[25], 6, `${pose} must have an alpha channel`);
    assert.equal(image.readUInt32BE(16), 1024);
    assert.equal(image.readUInt32BE(20), 1536);
  }
});
