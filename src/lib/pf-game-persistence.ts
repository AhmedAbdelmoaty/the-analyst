import type { PFGameState } from '@/contexts/PFGameContext';
import { readTimeChallenge } from '@/lib/pf-time-challenge';
export const PF_SAVE_VERSION = 2;
export const PF_OLD_SCREEN_KEY = 'pf-game-screen-guest';
export type PFScreen = 'company-briefing' | 'travel' | 'velaro-street' | 'arrival' | 'inquiry' | 'reflection' | 'framing' | 'email-send' | 'mansour-receives' | 'incoming-call' | 'phone-call' | 'result' | 'replay-briefing';
const SCREENS: PFScreen[] = ['company-briefing','travel','velaro-street','arrival','inquiry','reflection','framing','email-send','mansour-receives','incoming-call','phone-call','result'];
/** `roundId` is optional so pre-roundId saves migrate by adopting the current challenge's round. */
export interface PFGameSnapshot {version: 2; screen: PFScreen; gameState: PFGameState; updatedAt: number; roundId?: string}
const keyFor = (userId: string) => `pf-game-save-v2:${userId}`;
const sceneKeyFor = (userId: string) => `pf-scene-v1:${userId}`;

/** Only the tab that owns the round may write saves. */
let writable = true;
export const setSaveWritable = (v: boolean) => { writable = v; };

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
    const challenge = readTimeChallenge(userId);
    if (data.roundId && challenge && data.roundId !== challenge.roundId) return null;
    // Inquiry is saved continuously; a finished inquiry resumes at the next scene.
    if (data.screen === 'inquiry' && data.gameState.isComplete) data.screen = 'reflection';
    if (data.screen === 'framing' && data.gameState.framingSubmitted) data.screen = 'email-send';
    if (['reflection','framing','email-send','mansour-receives','incoming-call','phone-call','result'].includes(data.screen) && !data.gameState.isComplete) return null;
    if (['email-send','mansour-receives','incoming-call','phone-call','result'].includes(data.screen) && !data.gameState.framingSubmitted) return null;
    if (data.screen === 'inquiry' && data.gameState.questionsUsed > 0 && !data.gameState.gameStartedAt) return null;
    if (data.screen === 'result' && !data.gameState.outcome) return null;
    return data;
  } catch { return null; }
}
export function writePFGameSnapshot(userId: string, screen: PFScreen, gameState: PFGameState, roundId?: string) {
  if (!writable || !userId) return;
  try { localStorage.setItem(keyFor(userId), JSON.stringify({version: PF_SAVE_VERSION, screen, gameState, roundId, updatedAt: Date.now()})); } catch { /* storage unavailable */ }
}
export function clearPFGameSnapshot(userId: string) {
  try { localStorage.removeItem(keyFor(userId)); localStorage.removeItem(sceneKeyFor(userId)); localStorage.removeItem(PF_OLD_SCREEN_KEY); localStorage.removeItem('pf-game-save-v1-guest'); } catch { /* storage unavailable */ }
}

// ---- Per-screen progress (dialogue line, report step, pending inquiry answer) ----
// Scoped to `${roundId}|${screen}` so progress never leaks into another scene or round.
let scope = { uid: '', tag: '' };
export function setSceneScope(uid: string, tag: string) { scope = { uid, tag }; }
export function readSceneProgress<T>(key: string): T | undefined {
  if (!scope.uid) return undefined;
  try {
    const raw = localStorage.getItem(sceneKeyFor(scope.uid));
    if (!raw) return undefined;
    const d = JSON.parse(raw) as { tag: string; data: Record<string, unknown> };
    return d.tag === scope.tag ? (d.data[key] as T) : undefined;
  } catch { return undefined; }
}
export function writeSceneProgress(key: string, value: unknown) {
  if (!writable || !scope.uid) return;
  try {
    const raw = localStorage.getItem(sceneKeyFor(scope.uid));
    let d = raw ? (JSON.parse(raw) as { tag: string; data: Record<string, unknown> }) : null;
    if (!d || d.tag !== scope.tag) d = { tag: scope.tag, data: {} };
    d.data[key] = value;
    localStorage.setItem(sceneKeyFor(scope.uid), JSON.stringify(d));
  } catch { /* storage unavailable */ }
}
