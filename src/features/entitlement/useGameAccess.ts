import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type GameAccessSnapshot = {
  enforcement: boolean;
  entitled: boolean | null;
  expiresAt: string | null;
};

/**
 * Reads the server-owned access snapshot (public.my_game_access).
 * On any failure the snapshot falls back to enforcement OFF: the flag lives on the
 * server, so a client cannot weaken it, and a network failure must not invent a paywall
 * (entitlement itself is only ever granted server-side by verified payments).
 */
export function useGameAccess() {
  const { user, loading: authLoading } = useAuth();
  const generation = useRef(0);
  const [state, setState] = useState<{ owner: string | null; data: GameAccessSnapshot | null; loading: boolean }>({
    owner: null, data: null, loading: false,
  });

  const refresh = useCallback(async () => {
    const revision = ++generation.current;
    if (!user || authLoading) return;
    setState((s) => ({ owner: user.id, data: s.owner === user.id ? s.data : null, loading: true }));
    try {
      const { data, error } = await (supabase.rpc as CallableFunction)("my_game_access");
      if (error) throw error;
      const d = data as { enforcement?: unknown; entitled?: unknown; expires_at?: unknown } | null;
      const snapshot: GameAccessSnapshot = {
        enforcement: d?.enforcement === true,
        entitled: typeof d?.entitled === "boolean" ? d.entitled : null,
        expiresAt: typeof d?.expires_at === "string" ? d.expires_at : null,
      };
      if (revision === generation.current) setState({ owner: user.id, data: snapshot, loading: false });
    } catch {
      if (revision === generation.current) {
        setState({ owner: user.id, data: { enforcement: false, entitled: null, expiresAt: null }, loading: false });
      }
    }
  }, [user?.id, authLoading]);

  useEffect(() => { void refresh(); return () => { generation.current++; }; }, [refresh]);

  const current = state.owner === user?.id ? state : { data: null, loading: false };
  return { snapshot: current.data, loading: current.loading, refresh };
}
