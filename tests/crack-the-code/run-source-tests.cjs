const { spawnSync } = require('node:child_process');
const path = require('node:path');

const gameRoot = path.resolve(__dirname, '../../public/crack-the-code');
const testFiles = [
  'test.cjs',
  'test-effects.cjs',
  'test-intro-audio.cjs',
  'test-vault-voice.cjs',
  'test-validation-logic.cjs',
];

for (const file of testFiles) {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'source', file)], {
    cwd: gameRoot,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
