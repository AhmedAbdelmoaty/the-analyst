import { records, share, counterfactualRates } from './case-data.mjs';

export const isFairPair = ids => {
  if (!Array.isArray(ids) || ids.length !== 2 || ids[0] === ids[1]) return false;
  const [a, b] = ids.map(id => records.find(r => r.id === id));
  return Boolean(a && b && a.level === b.level && a.attended !== b.attended);
};

export const hasSupportingComparisons = pairs => Array.isArray(pairs) && pairs.length === 2 &&
  pairs.every(isFairPair) && new Set(pairs.map(ids => records.find(r => r.id === ids[0]).level)).size === 2;

export const assessExperiment = snapshot => {
  if (!snapshot?.interpretation) return { status: 'uninterpreted' };
  const trainedShare = snapshot.trainedShare;
  const untrainedShare = snapshot.untrainedShare;
  const changed = Math.abs(trainedShare - share(true, 'junior')) > 1e-9 ||
    Math.abs(untrainedShare - share(false, 'junior')) > 1e-9;
  const calculated = counterfactualRates(trainedShare, untrainedShare);
  const ratesMatch = Math.abs(calculated.trained - snapshot.trainedRate) < 1e-9 &&
    Math.abs(calculated.untrained - snapshot.untrainedRate) < 1e-9;
  if (!ratesMatch) return { status: 'invalid' };
  const supported = changed ? 'composition-impact' : 'unchanged';
  return { status: snapshot.interpretation === supported ? 'supported' : 'unsupported', changed };
};

export const resolveVerdict = (evidence, decision, justification) => {
  if (!decision || !justification) return { status: 'needs-choice' };
  if (decision !== 'pause-review' || justification !== 'composition') {
    return { status: 'failure', reason: justification === 'causation' || decision === 'claim-causation' ? 'causation' : justification === 'aggregate' ? 'aggregate' : 'unsupported-decision' };
  }
  if (!hasSupportingComparisons(evidence?.savedPairs)) return { status: 'needs-evidence', missing: ['comparisons'] };
  if (evidence?.snapshot?.interpretation && assessExperiment(evidence.snapshot).status !== 'supported') {
    return { status: 'needs-evidence', missing: ['experiment-interpretation'] };
  }
  return { status: 'success' };
};
