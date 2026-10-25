import { describe, expect, it } from 'bun:test';
import { GAME_CATALOG } from '../src/features/discovery/catalog';
import { selectGame, selectedGame, markSignupCreated, markSignupVerified, finishPlanStep, journeyDestination, onboardingStage } from '../src/features/discovery/journey';
import { decideAccess } from '../src/features/entitlement/access';
function storage() { const values = new Map<string, string>(); return { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } }; }
describe('discovery onboarding rules', () => {
  it('always puts genuinely new verified users through plans, including the free game', () => {
    for (const game of GAME_CATALOG) { const s = storage(); selectGame(game.id, s); markSignupCreated(s); markSignupVerified(s); expect(journeyDestination(false, '/app', s)).toBe('/plans'); expect(selectedGame(s)?.id).toBe(game.id); }
  });
  it('existing login does not manufacture first-time onboarding', () => { const s = storage(); selectGame('decision-matrix', s); markSignupVerified(s); expect(onboardingStage(s)).toBeNull(); expect(journeyDestination(true, '/app', s)).toBe('/games/decision-matrix'); });
  it('keeps the game through plans and profile, consuming only at the destination', () => { const s = storage(); selectGame('reward-decision', s); markSignupCreated(s); markSignupVerified(s); finishPlanStep(s); expect(journeyDestination(false, '/app', s)).toBe('/setup'); expect(selectedGame(s)?.id).toBe('reward-decision'); expect(journeyDestination(true, '/app', s)).toBe('/games/reward-decision'); expect(selectedGame(s)).toBeUndefined(); });
  it('uses the default destination without a selected game', () => { const s = storage(); markSignupCreated(s); markSignupVerified(s); expect(journeyDestination(true, '/app', s)).toBe('/plans'); finishPlanStep(s); expect(journeyDestination(true, '/app', s)).toBe('/app'); });
  it('rejects arbitrary redirect strings', () => { const s = storage(); s.setItem('analyst-selected-game-v1', 'https://evil.invalid'); expect(journeyDestination(true, '/app', s)).toBe('/app'); });
  it('all five games stay open with confirmed development flag OFF regardless of payment', () => { expect(GAME_CATALOG).toHaveLength(5); for (const game of GAME_CATALOG) expect(decideAccess(false, game.tier, false)).toBe('allow'); });
  it('unknown server flag cannot bypass future annual checks', () => { expect(decideAccess(null, 'annual', true)).toBe('verify'); });
});