# Project rules

- Player accounts use native phone/password auth with SMS auto-confirm off; the `phone-auth` edge function is the only path that confirms phones or resets passwords (after OTP check) — keeps sessions/passwords in managed auth.
- OTP codes are delivered by ChakraHQ WhatsApp from `phone-auth`, stored only as HMACs (OTP_HMAC_SECRET) in `otp_challenges`, and consumed via the row-locking `otp_attempt` SQL function — guarantees single use under concurrency.
- `otp_challenges` and `otp_rate_events` have no client grants; server-only data.
- `profiles.phone` is written only by the server (users can update just name/gender/avatar columns) — phone is verified identity used for admin leads.
- `completed_players` inserts require an authenticated user with `user_id = auth.uid()`; admins alone read results; `qualified` is set only by the server from the matching `game_rounds` evaluation (strong, submitted, not timed out) — the client never decides it.
- Admins sign in with email at `/admin/login`; roles live in `user_roles`.
- Account screens use scoped auth-theme tokens and local Cairo fonts so the light account surface never changes the dark game theme.
- Gameplay surfaces use scoped game-paper/ink/charcoal tokens while photographic scenes retain their original dark overlays; this keeps text readable without altering scene media or dialogue timing.
- The public landing and reused account forms are independent of the lazily loaded `/play` route; `/app` is the authenticated entry so marketing and OTP never preload game media.
- Landing captures whether a visitor arrived signed out and owns post-auth navigation to `/app` — newly authenticated visitors bypass the returning-user welcome card even when the account form unmounts.
- PWA installation is optional and the worker is guarded against previews; account/network requests are never cached.
- Game checkpoints use a versioned per-user browser key and restore engine state only alongside a safe screen, not from the old shared guest screen key.
- The round time challenge lives in `pf-time-challenge` as a per-user active-play clock (remaining ms + runningSince, heartbeat-checkpointed); submission vs expiry compares active time left at acceptance, so pauses and reloads neither deduct nor grant time.
- Pausing is global and in place via `pf-pause` (virtualised timers, media and AudioContexts frozen) instead of unmounting or deactivating screens; restored rounds start paused until the player taps continue.
- Saves carry the challenge `roundId`; per-screen progress lives in a scene store scoped to `roundId|screen`, and only the tab that last claimed the round (`pf-round-owner`) may write.
- Result rows are upserted by `(user_id, round_id)` and marked done locally only after the server confirms.
- Installed-app updates stay pending during /play and are applied on any route outside it or via the pause overlay's update action.
- Reward Decision is an isolated local-save game under `/games/reward-decision`; it shares player identity but never the original game engine, timer, saves, or leaderboard.
- Reward Decision derives analysis values from its single team dataset and freezes one submitted report before conditional meeting feedback — keeps displayed statistics, evaluation, and restored outcomes consistent.
- Admin statistics live in `visit_segments`, `game_rounds` and `round_events` with no client table grants; players write only through `track_visit`/`track_round_event` (owner from the session, anonymous segments proven by a hashed secret) and admins read only through `admin_*` functions — keeps PII and cross-player data server-side.
- Round events carry stable ids and merge order-independently (earliest start, write-once submit/complete/timeout, stage by higher revision, max active time); the client queue is per account and sends only for the signed-in owner — so retries, reloads and account switches never duplicate or misattribute activity.
- A visit is one browser-wide session ending after 30 idle minutes, split into fixed-owner segments (anonymous or per account); counts use distinct visit ids — avoids double counting on sign-in or account switch.
- Game trackers only observe: Problem Framing derives active time from the existing time challenge; Reward Decision uses a separate stats-only counter — gameplay timing, saves and dialogue stay untouched.
- Server evaluators (`pf_evaluate`, `rd_evaluate`) mirror the in-game rules and are covered by a parity test; any rule change must update both.
- Legacy results are copied into `game_rounds` as `source = 'legacy'` with `legacy_ref` (re-runnable via `backfill_legacy_results`), never given a start time or active play time.
- The admin dashboard (`/admin/stats`) is a lazily loaded route; Excel export loads its library on demand only there.

- Simplified admin reporting uses the protected `admin_activity_summary` RPC alongside existing reports; legacy completed rows count as known attempts without inventing starts or visits.
