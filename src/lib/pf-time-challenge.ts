/**
 * Round time challenge — independent of the result-duration metric (gameStartedAt).
 * Stored per user; time is always derived from a persisted absolute deadline.
 */
export const TIME_CHALLENGE_DURATION_MS = 7 * 60 * 1000;

export type TimeChallengeStatus = "active" | "submitted" | "expired";
export interface TimeChallenge {
  version: 1;
  roundId: string;
  deadline: number;
  status: TimeChallengeStatus;
  submittedAt?: number;
}

const keyFor = (userId: string) => `pf-time-challenge-v1:${userId}`;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribeTimeChallenge(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function readTimeChallenge(userId: string): TimeChallenge | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const d = JSON.parse(raw) as TimeChallenge;
    if (d.version !== 1 || typeof d.deadline !== "number" || !["active", "submitted", "expired"].includes(d.status)) return null;
    return d;
  } catch { return null; }
}

function write(userId: string, c: TimeChallenge | null) {
  try {
    if (c) localStorage.setItem(keyFor(userId), JSON.stringify(c));
    else localStorage.removeItem(keyFor(userId));
  } catch { /* storage unavailable */ }
  emit();
}

export function startTimeChallenge(userId: string): TimeChallenge {
  const c: TimeChallenge = {
    version: 1,
    roundId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    deadline: Date.now() + TIME_CHALLENGE_DURATION_MS,
    status: "active",
  };
  write(userId, c);
  return c;
}

export function clearTimeChallenge(userId: string) { write(userId, null); }

/** Expire the challenge if its real deadline has passed. Returns true when expired. */
export function checkTimeChallengeExpiry(userId: string, now = Date.now()): boolean {
  const c = readTimeChallenge(userId);
  if (!c) return false;
  if (c.status === "expired") return true;
  if (c.status === "active" && now >= c.deadline) {
    write(userId, { ...c, status: "expired" });
    return true;
  }
  return false;
}

/**
 * Accept a report submission. Compares the acceptance instant against the real
 * deadline, so submission and expiry are mutually exclusive.
 * Rounds without a challenge (legacy saves) are always accepted.
 */
export function submitTimeChallenge(userId: string, now = Date.now()): boolean {
  const c = readTimeChallenge(userId);
  if (!c) return true;
  if (c.status === "submitted") return true;
  if (c.status === "expired") return false;
  if (now >= c.deadline) {
    write(userId, { ...c, status: "expired" });
    return false;
  }
  write(userId, { ...c, status: "submitted", submittedAt: now });
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
