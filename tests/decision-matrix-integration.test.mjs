import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Decision Matrix uses distinct save and preference keys for each iframe user', async () => {
  const app = await readFile(path.join(root, 'public/decision-matrix/app.js'), 'utf8');
  const declarations = app.match(/const PLAYER_ID=.*?;\nconst SCOPE=.*?;\nconst KEY=.*?;\nconst PREF=.*?;/s)?.[0];
  assert.ok(declarations, 'game storage keys must be derived from the iframe user name');

  const keysFor = (name) => {
    const context = { window: { name }, encodeURIComponent };
    vm.runInNewContext(`${declarations}\nglobalThis.keys = { KEY, PREF };`, context);
    return context.keys;
  };

  const first = keysFor('player-a');
  const second = keysFor('player-b');
  assert.notEqual(first.KEY, second.KEY);
  assert.notEqual(first.PREF, second.PREF);
  assert.match(first.KEY, /player-a$/);
  assert.match(first.PREF, /player-a$/);
});

test('Decision Matrix is the authenticated fifth game and passes its owner to the iframe', async () => {
  const [app, games, route] = await Promise.all([
    readFile(path.join(root, 'src/App.tsx'), 'utf8'),
    readFile(path.join(root, 'src/pages/Games.tsx'), 'utf8'),
    readFile(path.join(root, 'src/pages/DecisionMatrixRoute.tsx'), 'utf8'),
  ]);

  assert.equal((games.match(/<article\b/g) ?? []).length, 5);
  assert.match(games, /مصفوفة القرار — أول يوم في الشركة/);
  assert.match(games, /navigate\('\/games\/decision-matrix'\)/);
  assert.match(app, /<Route path="\/games\/decision-matrix" element={<RequireProfile><DecisionMatrixRoute \/><\/RequireProfile>} \/>/);
  assert.match(route, /name=\{user\.id\}/);
  assert.match(route, /src="\/decision-matrix\/index\.html"/);
  assert.match(route, /to="\/app"/);
});
