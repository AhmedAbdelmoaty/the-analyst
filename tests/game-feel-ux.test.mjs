import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Problem Framing exposes an accessible way to finish a typing dialogue line', async () => {
  const source = await readFile(path.join(root, 'src/components/game/EnhancedDialogue.tsx'), 'utf8');
  const typingControl = source.match(/\{isTyping && \([\s\S]*?\n              \)\}/)?.[0];
  assert.ok(typingControl, 'typing state should render a dedicated action');
  assert.match(typingControl, /إظهار النص كاملًا/);
  assert.match(typingControl, /onClick=\{handleNext\}/);
});

test('Decision Matrix labels the intro action according to whether the line is still typing', async () => {
  const source = await readFile(path.join(root, 'public/decision-matrix/app.js'), 'utf8');
  const dialogue = source.match(/function dialogueView\(\)\{[\s\S]*?\nfunction investigateView/);
  const label = source.match(/function introNextLabel\(\)\{[^\n]+/);
  assert.ok(dialogue && label, 'dialogue actions should remain in the game-local renderer');
  const context = {
    c: () => ({ line: 0 }),
    level: () => ({ intro: [['sara', 'نص الحوار']], meeting: false }),
    characters: { sara: { name: 'سارة', role: 'مديرة' } },
    typingDone: false,
    avatar: () => '',
    esc: (value) => value,
    btn: (_action, label) => `<button>${label}</button>`,
    icon: () => '',
  };
  vm.runInNewContext(`${label[0]}\n${dialogue[0].replace(/\nfunction investigateView[\s\S]*$/, '')}\nglobalThis.renderDialogue = dialogueView;`, context);
  assert.match(context.renderDialogue(), /إظهار النص كاملًا/);
  context.typingDone = true;
  assert.match(context.renderDialogue(), /افتح التحقيق/);
});

test('Crack the Code defaults to device motion preference while saved preference wins', async () => {
  const source = await readFile(path.join(root, 'public/crack-the-code/game.js'), 'utf8');
  const preferences = source.match(/let prefs=(\{lang:'ar',[\s\S]*?\.\.\.saved\.prefs\})/);
  assert.ok(preferences, 'game should keep its current saved preference object');
  const init = `globalThis.motion = (${preferences[1]}).motion;`;
  const prefersReduced = { window: { matchMedia: () => ({ matches: true }) } };
  const reducedDefault = { ...prefersReduced, saved: {} };
  vm.runInNewContext(init, reducedDefault);
  const savedOverride = { ...prefersReduced, saved: { prefs: { motion: true } } };
  vm.runInNewContext(init, savedOverride);
  assert.equal(reducedDefault.motion, false);
  assert.equal(savedOverride.motion, true);
});

test('Reward Decision retains its existing full-text dialogue control', async () => {
  const source = await readFile(path.join(root, 'src/features/reward-decision/components/DialoguePanel.tsx'), 'utf8');
  assert.match(source, /onVisible\(parts\.length\)/);
  assert.match(source, /aria-label="إظهار النص كاملًا"/);
});
