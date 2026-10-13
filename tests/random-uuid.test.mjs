import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUuid } from '../src/lib/random-uuid.ts';

test('creates a secure UUID on local HTTP when crypto.randomUUID is unavailable', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  let seed = 0;
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { getRandomValues(bytes) { for (let i = 0; i < bytes.length; i++) bytes[i] = seed++; return bytes; } },
  });
  try {
    const first = randomUuid();
    const second = randomUuid();
    assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.notEqual(first, second);
  } finally {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
    else delete globalThis.crypto;
  }
});
