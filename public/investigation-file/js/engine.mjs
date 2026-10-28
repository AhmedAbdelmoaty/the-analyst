import { records, share, originalRates, balancedRates } from './case-data.mjs';

export const isFairPair = ids => {
  if (!Array.isArray(ids) || ids.length !== 2 || ids[0] === ids[1]) return false;
  const [a, b] = ids.map(id => records.find(r => r.id === id));
  return Boolean(a && b && a.level === b.level && a.attended !== b.attended);
};

export const evidenceComplete = evidence => {
  const pairs = evidence.pairs || [];
  const levels = pairs.map(ids => records.find(r => r.id === ids[0])?.level);
  return pairs.length === 2 && pairs.every(isFairPair) && new Set(levels).size === 2 &&
    evidence.trainedDominant === 'senior' && evidence.untrainedDominant === 'junior' &&
    evidence.sawOriginal === true && evidence.sawBalanced === true &&
    originalRates.trained < originalRates.untrained && balancedRates.trained > balancedRates.untrained &&
    share(true, 'senior') > share(false, 'senior');
};

export const resolveVerdict = (evidence, verdict) => evidenceComplete(evidence) && verdict === 'pause-review' ? 'success' : 'failure';
