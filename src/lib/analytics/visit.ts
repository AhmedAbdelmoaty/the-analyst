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
