/**
 * Visit sessions for admin statistics.
 * One visit per browser (shared by all tabs) that ends after 30 minutes without activity.
 * A visit is split into owner segments: anonymous, or one per signed-in account. A segment's
 * owner never changes; signing in/out or switching accounts opens a new segment in the same visit.
 */
import { supabase } from "@/integrations/supabase/client";

import { nextVisitState, VISIT_PING_MS, type VisitState } from "./core";
export { nextVisitState, VISIT_IDLE_MS, VISIT_PING_MS, type VisitState } from "./core";
const KEY = "ta-visit-v1";
const PENDING = "ta-visit-pending-v1";
let flushing = false;
const pending = (): VisitState[] => {
  try { return JSON.parse(localStorage.getItem(PENDING) ?? "[]"); } catch { return []; }
};
const savePending = (states: VisitState[]) => {
  try { localStorage.setItem(PENDING, JSON.stringify(states)); } catch { /* unavailable */ }
};

async function flushVisits(owner: string) {
  if (flushing) return;
  flushing = true;
  try {
    for (const state of pending().filter(s => s.owner === owner)) {
      const { data: session } = await supabase.auth.getSession();
      if ((session.session?.user.id ?? "anon") !== owner) return;
      const { data, error } = await supabase.rpc("track_visit", { _visit_id: state.visitId, _segment_id: state.segmentId, _secret: state.secret ?? undefined });
      if (error || data !== true) return;
      savePending(pending().filter(s => s.segmentId !== state.segmentId || s.lastActive > state.lastActive));
      const current = read();
      if (current?.segmentId === state.segmentId) write({ ...current, sentAt: Date.now() });
    }
  } catch { /* keep pending visits until the next retry */ }
  finally { flushing = false; }
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
  write(state);
  if (due) savePending([...pending().filter(s => s.segmentId !== state.segmentId), state]);
  await flushVisits(owner);
}
