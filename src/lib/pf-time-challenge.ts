/**
 * Round time challenge — counts ACTIVE play time only.
 * Persisted per user as remaining milliseconds plus the instant it last started
 * running; paused time is never deducted and a reload never grants new time.
 */
export const TIME_CHALLENGE_DURATION_MS = 7 * 60 * 1000;

export type TimeChallengeStatus = "active" | "submitted" | "expired";
export interface TimeChallenge {
  version: 2;
  roundId: string;
  /** Remaining ms at `runningSince` (or frozen value while paused). */
  remainingMs: number;
  /** Epoch ms when the clock last started running; null = paused. */
  runningSince: number | null;
  status: TimeChallengeStatus;
  submittedAt?: number;
}

const keyFor = (userId: string) => `pf-time-challenge-v2:${userId}`;
const legacyKeyFor = (userId: string) => `pf-time-challenge-v1:${userId}`;
/** Minimum time granted to a migrated legacy round whose wall-clock deadline already passed. */
const LEGACY_GRACE_MS = 60 * 1000;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribeTimeChallenge(fn: () => void) {
  listeners.add(fn);
  // Another tab pausing the shared clock must refresh this tab's view too.
  const onStorage = (e: StorageEvent) => { if (e.key?.startsWith("pf-time-challenge-")) fn(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); window.removeEventListener("storage", onStorage); };
}

export const challengeStorageKey = keyFor;

export function remainingMs(c: TimeChallenge, now = Date.now()): number {
  const r = c.runningSince == null ? c.remainingMs : c.remainingMs - (now - c.runningSince);
  return Math.max(0, r);
}

function migrateLegacy(userId: string): TimeChallenge | null {
  try {
    const raw = localStorage.getItem(legacyKeyFor(userId));
    if (!raw) return null;
    const d = JSON.parse(raw) as { roundId?: string; deadline?: number; status?: TimeChallengeStatus; submittedAt?: number };
    if (typeof d.deadline !== "number" || !d.status) return null;
    const c: TimeChallenge = {
      version: 2,
      roundId: d.roundId || newRoundId(),
      remainingMs: d.status === "active" ? Math.min(TIME_CHALLENGE_DURATION_MS, Math.max(LEGACY_GRACE_MS, d.deadline - Date.now())) : 0,
      runningSince: null,
      status: d.status,
      submittedAt: d.submittedAt,
    };
    localStorage.setItem(keyFor(userId), JSON.stringify(c));
    localStorage.removeItem(legacyKeyFor(userId));
    return c;
  } catch { return null; }
}

export function readTimeChallenge(userId: string): TimeChallenge | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return migrateLegacy(userId);
    const d = JSON.parse(raw) as TimeChallenge;
    if (d.version !== 2 || typeof d.remainingMs !== "number" || typeof d.roundId !== "string" || !["active", "submitted", "expired"].includes(d.status)) return null;
    return d;
  } catch { return null; }
}

function write(userId: string, c: TimeChallenge | null, notify = true) {
  try {
    if (c) localStorage.setItem(keyFor(userId), JSON.stringify(c));
    else { localStorage.removeItem(keyFor(userId)); localStorage.removeItem(legacyKeyFor(userId)); }
  } catch { /* storage unavailable */ }
  if (notify) emit();
}

export function newRoundId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Starts a fresh round (running) with the full duration. */
export function startTimeChallenge(userId: string): TimeChallenge {
  const c: TimeChallenge = { version: 2, roundId: newRoundId(), remainingMs: TIME_CHALLENGE_DURATION_MS, runningSince: Date.now(), status: "active" };
  write(userId, c);
  return c;
}

/** A saved round from before the timer existed gets a paused full-length challenge. */
export function adoptLegacyRound(userId: string): TimeChallenge {
  const c: TimeChallenge = { version: 2, roundId: newRoundId(), remainingMs: TIME_CHALLENGE_DURATION_MS, runningSince: null, status: "active" };
  write(userId, c);
  return c;
}

export function clearTimeChallenge(userId: string) { write(userId, null); }

export function pauseTimeChallenge(userId: string, now = Date.now()) {
  const c = readTimeChallenge(userId);
  if (!c || c.status !== "active" || c.runningSince == null) return;
  write(userId, { ...c, remainingMs: remainingMs(c, now), runningSince: null });
}

export function resumeTimeChallenge(userId: string, now = Date.now()) {
  const c = readTimeChallenge(userId);
  if (!c || c.status !== "active" || c.runningSince != null) return;
  if (c.remainingMs <= 0) { write(userId, { ...c, status: "expired" }); return; }
  write(userId, { ...c, runningSince: now });
}

/** Silent checkpoint of the running clock so a crash loses at most one beat. */
export function heartbeatTimeChallenge(userId: string, now = Date.now()) {
  const c = readTimeChallenge(userId);
  if (!c || c.status !== "active" || c.runningSince == null) return;
  write(userId, { ...c, remainingMs: remainingMs(c, now), runningSince: now }, false);
}

/** After a reload a "running" record means the page died mid-play: freeze it at its last checkpoint. */
export function freezeAfterReload(userId: string) {
  const c = readTimeChallenge(userId);
  if (!c || c.status !== "active" || c.runningSince == null) return;
  write(userId, { ...c, runningSince: null });
}

/** Expire the challenge if its active time is used up. Returns true when expired. */
export function checkTimeChallengeExpiry(userId: string, now = Date.now()): boolean {
  const c = readTimeChallenge(userId);
  if (!c) return false;
  if (c.status === "expired") return true;
  if (c.status === "active" && remainingMs(c, now) <= 0) {
    write(userId, { ...c, remainingMs: 0, runningSince: null, status: "expired" });
    return true;
  }
  return false;
}

/**
 * Accept a report submission using the active time remaining at the acceptance
 * instant, so submission and expiry are mutually exclusive.
 * Rounds without a challenge (legacy saves) are always accepted.
 */
export function submitTimeChallenge(userId: string, now = Date.now()): boolean {
  const c = readTimeChallenge(userId);
  if (!c) return true;
  if (c.status === "submitted") return true;
  if (c.status === "expired") return false;
  const left = remainingMs(c, now);
  if (left <= 0) {
    write(userId, { ...c, remainingMs: 0, runningSince: null, status: "expired" });
    return false;
  }
  write(userId, { ...c, remainingMs: left, runningSince: null, status: "submitted", submittedAt: now });
  return true;
}

// ---- Stop every playing media element (voiceover, ambience, effects) ----
const tracked = new Set<HTMLMediaElement>();
if (typeof HTMLMediaElement !== "undefined" && !(HTMLMediaElement.prototype as unknown as { __pfTracked?: boolean }).__pfTracked) {
  const originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    tracked.add(this);
    return originalPlay.call(this);
  };
  (HTMLMediaElement.prototype as unknown as { __pfTracked?: boolean }).__pfTracked = true;
}

export function stopAllMedia() {
  tracked.forEach((m) => { try { m.pause(); } catch { /* noop */ } });
  tracked.clear();
  document.querySelectorAll("audio,video").forEach((m) => { try { (m as HTMLMediaElement).pause(); } catch { /* noop */ } });
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
}
