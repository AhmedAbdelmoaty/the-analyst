/**
 * Central game-access configuration and pure decision logic.
 * The server flag `paid_game_enforcement` (public.app_flags) is the only switch;
 * it defaults to OFF, so until a separate explicit owner authorization sets it,
 * every authenticated user keeps full access to all games.
 */

export type GameTier = "free" | "annual";

/** Intended future tiers. Unknown games default to "free" so new games are never blocked accidentally. */
export const GAME_ACCESS: Record<string, GameTier> = {
  "problem-framing": "free",
  "reward-decision": "annual",
  "behind-the-dots": "annual",
  "crack-the-code": "annual",
};

/** Route path → game key. Routes not listed here are never entitlement-gated. */
export const ROUTE_GAME: Record<string, string> = {
  "/play": "problem-framing",
  "/games/reward-decision": "reward-decision",
  "/games/behind-the-dots": "behind-the-dots",
  "/games/crack-the-code": "crack-the-code",
};

export function gameTier(game: string): GameTier {
  return GAME_ACCESS[game] ?? "free";
}

export type AccessDecision = "allow" | "deny" | "verify";

/**
 * @param enforcement server flag; false/unknown → always allow (current development behavior).
 * @param entitled    null = server verification unavailable (never pretend the user is unpaid).
 */
export function decideAccess(enforcement: boolean, tier: GameTier, entitled: boolean | null): AccessDecision {
  if (!enforcement) return "allow";
  if (tier === "free") return "allow";
  if (entitled === null) return "verify";
  return entitled ? "allow" : "deny";
}

/** Mirror of the server-side entitlement window check, for tests and display only. */
export function entitlementWindowActive(
  e: { starts_at: string; expires_at: string; revoked_at: string | null },
  now: Date,
): boolean {
  return !e.revoked_at && new Date(e.starts_at) <= now && now < new Date(e.expires_at);
}
