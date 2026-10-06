/**
 * One owning tab per (user, run): BroadcastChannel announcements + a renewed localStorage lease.
 * The tab that loses ownership stops writing immediately; taking control renews the lease.
 */
const LEASE_MS = 5000;
const RENEW_MS = 2000;
const leaseKey = (u: string, r: string) => `the-analyst:reward-decision:owner:${u}:${r}`;

export function createOwnership(tabId: string = crypto.randomUUID(), storage: Storage = globalThis.localStorage) {
  let owned = false;
  let key = '';
  let channel: BroadcastChannel | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let lost: () => void = () => {};
  let onStorage: ((e: StorageEvent) => void) | null = null;

  const writeLease = () => { if (owned && key) try { storage.setItem(key, JSON.stringify({ tabId, at: Date.now() })); } catch { /* unavailable */ } };
  const stopTimer = () => { if (timer) clearInterval(timer); timer = undefined; };
  const lose = () => { if (!owned) return; owned = false; stopTimer(); lost(); };
  const become = () => {
    owned = true; writeLease();
    channel?.postMessage({ type: 'claim', tabId });
    stopTimer(); timer = setInterval(writeLease, RENEW_MS);
  };

  const dropLease = () => {
    try { const raw = key && storage.getItem(key); if (raw && JSON.parse(raw).tabId === tabId) storage.removeItem(key); } catch { /* ignore */ }
  };
  // A reload/close frees the lease at once so the same tab is not mistaken for "another window" on return.
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => { if (owned) dropLease(); });
    window.addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted && owned) writeLease(); });
  }

  function release() {
    if (owned) dropLease();
    owned = false; stopTimer(); channel?.close(); channel = null;
    if (onStorage && typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
    onStorage = null;
  }

  function claim(uid: string, runId: string, onLost: () => void): boolean {
    release();
    key = leaseKey(uid, runId); lost = onLost;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(key);
      channel.onmessage = (e) => { if (e.data?.type === 'claim' && e.data.tabId !== tabId) lose(); };
    }
    if (typeof window !== 'undefined') {
      onStorage = (e) => { if (e.key !== key || !e.newValue) return; try { if (JSON.parse(e.newValue).tabId !== tabId) lose(); } catch { /* ignore */ } };
      window.addEventListener('storage', onStorage);
    }
    let busy = false;
    try {
      const raw = storage.getItem(key);
      if (raw) { const old = JSON.parse(raw) as { tabId: string; at: number }; busy = old.tabId !== tabId && Date.now() - old.at < LEASE_MS; }
    } catch { /* treat as free */ }
    if (!busy) become();
    return owned;
  }

  /** Move control to this tab (after the user asks for it). Requires a prior claim() for the run. */
  function take() { if (key) become(); }

  return { claim, take, release, mayWrite: () => owned, tabId };
}

const shared = typeof window !== 'undefined' ? createOwnership() : null;
export const claimOwnership = (uid: string, runId: string, onLost: () => void) => shared?.claim(uid, runId, onLost) ?? true;
export const takeOwnership = () => shared?.take();
export const releaseOwnership = () => shared?.release();
export const mayWrite = () => shared?.mayWrite() ?? false;
