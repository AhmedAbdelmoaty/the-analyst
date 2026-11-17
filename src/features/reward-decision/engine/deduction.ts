import { ANSWER_KEY, QUESTION_ORDER, type Level1Decision, type QuestionId } from '../data/case';
import type { DeductionResult, Level1DecisionResult } from './model';

/** Server parity flag: the rowad-v3 submit event is only sent after the backend evaluator is approved and applied. */
export const SERVER_V3_EVALUATION_ENABLED = false;

export function shuffledOrder<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** Deterministic: only stable answer ids matter, never display order. Mirrors rd_evaluate_v3. */
export function evaluateDeduction(answers: Record<QuestionId, string | null>): DeductionResult {
  const score = QUESTION_ORDER.filter(q => answers[q] === ANSWER_KEY[q]).length as 0 | 1 | 2;
  const success = score === 2;
  return { score, success, outcome: success ? 'supported' : 'insufficient', awardedTeam: success ? 'mahmoud' : 'marwan' };
}

export function evaluateLevel1Decision(decision: Level1Decision): Level1DecisionResult {
  const success = decision === 'defer';
  return { success, score: success ? 100 : 35, outcome: success ? 'supported' : 'insufficient' };
}
