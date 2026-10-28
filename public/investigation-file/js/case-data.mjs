// Case 3, Scenarios - HR Analysis - updated.docx. Counts are historical, never randomized.
export const records = Object.freeze([
  Object.freeze({ id: 'jt', level: 'junior', attended: true, promoted: 80, total: 100 }),
  Object.freeze({ id: 'ju', level: 'junior', attended: false, promoted: 450, total: 600 }),
  Object.freeze({ id: 'st', level: 'senior', attended: true, promoted: 60, total: 300 }),
  Object.freeze({ id: 'su', level: 'senior', attended: false, promoted: 10, total: 100 }),
]);

export const rate = record => record.promoted / record.total;
export const aggregate = attended => records.filter(r => r.attended === attended).reduce(
  (a, r) => ({ promoted: a.promoted + r.promoted, total: a.total + r.total }),
  { promoted: 0, total: 0 }
);
export const share = (attended, level) => {
  const group = records.find(r => r.attended === attended && r.level === level);
  return group.total / aggregate(attended).total;
};
export const weightedRate = (attended, juniorShare) => {
  const junior = records.find(r => r.attended === attended && r.level === 'junior');
  const senior = records.find(r => r.attended === attended && r.level === 'senior');
  return juniorShare * rate(junior) + (1 - juniorShare) * rate(senior);
};
export const counterfactualRates = (trainedJuniorShare, untrainedJuniorShare) => {
  for (const share of [trainedJuniorShare, untrainedJuniorShare]) {
    if (!Number.isFinite(share) || share < 0 || share > 1) throw new RangeError('Group shares must be finite values from 0 to 1.');
  }
  return Object.freeze({
    trained: weightedRate(true, trainedJuniorShare),
    untrained: weightedRate(false, untrainedJuniorShare),
  });
};
export const originalRates = Object.freeze({ trained: rate(aggregate(true)), untrained: rate(aggregate(false)) });
export const balancedRates = Object.freeze({ trained: weightedRate(true, .5), untrained: weightedRate(false, .5) });
