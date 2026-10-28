import { records, share, originalRates, counterfactualRates } from './case-data.mjs';

export const isFairPair = ids => {
  if (!Array.isArray(ids) || ids.length !== 2 || ids[0] === ids[1]) return false;
  const [a, b] = ids.map(id => records.find(r => r.id === id));
  return Boolean(a && b && a.level === b.level && a.attended !== b.attended);
};

const pairForLevel = (pairs, level) => Array.isArray(pairs) && pairs.length === 2 && pairs.some(ids =>
  isFairPair(ids) && records.find(record => record.id === ids[0])?.level === level
);

const hasValidSharedMix = simulation => {
  if (!simulation || simulation.observed !== true) return false;
  const { trainedJuniorShare, untrainedJuniorShare } = simulation;
  if (!Number.isFinite(trainedJuniorShare) || trainedJuniorShare !== untrainedJuniorShare) return false;
  try {
    const rates = counterfactualRates(trainedJuniorShare, untrainedJuniorShare);
    return originalRates.trained < originalRates.untrained && rates.trained > rates.untrained;
  } catch {
    return false;
  }
};

const sameSet = (value, expected) => Array.isArray(value) && value.length === expected.length &&
  [...value].sort().every((item, index) => item === [...expected].sort()[index]);

export const missingObjectionEvidence = (evidence = {}, argument = {}) => {
  const missing = [];
  if (!pairForLevel(evidence.pairs, 'junior')) missing.push('junior-comparison');
  if (!pairForLevel(evidence.pairs, 'senior')) missing.push('senior-comparison');
  if (evidence.sawOriginal !== true || share(true, 'senior') === share(false, 'senior')) missing.push('historical-distribution');
  if (!hasValidSharedMix(evidence.simulation)) missing.push('shared-mix-result');
  if (!sameSet(argument.comparisons, ['junior-comparison', 'senior-comparison'])) missing.push('argument-comparisons');
  if (argument.composition !== 'historical-distribution') missing.push('argument-composition');
  if (argument.replay !== 'shared-mix-result') missing.push('argument-replay');
  return missing;
};

export const resolveVerdict = (evidence, verdict, argument) => {
  if (verdict !== 'pause-review') {
    return { status: 'failure', reason: verdict === 'claim-causation' ? 'causation' : 'unsupported-decision' };
  }
  const missing = missingObjectionEvidence(evidence, argument);
  return missing.length ? { status: 'needs-evidence', missing } : { status: 'success' };
};
