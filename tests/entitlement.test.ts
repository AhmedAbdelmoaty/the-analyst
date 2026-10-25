import { describe, expect, it } from "bun:test";
import { decideAccess, entitlementWindowActive, GAME_ACCESS, gameTier, ROUTE_GAME } from "../src/features/entitlement/access";

describe("game access configuration", () => {
  it("maps the five current games to the approved tiers", () => {
    expect(GAME_ACCESS).toEqual({
      "problem-framing": "free",
      "reward-decision": "annual",
      "behind-the-dots": "annual",
      "crack-the-code": "annual",
      "decision-matrix": "annual",
    });
  });
  it("resolves the gated routes to their games and nothing else", () => {
    expect(ROUTE_GAME).toEqual({
      "/play": "problem-framing",
      "/games/reward-decision": "reward-decision",
      "/games/behind-the-dots": "behind-the-dots",
      "/games/crack-the-code": "crack-the-code",
      "/games/decision-matrix": "decision-matrix",
    });
  });
  it("defaults unknown games to free so new games are never blocked accidentally", () => {
    expect(gameTier("decision-matrix")).toBe("annual");
    expect(gameTier("some-future-game")).toBe("free");
  });
});

describe("decideAccess with enforcement OFF (current development behavior)", () => {
  it("allows every game for free, new, expired and unsubscribed users alike", () => {
    for (const tier of ["free", "annual"] as const) {
      expect(decideAccess(false, tier, false)).toBe("allow");
      expect(decideAccess(false, tier, true)).toBe("allow");
      expect(decideAccess(false, tier, null)).toBe("allow");
    }
  });
});

describe("decideAccess with enforcement ON (future launch, isolated testing only)", () => {
  it("keeps the free game open for everyone", () => {
    expect(decideAccess(true, "free", false)).toBe("allow");
    expect(decideAccess(true, "free", null)).toBe("allow");
  });
  it("blocks annual games without a server-verified entitlement", () => {
    expect(decideAccess(true, "annual", false)).toBe("deny");
  });
  it("allows annual games with an active entitlement", () => {
    expect(decideAccess(true, "annual", true)).toBe("allow");
  });
  it("never claims an unverified user is unpaid when the backend is unavailable", () => {
    expect(decideAccess(true, "annual", null)).toBe("verify");
  });
});

describe("entitlement window", () => {
  const now = new Date("2026-10-25T12:00:00Z");
  it("accepts only started, unexpired, unrevoked entitlements", () => {
    expect(entitlementWindowActive({ starts_at: "2026-10-24T00:00:00Z", expires_at: "2027-10-24T00:00:00Z", revoked_at: null }, now)).toBe(true);
  });
  it("rejects future, expired and revoked entitlements", () => {
    expect(entitlementWindowActive({ starts_at: "2026-11-01T00:00:00Z", expires_at: "2027-11-01T00:00:00Z", revoked_at: null }, now)).toBe(false);
    expect(entitlementWindowActive({ starts_at: "2025-01-01T00:00:00Z", expires_at: "2026-01-01T00:00:00Z", revoked_at: null }, now)).toBe(false);
    expect(entitlementWindowActive({ starts_at: "2026-10-24T00:00:00Z", expires_at: "2027-10-24T00:00:00Z", revoked_at: "2026-10-25T01:00:00Z" }, now)).toBe(false);
  });
});

describe("server flag and RPC contract", () => {
  it("keeps the enforcement flag server-side in the applied migration, defaulting to off", async () => {
    const sql = await Bun.file(new URL("../drizzle/migrations/0011_game_access_and_admin_payments.sql", import.meta.url)).text();
    expect(sql).toContain("app_flags");
    expect(sql).toContain("coalesce((SELECT value FROM public.app_flags WHERE key = 'paid_game_enforcement'), 'off') = 'on'");
    expect(sql).not.toMatch(/GRANT .* ON public\.app_flags TO (anon|authenticated)/i);
    for (const fn of ["my_game_access", "admin_payments_overview", "admin_payment_orders", "admin_entitlements"]) {
      expect(sql).toContain(`FUNCTION public.${fn}(`);
    }
  });
});
