/** A navigation choice for the current tab, never a subscription or entitlement. */
export type PlanIntent = "free" | "annual";
type IntentStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const KEY = "analyst-plan-intent-v1";
let memoryFallback: PlanIntent | null = null;

function availableStorage(storage?: IntentStorage): IntentStorage | null {
  if (storage) return storage;
  try { return window.sessionStorage; } catch { return null; }
}

export function readPlanIntent(storage?: IntentStorage): PlanIntent | null {
  const source = availableStorage(storage);
  try {
    const value = source?.getItem(KEY);
    return value === "free" || value === "annual" ? value : source ? null : memoryFallback;
  } catch { return storage ? null : memoryFallback; }
}

export function setPlanIntent(intent: PlanIntent, storage?: IntentStorage): void {
  if (!storage) memoryFallback = intent;
  try { availableStorage(storage)?.setItem(KEY, intent); } catch { /* In-memory fallback for blocked storage. */ }
}

export function clearPlanIntent(storage?: IntentStorage): void {
  if (!storage) memoryFallback = null;
  try { availableStorage(storage)?.removeItem(KEY); } catch { /* In-memory fallback already cleared. */ }
}

export function takePlanIntent(storage?: IntentStorage): PlanIntent | null {
  const intent = readPlanIntent(storage);
  clearPlanIntent(storage);
  return intent;
}

/** All destinations are fixed internal routes. */
export function destinationForPlan(intent: PlanIntent | null, profileComplete: boolean): string {
  if (!profileComplete) return "/setup";
  if (intent === "free") return "/app";
  if (intent === "annual") return "/subscription/summary";
  return "/app";
}

export function routeForPlanChoice(intent: PlanIntent, signedIn: boolean, profileComplete: boolean, storage?: IntentStorage): string {
  if (!signedIn) { setPlanIntent(intent, storage); return "/signup"; }
  if (!profileComplete) { setPlanIntent(intent, storage); return "/setup"; }
  clearPlanIntent(storage);
  return destinationForPlan(intent, true);
}
