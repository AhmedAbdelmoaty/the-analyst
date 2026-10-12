import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { touchVisit, VISIT_PING_MS } from "@/lib/analytics/visit";
import { flushRounds } from "@/lib/analytics/rounds";

/** Lightweight visit tracking: route changes, returning to the tab, and recent interaction only. */
export default function VisitTracker() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const uid = user?.id ?? null;
  const lastInput = useRef(Date.now());

  useEffect(() => { if (!loading) void touchVisit(uid); }, [uid, pathname, loading]);
  useEffect(() => { if (uid) void flushRounds(uid); }, [uid]);

  useEffect(() => {
    if (loading) return;
    const onInput = () => { lastInput.current = Date.now(); void touchVisit(uid); };
    const onVis = () => { if (document.visibilityState === "visible") { lastInput.current = Date.now(); void touchVisit(uid); } };
    const onOnline = () => { void touchVisit(uid); if (uid) void flushRounds(uid); };
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastInput.current < VISIT_PING_MS) void touchVisit(uid);
    }, VISIT_PING_MS);
    window.addEventListener("pointerdown", onInput, { passive: true });
    window.addEventListener("keydown", onInput);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pointerdown", onInput);
      window.removeEventListener("keydown", onInput);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, [uid, loading]);
  return null;
}
