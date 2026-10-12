/**
 * Visit sessions for admin statistics.
 * One visit per browser (shared by all tabs) that ends after 30 minutes without activity.
 * A visit is split into owner segments: anonymous, or one per signed-in account. A segment's
 * owner never changes; signing in/out or switching accounts opens a new segment in the same visit.
 */
import { supabase } from "@/integrations/supabase/client";

export const VISIT_IDLE_MS = 30 * 60 * 1000;
export const VISIT_PING_MS = 60 * 1000;
const KEY = "ta-visit-v1";

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

const read = (): VisitState | null => {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as VisitState) : null; } catch { return null; }
};
const write = (s: VisitState) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } };

/** Records activity for the current owner; pings the server at most once a minute per segment. */
export async function touchVisit(userId: string | null, now = Date.now()) {
  const owner = userId ?? "anon";
  const { state } = nextVisitState(read(), owner, now);
  const due = now - state.sentAt >= VISIT_PING_MS;
  if (due) state.sentAt = now;
  write(state);
  if (!due) return;
  try {
    // The server checks the segment's owner against the session (or the secret for anonymous segments).
    await supabase.rpc("track_visit", { _visit_id: state.visitId, _segment_id: state.segmentId, _secret: state.secret ?? undefined });
  } catch { /* statistics never block the app */ }
}
