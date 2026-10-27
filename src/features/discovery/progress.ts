import { readPFGameSnapshot } from '@/lib/pf-game-persistence';
import { inspectRun } from '@/features/reward-decision/engine/persistence';
import { loadState, sessionKey as behindDotsSessionKey } from '@/features/behind-the-dots/engine/persistence';
import type { GameId } from './catalog';

export type GameProgressStatus = 'new' | 'in-progress' | 'completed';
export interface GameProgress { status: GameProgressStatus; hint?: string }

const CRACK_LEVELS = 3;
const DECISION_MATRIX_LEVELS = 2;
const BEHIND_DOTS_CHALLENGES = 4;
const validObject = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const arabicNumber = (value: number) => String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]!);
const readJson = (storage: Pick<Storage, 'getItem'>, key: string): Record<string, unknown> | null => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return validObject(parsed) ? parsed : null;
  } catch { return null; }
};

function problemFraming(uid: string): GameProgress {
  const snapshot = readPFGameSnapshot(uid);
  if (!snapshot) return { status: 'new' };
  if (snapshot.screen === 'result' && snapshot.gameState.outcome) return { status: 'completed' };
  return { status: 'in-progress' };
}

function rewardDecision(uid: string): GameProgress {
  const inspected = inspectRun(uid);
  if (inspected.status !== 'ok' || inspected.run.phase === 'cover') return { status: 'new' };
  return { status: inspected.run.phase === 'debrief' ? 'completed' : 'in-progress' };
}

function behindTheDots(uid: string, storage: Storage): GameProgress {
  const raw = readJson(storage, behindDotsSessionKey(uid));
  const validPhases = ['cover', 'briefing', 'tutorial', 'tutorialReady', 'puzzle', 'reveal', 'recommendation', 'recommendationFeedback', 'ending', 'debrief'];
  if (!raw || raw.v !== 6 || typeof raw.phase !== 'string' || !validPhases.includes(raw.phase) || typeof raw.caseIndex !== 'number' || !Number.isInteger(raw.caseIndex) || raw.caseIndex < 0 || raw.caseIndex >= BEHIND_DOTS_CHALLENGES ||
      !validObject(raw.results) || !Array.isArray(raw.evidence) || typeof raw.hearts !== 'number' || !Number.isInteger(raw.hearts) || typeof raw.completed !== 'boolean') return { status: 'new' };
  const state = loadState(storage, uid);
  if (state.completed || state.phase === 'debrief') return { status: 'completed' };
  if (state.phase === 'cover') return { status: 'new' };
  const completed = Object.keys(state.results).filter((id) => /^C[1-4]$/.test(id)).length;
  const challenge = Math.max(1, Math.min(BEHIND_DOTS_CHALLENGES, state.caseIndex + 1));
  const challengeText = `التحدي ${arabicNumber(challenge)} من ${arabicNumber(BEHIND_DOTS_CHALLENGES)}`;
  const completedText = completed ? ` · اكتمل ${completed === 1 ? 'تحدٍ واحد' : `${completed} تحديات`}` : '';
  return { status: 'in-progress', hint: `${challengeText}${completedText}` };
}

function crackTheCode(uid: string, storage: Storage): GameProgress {
  const current = readJson(storage, `analyst-crack-the-code-v2:${uid}`);
  const legacy = current ? null : readJson(storage, `analyst-crack-the-code-v1:${uid}`);
  const saved = current ?? legacy;
  if (!saved) return { status: 'new' };

  const progress = validObject(saved.progress) ? saved.progress : {};
  const completed = [0, 1, 2].filter((level) => {
    const result = progress[level] ?? progress[String(level)];
    return validObject(result) && typeof result.score === 'number' && Number.isFinite(result.score) && result.score > 0;
  }).length;
  if (completed === CRACK_LEVELS) return { status: 'completed' };

  const session = validObject(saved.session) ? saved.session : null;
  const level = session?.level;
  const puzzle = session?.puzzle;
  const resumableSession = typeof level === 'number' && Number.isInteger(level) && level >= 0 && level < CRACK_LEVELS &&
    validObject(puzzle) && puzzle.length === 3 && Array.isArray(puzzle.correctCode) && puzzle.correctCode.length === 3;
  if (!completed && !resumableSession) return { status: 'new' };
  const currentHint = resumableSession ? `الخزنة ${arabicNumber(level + 1)} من ${arabicNumber(CRACK_LEVELS)}` : '';
  const completedHint = completed ? `اكتملت ${completed === 1 ? 'خزنة واحدة' : completed === 2 ? 'خزنتان' : '٣ خزائن'}` : '';
  const hint = [currentHint, completedHint].filter(Boolean).join(' · ');
  return { status: 'in-progress', ...(hint ? { hint } : {}) };
}

function decisionMatrix(uid: string, storage: Storage): GameProgress {
  const key = `theanalyst.decision-matrix.v1.${encodeURIComponent(uid)}`;
  const saved = readJson(storage, key);
  if (!saved || saved.version !== 1 || typeof saved.started !== 'boolean' || !validObject(saved.current) || !Array.isArray(saved.completed)) return { status: 'new' };
  const index = saved.current.index;
  const picks = saved.current.picks;
  // The current runtime accepts old third-case saves and normalizes them to the two-case ending.
  const validCurrent = typeof index === 'number' && Number.isInteger(index) && index >= 0 && index <= DECISION_MATRIX_LEVELS && Array.isArray(picks) &&
    picks.length === (index === DECISION_MATRIX_LEVELS ? 6 : 5);
  if (!validCurrent) return { status: 'new' };
  const completed = [...new Set(saved.completed.filter((item: unknown): item is number => typeof item === 'number' && Number.isInteger(item) && item >= 0 && item < DECISION_MATRIX_LEVELS))].length;
  if (completed === DECISION_MATRIX_LEVELS || index >= DECISION_MATRIX_LEVELS || saved.current.mode === 'finished') return { status: 'completed' };
  if (!saved.started && completed === 0) return { status: 'new' };
  return { status: 'in-progress', ...(completed ? { hint: `اكتملت ${completed === 1 ? 'قضية واحدة' : 'قضيتان'} من ${arabicNumber(DECISION_MATRIX_LEVELS)}` } : {}) };
}

export function getGameProgress(gameId: GameId, userId: string, storage?: Storage): GameProgress {
  if (!userId) return { status: 'new' };
  try {
    const browserStorage = storage ?? globalThis.localStorage;
    switch (gameId) {
      case 'problem-framing': return problemFraming(userId);
      case 'reward-decision': return rewardDecision(userId);
      case 'behind-the-dots': return behindTheDots(userId, browserStorage);
      case 'crack-the-code': return crackTheCode(userId, browserStorage);
      case 'decision-matrix': return decisionMatrix(userId, browserStorage);
    }
  } catch { /* unavailable/corrupt saves are shown as new without changing them */ }
  return { status: 'new' };
}

export function getCatalogAction(status: GameProgressStatus): string {
  if (status === 'completed') return 'عرض النتيجة';
  if (status === 'in-progress') return 'كمّل اللعب';
  return 'ابدأ اللعب';
}
