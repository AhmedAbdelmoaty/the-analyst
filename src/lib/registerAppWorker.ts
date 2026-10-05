import { registerSW } from 'virtual:pwa-register';

/**
 * Installed-app updates: detection on open/return, kept pending while a round
 * is on screen, applied at the next safe point (any route outside /play) or by
 * the player's explicit "update now".
 */
let pending = false;
let apply: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const inRound = () => location.pathname.startsWith('/play');

export const isUpdatePending = () => pending;
export function subscribeUpdate(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

/** Applies a pending update now (reloads). Callers must have saved the round first. */
export function applyPendingUpdate() {
  if (!pending || !apply) return false;
  void apply(true);
  return true;
}
/** Applies a pending update only when no round is on screen. */
export function applyUpdateIfSafe() {
  if (!inRound()) return applyPendingUpdate();
  return false;
}

const blocked = () => {
  const host = window.location.hostname;
  return !import.meta.env.PROD || window !== window.top || /^id-preview--|^preview--/.test(host) || host === 'lovableproject.com' || host.endsWith('.lovableproject.com') || host === 'lovableproject-dev.com' || host.endsWith('.lovableproject-dev.com') || host === 'beta.lovable.dev' || host.endsWith('.beta.lovable.dev') || new URLSearchParams(location.search).get('sw') === 'off';
};
export function registerAppWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (blocked()) {
    navigator.serviceWorker.getRegistrations().then(registrations => registrations.filter(r => r.active?.scriptURL.endsWith('/sw.js') || r.installing?.scriptURL.endsWith('/sw.js') || r.waiting?.scriptURL.endsWith('/sw.js')).forEach(r => void r.unregister()));
    return;
  }
  apply = registerSW({
    immediate: true,
    onNeedRefresh() { pending = true; emit(); applyUpdateIfSafe(); },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => { if (document.visibilityState === 'visible') void reg.update().catch(() => {}); };
      document.addEventListener('visibilitychange', check);
      window.addEventListener('pageshow', check);
      window.setInterval(check, 30 * 60 * 1000);
    },
  });
}
