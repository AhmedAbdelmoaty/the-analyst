import { finishPlanStep, onboardingStage, clearSelectedGame } from './journey';
import { clearPlanIntent, type PlanIntent } from '../subscription/planIntent';

// Owner-scoped navigation checkpoint only. Never read by payment/access code.
type Checkpoint = { stage: 'plans' | 'setup'; plan?: PlanIntent };
const memory = new Map<string, Checkpoint>();
const key = (owner: string) => `analyst-onboarding-v2:${owner}`;
function save(owner: string, value: Checkpoint | null) {
  if (value) memory.set(owner, value); else memory.delete(owner);
  try {
    if (value) localStorage.setItem(key(owner), JSON.stringify(value));
    else localStorage.removeItem(key(owner));
  } catch { /* Restricted storage: session navigation still works. */ }
}
export function onboardingFor(owner: string): Checkpoint | null {
  if (onboardingStage() === 'plans') {
    save(owner, { stage: 'plans' }); finishPlanStep();
  }
  try {
    const value = JSON.parse(localStorage.getItem(key(owner)) ?? 'null');
    if (value?.stage === 'plans') return { stage: 'plans' };
    if (value?.stage === 'setup' && ['free', 'annual'].includes(value.plan)) return { stage: 'setup', plan: value.plan };
  } catch { /* Memory fallback below. */ }
  return memory.get(owner) ?? null;
}
export function chooseOnboardingPlan(owner: string, plan: PlanIntent) {
  if (onboardingFor(owner)) save(owner, { stage: 'setup', plan });
  finishPlanStep();
}
export function finishOnboarding(owner: string): string | null {
  const checkpoint = onboardingFor(owner);
  if (!checkpoint || checkpoint.stage !== 'setup') return null;
  save(owner, null); clearSelectedGame(); clearPlanIntent();
  return checkpoint.plan === 'annual' ? '/subscription/summary' : '/app';
}
