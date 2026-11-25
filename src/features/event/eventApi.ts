import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const EVENT_GAME_ROUTE = "/games/training-evaluation";
export const IMP_RED = "#A61E25";
export const FAST_TRACK_KEY = "analyst-event-fasttrack";

export type Winner = { rank: number; name: string; discount: number };
export type PublicState = { started_at: string | null; reveal_step: number; revealed: boolean; count: number; winners: Winner[] };
export type Voucher = { name: string; rank: number; discount: number; code: string };
export type MyStatus = { submitted: boolean; revealed: boolean; voucher?: Voucher } | null;

const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

export const eventJoin = () => rpc("event_join");
export const eventSubmit = (claim: string | null, evidence: string | null) => rpc("event_submit", { _claim: claim ?? "", _evidence: evidence ?? "" });
export const adminStart = () => rpc("event_admin_start");
export const adminReveal = (step: number) => rpc("event_admin_reveal", { _step: step });
export const adminExport = () => rpc("event_admin_export");

/** Live challenge status: refetches on every change to the single challenge row (and every 10s for the player count). */
export function usePublicState(pollMs = 10000) {
  const [state, setState] = useState<PublicState | null>(null);
  const load = useCallback(async () => { const { data } = await rpc("event_public_state"); if (data) setState(data as PublicState); }, []);
  useEffect(() => {
    void load();
    const ch = supabase.channel(`event-challenge-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "event_challenge" }, () => void load()).subscribe();
    const t = window.setInterval(load, pollMs);
    return () => { supabase.removeChannel(ch); window.clearInterval(t); };
  }, [load, pollMs]);
  return { state, reload: load };
}

/** The signed-in player's own status and voucher; updates live when the admin announces winners. */
export function useMyStatus(enabled: boolean) {
  const [status, setStatus] = useState<MyStatus>(null);
  const load = useCallback(async () => { const { data } = await rpc("event_my_status"); setStatus((data as MyStatus) ?? null); }, []);
  useEffect(() => {
    if (!enabled) { setStatus(null); return; }
    void load();
    const ch = supabase.channel(`event-me-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "event_challenge" }, () => void load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [enabled, load]);
  return status;
}

export const PRIZES = [
  { icon: "🥇", place: "المركز الأول", prize: "دبلومة كاملة 100% مجاناً", sub: "Data Analytics & Business Intelligence + Analytical Thinking" },
  { icon: "🥈", place: "المركز الثاني", prize: "قسيمة خصم 75%" },
  { icon: "🥉", place: "المركز الثالث", prize: "قسيمة خصم 50%" },
  { icon: "🎖️", place: "المراكز من 4 إلى 50", prize: "قسيمة خصم 25%" },
];
export const placeName = (r: number) => r === 1 ? "المركز الأول" : r === 2 ? "المركز الثاني" : r === 3 ? "المركز الثالث" : `المركز ${r}`;
