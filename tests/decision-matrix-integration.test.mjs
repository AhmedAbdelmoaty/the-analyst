import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Decision Matrix uses distinct save and preference keys for each iframe user', async () => {
  const app = await readFile(path.join(root, 'public/decision-matrix/app.js'), 'utf8');
  const declarations = app.match(/const PLAYER_ID=.*?;\r?\nconst SCOPE=.*?;\r?\nconst KEY=.*?;\r?\nconst PREF=.*?;\r?\nconst LEGACY_KEY=.*?;/s)?.[0];
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

test('Decision Matrix preserves an existing account save before writing the replacement format', async () => {
  const app = await readFile(path.join(root, 'public/decision-matrix/app.js'), 'utf8');
  const declarations = app.match(/const PLAYER_ID=.*?;\r?\nconst SCOPE=.*?;\r?\nconst KEY=.*?;\r?\nconst PREF=.*?;\r?\nconst LEGACY_KEY=.*?;/s)?.[0];
  const persistStart = app.indexOf('function persist(){');
  const persistEnd = app.search(/\r?\nfunction toast\(/, persistStart);
  const persist = persistStart >= 0 && persistEnd >= 0 ? app.slice(persistStart, persistEnd) : null;
  assert.ok(declarations && persist, 'game must define scoped storage and a save-preserving writer');

  const data = new Map();
  const context = {
    window: { name: 'player-a' },
    encodeURIComponent,
    localStorage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, String(value)),
    },
    state: { started: true },
    prefs: {},
    saved: false,
    toast: () => {},
  };
  vm.runInNewContext(`${declarations}\n${persist}\nglobalThis.writeSave = persist; globalThis.keys = { KEY, LEGACY_KEY };`, context);
  const original = JSON.stringify({ version: 1, current: { index: 2, notes: 'legacy progress' } });
  data.set(context.keys.KEY, original);
  vm.runInNewContext('writeSave()', context);

  assert.equal(data.get(context.keys.LEGACY_KEY), original);
  assert.notEqual(data.get(context.keys.KEY), original);
});

test('Decision Matrix is the authenticated fifth game and passes its owner to the iframe', async () => {
  const [app, catalog, route] = await Promise.all([
    readFile(path.join(root, 'src/App.tsx'), 'utf8'),
    readFile(path.join(root, 'src/features/discovery/catalog.ts'), 'utf8'),
    readFile(path.join(root, 'src/pages/DecisionMatrixRoute.tsx'), 'utf8'),
  ]);

  assert.equal((catalog.match(/\{ id: '/g) ?? []).length, 5);
  assert.match(catalog, /id: 'decision-matrix'.*route: '\/games\/decision-matrix'.*cover: '\/decision-matrix\/assets\/boardroom-cartoon\.jpg'/);
  assert.match(app, /<Route path="\/games\/decision-matrix" element={<RequireProfile><GameGate game="decision-matrix"><DecisionMatrixRoute \/><\/GameGate><\/RequireProfile>} \/>/);
  assert.match(route, /name=\{user\.id\}/);
  assert.match(route, /src=\{`\/decision-matrix\/index\.html\$\{showResult \? '\?showResult=1' : ''\}`\}/);
  assert.match(route, /to="\/app"/);
});
