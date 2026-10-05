import type { PFGameState } from '@/contexts/PFGameContext';
export const PF_SAVE_VERSION = 2;
export const PF_OLD_SCREEN_KEY = 'pf-game-screen-guest';
export type PFScreen = 'company-briefing' | 'travel' | 'velaro-street' | 'arrival' | 'inquiry' | 'reflection' | 'framing' | 'email-send' | 'mansour-receives' | 'incoming-call' | 'phone-call' | 'result';
const SCREENS: PFScreen[] = ['company-briefing','travel','velaro-street','arrival','inquiry','reflection','framing','email-send','mansour-receives','incoming-call','phone-call','result'];
export interface PFGameSnapshot {version: 2; screen: PFScreen; gameState: PFGameState; updatedAt: number}
const keyFor = (userId: string) => `pf-game-save-v2:${userId}`;
const validState = (s: unknown): s is PFGameState => {
  if (!s || typeof s !== 'object') return false;
  const v = s as Partial<PFGameState>;
  return typeof v.currentNodeId === 'string' && typeof v.questionsUsed === 'number' && v.questionsUsed >= 0 && typeof v.isComplete === 'boolean' &&
    Array.isArray(v.history) && Array.isArray(v.askedTopicIds) && Array.isArray(v.collectedEvidence) && Array.isArray(v.collectedReports) && Array.isArray(v.savedNoteIds) && Array.isArray(v.notes) &&
    typeof v.framing === 'object' && v.framing !== null && typeof v.framingSubmitted === 'boolean' && typeof v.restartCount === 'number' && typeof v.framingCorrectCount === 'number' &&
    (v.gameStartedAt === null || typeof v.gameStartedAt === 'number');
};
export function readPFGameSnapshot(userId: string): PFGameSnapshot | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const data = JSON.parse(raw) as PFGameSnapshot;
    if (data.version !== PF_SAVE_VERSION || !SCREENS.includes(data.screen) || !validState(data.gameState)) return null;
    if (['reflection','framing','email-send','mansour-receives','incoming-call','phone-call','result'].includes(data.screen) && !data.gameState.isComplete) return null;
    if (['email-send','mansour-receives','incoming-call','phone-call','result'].includes(data.screen) && !data.gameState.framingSubmitted) return null;
    if (data.screen === 'inquiry' && data.gameState.isComplete) return null;
    if (data.screen === 'result' && !data.gameState.outcome) return null;
    return data;
  } catch { return null; }
}
export function writePFGameSnapshot(userId: string, screen: PFScreen, gameState: PFGameState) {
  try { localStorage.setItem(keyFor(userId), JSON.stringify({version: PF_SAVE_VERSION, screen, gameState, updatedAt: Date.now()})); } catch { /* storage unavailable */ }
}
export function clearPFGameSnapshot(userId: string) {
  try { localStorage.removeItem(keyFor(userId)); localStorage.removeItem(PF_OLD_SCREEN_KEY); localStorage.removeItem('pf-game-save-v1-guest'); } catch { /* storage unavailable */ }
}
