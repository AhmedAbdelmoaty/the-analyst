import { findGame, type GameId } from './catalog';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const GAME_KEY = 'analyst-selected-game-v1';
const ONBOARD_KEY = 'analyst-onboarding-v1';
const fallback = new Map<string, string>();
function store(s?: Store): Store {
  if (s) return s;
  try { const value = window.sessionStorage; value.getItem(GAME_KEY); return value; } catch {
    return { getItem: key => fallback.get(key) ?? null, setItem: (key, value) => { fallback.set(key, value); }, removeItem: key => { fallback.delete(key); } };
  }
}
function read(key: string, s?: Store) { try { return store(s).getItem(key); } catch { return null; } }
function write(key: string, value: string | null, s?: Store) { try { if (value === null) store(s).removeItem(key); else store(s).setItem(key, value); } catch { /* Navigation only; never grants access. */ } }
export const selectedGame = (s?: Store) => findGame(read(GAME_KEY, s));
export const selectGame = (id: GameId, s?: Store) => write(GAME_KEY, id, s);
export const onboardingStage = (s?: Store) => read(ONBOARD_KEY, s);
export const markSignupCreated = (s?: Store) => write(ONBOARD_KEY, 'verification', s);
export function markSignupVerified(s?: Store) { if (onboardingStage(s) === 'verification') write(ONBOARD_KEY, 'plans', s); }
export const finishPlanStep = (s?: Store) => write(ONBOARD_KEY, null, s);
export function journeyDestination(profileComplete: boolean, defaultRoute = '/app', s?: Store): string {
  if (onboardingStage(s) === 'plans') return '/plans';
  if (!profileComplete) return '/setup';
  const game = selectedGame(s);
  write(GAME_KEY, null, s);
  return game?.route ?? defaultRoute;
}
export function clearJourney(s?: Store) { write(GAME_KEY, null, s); write(ONBOARD_KEY, null, s); }