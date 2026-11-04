export const resolveVerdict = (decision, justification) => {
  if (!decision || !justification) return { status: 'needs-choice' };
  if (decision !== 'pause-review' || justification !== 'composition') {
    return { status: 'failure', reason: justification === 'causation' || decision === 'claim-causation' ? 'causation' : justification === 'aggregate' ? 'aggregate' : 'unsupported-decision' };
  }
  return { status: 'success' };
};
