/**
 * Single-tab ownership of a player's round. The latest tab to claim owns it;
 * other tabs are told to pause and stop writing saves.
 */
const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const keyFor = (uid: string) => `pf-round-owner:${uid}`;
let detach: (() => void) | null = null;

export function claimRound(uid: string, onLost: () => void) {
  detach?.();
  try { localStorage.setItem(keyFor(uid), JSON.stringify({ tabId, at: Date.now() })); } catch { /* storage unavailable */ }
  const onStorage = (e: StorageEvent) => {
    if (e.key !== keyFor(uid) || !e.newValue) return;
    try { if (JSON.parse(e.newValue).tabId !== tabId) onLost(); } catch { /* ignore */ }
  };
  window.addEventListener("storage", onStorage);
  detach = () => window.removeEventListener("storage", onStorage);
}

export function releaseRound() { detach?.(); detach = null; }
