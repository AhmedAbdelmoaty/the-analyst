const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const gameRoot = path.resolve(__dirname, '..', 'public/crack-the-code');
const puzzlesSource = fs.readFileSync(path.join(gameRoot, 'puzzles.js'), 'utf8');
const fullGameSource = fs.readFileSync(path.join(gameRoot, 'game.js'), 'utf8');
const gameSource = fullGameSource.split('function beep')[0];
assert.match(fullGameSource, /class="platform-brand" href="\/app" target="_top" onclick="persist\(\)"/, 'platform logo saves the session and navigates the top-level window to /app');

function loadPlayer(playerId, initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  const context = vm.createContext({
    PUZZLES: undefined,
    window: { name: playerId },
    localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  });
  vm.runInContext(puzzlesSource, context);
  vm.runInContext(gameSource, context);
  return { values, context };
}

const legacyKey = 'analyst-crack-the-code-v1:player-a';
const legacySave = {
  prefs: { lang: 'en', sound: true, volume: 0.7, egyptianCopy: true },
  progress: { 0: { score: 820, time: 32, attempts: 3, hints: 1 }, 1: { score: 700, time: 51, attempts: 4, hints: 2 } },
  tutorialDone: true,
  session: { level: 0, puzzle: { correctCode: [4, 2, 7] }, entry: ['4', '2', ''] },
};
const originalLegacyValue = JSON.stringify(legacySave);
const playerA = loadPlayer('player-a', { [legacyKey]: originalLegacyValue });

assert.equal(vm.runInContext('SAVE_KEY', playerA.context), 'analyst-crack-the-code-v2:player-a');
assert.equal(vm.runInContext('prefs.sound', playerA.context), true);
assert.equal(vm.runInContext('prefs.volume', playerA.context), 0.7);
assert.equal(vm.runInContext('progress[0].score', playerA.context), 820);
assert.equal(vm.runInContext('progress[1].score', playerA.context), 700);
assert.equal(vm.runInContext('tutorialDone', playerA.context), true);
assert.equal(vm.runInContext('migratedLegacySave', playerA.context), true);
assert.equal(vm.runInContext('saved.session', playerA.context), undefined, 'incompatible active puzzle is not resumed');
assert.equal(playerA.values.get(legacyKey), originalLegacyValue, 'legacy save remains intact');

vm.runInContext('persist()', playerA.context);
const migrated = JSON.parse(playerA.values.get('analyst-crack-the-code-v2:player-a'));
assert.equal(migrated.progress[0].score, 820);
assert.equal(migrated.prefs.sound, true);

const playerB = loadPlayer('player-b');
assert.equal(vm.runInContext('progress[0]', playerB.context), undefined, 'another authenticated player starts with separate progress');
assert.equal(vm.runInContext('prefs.sound', playerB.context), false);
vm.runInContext('persist()', playerB.context);
assert.equal(playerB.values.has('analyst-crack-the-code-v2:player-a'), false);
assert.equal(playerA.values.has('analyst-crack-the-code-v2:player-b'), false);

console.log('PASS per-user save isolation, compatible progress migration, and preservation of legacy saves');
