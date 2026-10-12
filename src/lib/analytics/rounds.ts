/**
 * Round events for admin statistics: start, stage, submit, complete, timeout.
 * Each event has a stable id (server de-duplicates), and events wait in a per-account queue
 * that is only sent while that same account is signed in — activity never moves between accounts.
 */
import { supabase } from "@/integrations/supabase/client";

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
const queueKey = (uid: string) => `ta-rq-v1:${uid}`;
let seq = 0;
/** Monotonic per device: later stage updates always carry a higher revision. */
export const nextRevision = (now = Date.now()) => now * 1000 + (seq = (seq + 1) % 1000);

export function readQueue(uid: string): RoundEvent[] {
  try { const raw = localStorage.getItem(queueKey(uid)); const q = raw ? JSON.parse(raw) : []; return Array.isArray(q) ? q : []; } catch { return []; }
}
function writeQueue(uid: string, q: RoundEvent[]) {
  try { if (q.length) localStorage.setItem(queueKey(uid), JSON.stringify(q)); else localStorage.removeItem(queueKey(uid)); } catch { /* storage unavailable */ }
}
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

export function trackRound(uid: string, ev: Omit<RoundEvent, "event_id" | "revision">) {
  if (!uid || !ev.round_id) return;
  const active = ev.active_ms == null || !Number.isFinite(ev.active_ms) ? undefined : Math.max(0, Math.round(ev.active_ms));
  writeQueue(uid, enqueue(readQueue(uid), { ...ev, active_ms: active, event_id: crypto.randomUUID(), revision: nextRevision() }));
  void flushRounds(uid);
}

const flushing = new Set<string>();
const retry = new Map<string, number>();
const attempts = new Map<string, number>();

export async function flushRounds(uid: string): Promise<void> {
  if (!uid || flushing.has(uid)) return;
  flushing.add(uid);
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.id !== uid) return; // another account (or none): keep events for their owner
    for (const ev of readQueue(uid)) {
      const { error } = await supabase.rpc("track_round_event", {
        _event_id: ev.event_id, _game: ev.game, _round_id: ev.round_id, _type: ev.type, _revision: ev.revision,
        _stage: ev.stage, _active_ms: ev.active_ms, _payload: (ev.payload ?? {}) as never,
      });
      if (error && error.code !== "22023") throw error; // invalid events are dropped, others retried
      writeQueue(uid, readQueue(uid).filter(e => e.event_id !== ev.event_id));
    }
    attempts.delete(uid);
  } catch {
    const n = (attempts.get(uid) ?? 0) + 1;
    attempts.set(uid, n);
    window.clearTimeout(retry.get(uid));
    retry.set(uid, window.setTimeout(() => void flushRounds(uid), Math.min(60000, 2000 * 2 ** Math.min(n, 5))));
  } finally {
    flushing.delete(uid);
  }
}

/**
 * Active-play counter used only for statistics. Counts while `running` and the page is visible;
 * stored per round so reloads continue the same total.
 */
const activeKey = (uid: string, roundId: string) => `ta-active-v1:${uid}:${roundId}`;
export function readActiveMs(uid: string, roundId: string): number {
  try { const n = Number(localStorage.getItem(activeKey(uid, roundId))); return Number.isFinite(n) && n > 0 ? n : 0; } catch { return 0; }
}
export function addActiveMs(uid: string, roundId: string, delta: number) {
  if (!(delta > 0) || delta > 30000) return; // ignore suspended timers / clock jumps
  try { localStorage.setItem(activeKey(uid, roundId), String(Math.round(readActiveMs(uid, roundId) + delta))); } catch { /* unavailable */ }
}
