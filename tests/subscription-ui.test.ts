import { describe, expect, it } from "bun:test";
import { readPlanIntent, setPlanIntent, takePlanIntent, destinationForPlan, routeForPlanChoice } from "../src/features/subscription/planIntent";
import { subscriptionDisplay } from "../src/features/subscription/model";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe("plan navigation intent", () => {
  it("survives authentication and profile setup, then clears after reaching the chosen destination", () => {
    const storage = memoryStorage();
    setPlanIntent("annual", storage);
    expect(readPlanIntent(storage)).toBe("annual");
    expect(destinationForPlan(readPlanIntent(storage), false)).toBe("/setup");
    expect(readPlanIntent(storage)).toBe("annual");
    expect(destinationForPlan(takePlanIntent(storage), true)).toBe("/subscription/summary");
    expect(readPlanIntent(storage)).toBeNull();
    expect(destinationForPlan(readPlanIntent(storage), true)).toBe("/app");
  });

  it("takes the free choice to the existing game selection page", () => {
    const storage = memoryStorage();
    setPlanIntent("free", storage);
    expect(destinationForPlan(takePlanIntent(storage), true)).toBe("/app");
  });

  it("routes guests through signup and signed-in players directly to their chosen destination", () => {
    const storage = memoryStorage();
    expect(routeForPlanChoice("annual", false, false, storage)).toBe("/signup");
    expect(readPlanIntent(storage)).toBe("annual");
    expect(routeForPlanChoice("annual", true, false, storage)).toBe("/setup");
    expect(readPlanIntent(storage)).toBe("annual");
    expect(routeForPlanChoice("annual", true, true, storage)).toBe("/subscription/summary");
    expect(readPlanIntent(storage)).toBeNull();
    expect(routeForPlanChoice("free", true, true, storage)).toBe("/app");
  });

  it("ignores unexpected stored values instead of using them as redirect URLs", () => {
    const storage = memoryStorage();
    storage.setItem("analyst-plan-intent-v1", "https://example.com");
    expect(readPlanIntent(storage)).toBeNull();
    expect(destinationForPlan(readPlanIntent(storage), true)).toBe("/app");
  });
});

describe("subscription display", () => {
  it("does not infer a tier from missing server data", () => {
    expect(subscriptionDisplay(null).state).toBe("unavailable");
  });
  it("keeps pending, failed and expired separate from active", () => {
    expect(subscriptionDisplay({ tier: "annual", status: "pending", expiresAt: null }).state).toBe("pending");
    expect(subscriptionDisplay({ tier: "annual", status: "failed", expiresAt: null }).state).toBe("failed");
    expect(subscriptionDisplay({ tier: "annual", status: "expired", expiresAt: null }).state).toBe("expired");
  });
});
