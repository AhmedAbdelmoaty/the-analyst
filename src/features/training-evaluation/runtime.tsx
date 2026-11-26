import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { type Action } from "./engine";
import { advanceRun, loadRun, newRun, saveRun, type SavedRun } from "./persistence";
import { audioPosition, pauseAudio, restoreVoicePosition, resumeAudio, stopVoice, stopBgm } from "./audio";

type Runtime = { run: SavedRun; paused: boolean; exitPrompt: boolean; unavailable: boolean; otherTab: boolean;
  update: (fn: (r: SavedRun) => SavedRun) => void; dispatch: (a: Action) => void;
  pause: (exit?: boolean) => void; resume: () => void; finish: () => void; restart: () => void; revision: number };
const Context = createContext<Runtime | null>(null);
export function useRuntime() { const value = useContext(Context); if (!value) throw new Error("Missing training runtime"); return value; }
export function RunProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [run, setRun] = useState(() => loadRun(userId) ?? newRun(userId));
  const ref = useRef(run);
  const [paused, setPaused] = useState(run.state.phase !== "intro" || Boolean(run.ui.pendingTravel));
  const pausedRef = useRef(paused);
  const [exitPrompt, setExitPrompt] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [otherTab, setOtherTab] = useState(false);
  const [revision, setRevision] = useState(0);
  const owns = useRef(true);
  const completed = useRef(false);
  useState(() => { restoreVoicePosition(run.ui["global:voice"]); return null; });
  const update = useCallback((fn: (r: SavedRun) => SavedRun) => {
    if (!owns.current || completed.current || pausedRef.current) return;
    const next = fn(ref.current); ref.current = next;
    setUnavailable(!saveRun(next)); setRun(next);
  }, []);
  const pause = useCallback((exit = false) => {
    pausedRef.current = true; pauseAudio(); setPaused(true); setExitPrompt(exit);
    if (owns.current && !completed.current) {
      ref.current = { ...ref.current, ui: { ...ref.current.ui, "global:voice": audioPosition() } };
      setUnavailable(!saveRun(ref.current));
    }
  }, []);
  const ownerKey = `the-analyst:training-evaluation:owner:${userId}`;
  const token = useRef(crypto.randomUUID());
  const claim = useCallback(() => { owns.current = true; setOtherTab(false);
    try { localStorage.setItem(ownerKey, token.current); } catch { /* save warning handles storage */ }
  }, [ownerKey]);
  const resume = useCallback(() => {
    if (!owns.current) { const latest = loadRun(userId); if (latest) { ref.current = latest; setRun(latest); } claim(); }
    pausedRef.current = false; setPaused(false); setExitPrompt(false); resumeAudio();
  }, [userId, claim]);
  const dispatch = useCallback((a: Action) => {
    if (pausedRef.current) return;
    completed.current = false;
    update(r => advanceRun(r, a));
  }, [update, userId]);
  useEffect(() => {
    claim(); if (pausedRef.current) pauseAudio();
    const background = (event: Event) => { if (event.type === "visibilitychange" && !document.hidden) return; if (ref.current.state.phase !== "intro") pause(); else pauseAudio(); };
    const storage = (event: StorageEvent) => { if (event.key === ownerKey && event.newValue && event.newValue !== token.current) { owns.current = false; setOtherTab(true); pause(); } };
    document.addEventListener("visibilitychange", background); window.addEventListener("pagehide", background); window.addEventListener("blur", background); window.addEventListener("storage", storage);
    return () => { if (owns.current && !completed.current) saveRun(ref.current); pauseAudio(); document.removeEventListener("visibilitychange", background); window.removeEventListener("pagehide", background); window.removeEventListener("blur", background); window.removeEventListener("storage", storage); };
  }, [claim, ownerKey, pause]);
  const finish = useCallback(() => { completed.current = true; try { localStorage.removeItem(`the-analyst:training-evaluation:v1:${userId}`); } catch { /* unavailable */ } pauseAudio(); }, [userId]);
  const restart = useCallback(() => {
    claim(); pauseAudio(); stopVoice(); stopBgm();
    const fresh = newRun(userId); ref.current = fresh; completed.current = false;
    pausedRef.current = false; setPaused(false); setExitPrompt(false);
    setUnavailable(!saveRun(fresh)); setRun(fresh); setRevision(v => v + 1);
  }, [claim, userId]);
  return <Context.Provider value={{ run, update, dispatch, paused, exitPrompt, unavailable, otherTab, pause, resume, finish, restart, revision }}>{children}</Context.Provider>;
}

/** Screen-local state lives in the same synchronous snapshot as the game reducer. */
export function useSavedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const { run, update } = useRuntime();
  const value = (key in run.ui ? run.ui[key] : initial) as T;
  const set: Dispatch<SetStateAction<T>> = useCallback(next => update(r => {
    const current = (key in r.ui ? r.ui[key] : initial) as T;
    const value = typeof next === "function" ? (next as (v: T) => T)(current) : next;
    return { ...r, ui: { ...r.ui, [key]: value } };
  }), [key, initial, update]);
  return [value, set];
}

/** Persist active milliseconds, including partial seconds; pauses never consume a timer. */
export function useActiveTimer(key: string, duration: number, callback: () => void, enabled = true) {
  const { run, update, paused } = useRuntime();
  const cb = useRef(callback); cb.current = callback;
  const remaining = duration - (run.timers[key] ?? 0);
  useEffect(() => {
    if (paused || !enabled) return;
    let last = performance.now(); let fired = false;
    const tick = () => { const now = performance.now(); const delta = now - last; last = now;
      let total = 0; update(r => { total = Math.min(duration, (r.timers[key] ?? 0) + delta); return { ...r, ui: { ...r.ui, "global:voice": audioPosition() }, timers: { ...r.timers, [key]: total } }; });
      if (total >= duration && !fired) { fired = true; clearInterval(id); cb.current(); }
    };
    const id = window.setInterval(tick, 100);
    return () => { clearInterval(id); };
  }, [key, duration, paused, enabled, update]);
  return Math.max(0, remaining);
}