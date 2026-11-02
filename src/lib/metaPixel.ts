// Meta Pixel helpers. The base snippet in index.html loads only outside
// consent-required regions; every call here is a no-op when the pixel is blocked.

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...args: unknown[]) => void };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const fbq = (): Fbq | undefined => (typeof window !== "undefined" ? window.fbq : undefined);

/** Fire a standard event only when the pixel is loaded (region-permitted). */
export function trackEvent(name: string, params?: Record<string, unknown>, eventID?: string) {
  const fn = fbq();
  if (typeof fn !== "function") return;
  const args: unknown[] = ["track", name, params ?? {}];
  if (eventID) args.push({ eventID });
  if (fn.callMethod) fn.callMethod.apply(fn, args);
  else fn(...args);
}

/** Completed registration: fired once after the phone number is verified. */
export function trackCompleteRegistration() {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  trackEvent("CompleteRegistration", {}, id);
}
