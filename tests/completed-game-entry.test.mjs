import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('completed catalog entries open the saved ending in the iframe games', async () => {
  const [catalog, crackRoute, crackGame, matrixRoute, matrixGame] = await Promise.all([
    readFile(path.join(root, 'src/pages/Games.tsx'), 'utf8'),
    readFile(path.join(root, 'src/pages/CrackTheCodeRoute.tsx'), 'utf8'),
    readFile(path.join(root, 'public/crack-the-code/game.js'), 'utf8'),
    readFile(path.join(root, 'src/pages/DecisionMatrixRoute.tsx'), 'utf8'),
    readFile(path.join(root, 'public/decision-matrix/app.js'), 'utf8'),
  ]);

  assert.match(catalog, /status === 'completed' \? '\?showResult=1'/);
  assert.match(crackRoute, /showResult \? '\?showResult=1' : ''/);
  assert.match(crackGame, /get\('showResult'\)==='1'&&\[0,1,2\]\.every\(i=>progress\[i\]\)/);
  assert.match(matrixRoute, /showResult \? '\?showResult=1' : ''/);
  assert.match(matrixGame, /if\(showSavedResult&&saved&&state\.completed\.length>=levels\.length\)\{home=false;render\(\);openModal\('finish'\)\}/);
});
