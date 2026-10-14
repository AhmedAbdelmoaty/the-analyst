import { describe, expect, it } from "bun:test";
import { readPlanIntent, setPlanIntent, takePlanIntent, destinationForPlan, routeForPlanChoice } from "../src/features/subscription/planIntent";
import { subscriptionDisplay } from "../src/features/subscription/model";
import { annualPriceForUser } from "../src/features/subscription/pricing";

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
  it("treats a temporary verification failure separately from an absent subscription", () => {
    expect(subscriptionDisplay(null, true).state).toBe("verification_error");
    expect(subscriptionDisplay(null).state).toBe("unavailable");
    const active = subscriptionDisplay({ tier: "annual", status: "active", expiresAt: "2027-10-13T00:00:00Z" });
    expect(active.title).toBe("تم تفعيل اشتراكك");
    expect(active.expires).not.toBeNull();
  });
});

describe("annual display pricing", () => {
  it("waits for the current session before showing any account price", () => {
    expect(annualPriceForUser({ phone: "201012345678", phone_confirmed_at: "2026-10-13T00:00:00Z" }, true)).toBeNull();
  });

  it("shows the base EGP price for guests and unconfirmed accounts", () => {
    expect(annualPriceForUser(null, false)).toMatchObject({ amount: 1200, currency: "EGP", discounted: false });
    expect(annualPriceForUser({ phone: "+201012345678", phone_confirmed_at: null }, false)?.amount).toBe(1200);
    expect(annualPriceForUser({ phone: "+201012345678" }, false)?.amount).toBe(1200);
  });

  it("discounts only valid confirmed Egyptian mobile numbers, with or without +", () => {
    for (const phone of ["+201012345678", "201112345678", "201212345678", "201512345678"]) {
      expect(annualPriceForUser({ phone, phone_confirmed_at: "2026-10-13T00:00:00Z" }, false)).toMatchObject({ amount: 400, baseAmount: 1200, discounted: true });
    }
  });

  it("rejects prefixes, malformed numbers, and email-only confirmation", () => {
    for (const phone of ["+20", "201312345678", "20101234567", "2010123456789", "01012345678", "+201012345678x", "+966501234567"]) {
      expect(annualPriceForUser({ phone, phone_confirmed_at: "2026-10-13T00:00:00Z" }, false)?.amount).toBe(1200);
    }
    expect(annualPriceForUser({ phone: "+201012345678", phone_confirmed_at: null, email_confirmed_at: "2026-10-13T00:00:00Z" }, false)?.amount).toBe(1200);
  });

  it("recomputes from the next account without retaining a previous discount", () => {
    const confirmedEgyptian = { phone: "201012345678", phone_confirmed_at: "2026-10-13T00:00:00Z" };
    expect(annualPriceForUser(confirmedEgyptian, false)?.amount).toBe(400);
    expect(annualPriceForUser(null, true)).toBeNull();
    expect(annualPriceForUser({ phone: "966501234567", phone_confirmed_at: "2026-10-13T00:00:00Z" }, false)?.amount).toBe(1200);
  });
});
