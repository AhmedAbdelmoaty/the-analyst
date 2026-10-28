const PREFIX = 'the-analyst:investigation-file:v1:';
const OUTCOMES = new Set(['success', 'failure']);

export const saveKey = (userId) => `${PREFIX}${encodeURIComponent(userId)}`;

export function readRun(userId, storage = globalThis.localStorage) {
  if (!userId) return { status: 'new' };
  try {
    const value = JSON.parse(storage.getItem(saveKey(userId)) || 'null');
    if (!value || value.version !== 1 || !['in-progress', 'completed'].includes(value.status)) return { status: 'new' };
    if (value.status === 'completed' && OUTCOMES.has(value.outcome)) {
      const validFailureReason = ['causation', 'unsupported-decision'].includes(value.failureReason) ? value.failureReason : undefined;
      return {
        version: 1,
        status: 'completed',
        outcome: value.outcome,
        ...(value.outcome === 'failure' && validFailureReason ? { failureReason: validFailureReason } : {}),
      };
    }
    return value.status === 'in-progress' ? { version: 1, status: 'in-progress' } : { status: 'new' };
  } catch {
    return { status: 'new' };
  }
}

function writeRun(userId, value, storage) {
  if (!userId) return;
  try { storage.setItem(saveKey(userId), JSON.stringify(value)); } catch { /* Playing remains available when storage is blocked. */ }
}

export function beginRun(userId, storage = globalThis.localStorage) {
  writeRun(userId, { version: 1, status: 'in-progress' }, storage);
}

export function finishRun(userId, outcome, storage = globalThis.localStorage, failureReason) {
  if (!OUTCOMES.has(outcome)) return;
  const validFailureReason = ['causation', 'unsupported-decision'].includes(failureReason) ? failureReason : undefined;
  writeRun(userId, {
    version: 1,
    status: 'completed',
    outcome,
    ...(outcome === 'failure' && validFailureReason ? { failureReason: validFailureReason } : {}),
  }, storage);
}
