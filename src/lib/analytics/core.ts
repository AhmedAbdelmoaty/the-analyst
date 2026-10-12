/** Pure statistics helpers (no network), shared by the trackers and tests. */
export const VISIT_IDLE_MS = 30 * 60 * 1000;
export const VISIT_PING_MS = 60 * 1000;

export interface VisitState {
  visitId: string;
  segmentId: string;
  /** Account id, or "anon" for a signed-out segment. */
  owner: string;
  /** Random proof for anonymous segments (only its hash is stored on the server). */
  secret: string | null;
  lastActive: number;
  sentAt: number;
}

const rand = () => crypto.randomUUID();
const secret = () => `${rand()}${rand()}`.replace(/-/g, "");

/** Pure transition: decides whether activity continues the visit/segment or opens new ones. */
export function nextVisitState(prev: VisitState | null, owner: string, now: number, gen: () => string = rand, genSecret: () => string = secret) {
  if (!prev || now - prev.lastActive > VISIT_IDLE_MS || now < prev.lastActive - VISIT_IDLE_MS) {
    return { state: { visitId: gen(), segmentId: gen(), owner, secret: owner === "anon" ? genSecret() : null, lastActive: now, sentAt: 0 }, newVisit: true, newSegment: true };
  }
  if (prev.owner !== owner) {
    return { state: { ...prev, segmentId: gen(), owner, secret: owner === "anon" ? genSecret() : null, lastActive: now, sentAt: 0 }, newVisit: false, newSegment: true };
  }
  return { state: { ...prev, lastActive: Math.max(prev.lastActive, now) }, newVisit: false, newSegment: false };
}


export type GameKey = "problem-framing" | "reward-decision";
export type RoundEventType = "start" | "stage" | "submit" | "complete" | "timeout";
export interface RoundEvent {
  event_id: string;
  game: GameKey;
  round_id: string;
  type: RoundEventType;
  revision: number;
  stage?: string;
  active_ms?: number;
  payload?: Record<string, unknown>;
}

const MAX_QUEUE = 300;
/** Stage-only events may be dropped when the queue is full; final events are always kept. */
export function enqueue(q: RoundEvent[], ev: RoundEvent): RoundEvent[] {
  const next = [...q, ev];
  while (next.length > MAX_QUEUE) {
    const i = next.findIndex(e => e.type === "stage");
    if (i < 0) break;
    next.splice(i, 1);
  }
  return next;
}

