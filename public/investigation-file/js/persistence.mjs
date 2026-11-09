const PREFIX = 'the-analyst:investigation-file:v1:';
const OUTCOMES = new Set(['success', 'failure']);

export const saveKey = (userId) => `${PREFIX}${encodeURIComponent(userId)}`;

export function readRun(userId, storage = globalThis.localStorage) {
  if (!userId) return { status: 'new' };
  try {
    const value = JSON.parse(storage.getItem(saveKey(userId)) || 'null');
    if (!value || value.version !== 1 || !['in-progress', 'completed'].includes(value.status)) return { status: 'new' };
    if (value.status === 'completed' && OUTCOMES.has(value.outcome)) {
      const validFailureReason = ['causation', 'aggregate', 'unsupported-decision'].includes(value.failureReason) ? value.failureReason : undefined;
      return {
        version: 1,
        status: 'completed',
        outcome: value.outcome,
        ...(value.outcome === 'failure' && validFailureReason ? { failureReason: validFailureReason } : {}),
      };
    }
    if (value.status === 'in-progress') {
      const c = value.checkpoint;
      const valid = c && ['intro', 'investigation', 'confrontation'].includes(c.scene)
        && Number.isInteger(c.introStep) && c.introStep >= -1 && c.introStep <= 3
        && Array.isArray(c.selected) && c.selected.length <= 2 && c.selected.every(id => ['jt', 'ju', 'st', 'su'].includes(id))
        && typeof c.labVisited === 'boolean' && Number.isInteger(c.hint) && c.hint >= 0 && c.hint <= 3
        && Number.isFinite(c.trainedMix) && c.trainedMix >= 0 && c.trainedMix <= 1000
        && Number.isFinite(c.untrainedMix) && c.untrainedMix >= 0 && c.untrainedMix <= 1000;
      return { version: 1, status: 'in-progress', ...(valid ? { checkpoint: c } : {}) };
    }
    return { status: 'new' };
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

export function saveCheckpoint(userId, checkpoint, storage = globalThis.localStorage) {
  if (readRun(userId, storage).status === 'completed') return;
  writeRun(userId, { version: 1, status: 'in-progress', checkpoint }, storage);
}

export function finishRun(userId, outcome, storage = globalThis.localStorage, failureReason) {
  if (!OUTCOMES.has(outcome)) return;
  const validFailureReason = ['causation', 'aggregate', 'unsupported-decision'].includes(failureReason) ? failureReason : undefined;
  writeRun(userId, {
    version: 1,
    status: 'completed',
    outcome,
    ...(outcome === 'failure' && validFailureReason ? { failureReason: validFailureReason } : {}),
  }, storage);
}
