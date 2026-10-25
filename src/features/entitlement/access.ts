import { GAME_CATALOG } from "../discovery/catalog";
/**
 * Central game-access configuration and pure decision logic.
 * The server flag `paid_game_enforcement` (public.app_flags) is the only switch;
 * it defaults to OFF, so until a separate explicit owner authorization sets it,
 * every authenticated user keeps full access to all games.
 */

export type GameTier = "free" | "annual";

/** Intended future tiers. Unknown games default to "free" so new games are never blocked accidentally. */
export const GAME_ACCESS: Record<string, GameTier> = Object.fromEntries(GAME_CATALOG.map(game => [game.id, game.tier]));

/** Route path → game key; catalog remains the single definition. */
export const ROUTE_GAME: Record<string, string> = Object.fromEntries(GAME_CATALOG.map(game => [game.route, game.id]));

export function gameTier(game: string): GameTier {
  return GAME_ACCESS[game] ?? "free";
}

export type AccessDecision = "allow" | "deny" | "verify";

/**
 * @param enforcement server flag; false/unknown → always allow (current development behavior).
 * @param entitled    null = server verification unavailable (never pretend the user is unpaid).
 */
export function decideAccess(enforcement: boolean | null, tier: GameTier, entitled: boolean | null): AccessDecision {
  if (enforcement === false) return "allow";
  if (tier === "free") return "allow";
  if (enforcement === null) return "verify";
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
