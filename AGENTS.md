# Project rules

- Player accounts use native phone/password auth with SMS auto-confirm off; the `phone-auth` edge function is the only path that confirms phones or resets passwords (after OTP check) — keeps sessions/passwords in managed auth.
- OTP codes are delivered by ChakraHQ WhatsApp from `phone-auth`, stored only as HMACs (OTP_HMAC_SECRET) in `otp_challenges`, and consumed via the row-locking `otp_attempt` SQL function — guarantees single use under concurrency.
- `otp_challenges` and `otp_rate_events` have no client grants; server-only data.
- `profiles.phone` is written only by the server (users can update just name/gender/avatar columns) — phone is verified identity used for admin leads.
- `completed_players` inserts require an authenticated user with `user_id = auth.uid()`; admins alone read results.
- Admins sign in with email at `/admin/login`; roles live in `user_roles`.
- Account screens use scoped auth-theme tokens and local Cairo fonts so the light account surface never changes the dark game theme.
- Gameplay surfaces use scoped game-paper/ink/charcoal tokens while photographic scenes retain their original dark overlays; this keeps text readable without altering scene media or dialogue timing.
- The public landing and reused account forms are independent of the lazily loaded `/play` route; `/app` is the authenticated entry so marketing and OTP never preload game media.
- PWA installation is optional, the worker is guarded against previews and applies updates only outside an active round; account/network requests are never cached.
- Game checkpoints use a versioned per-user browser key and restore engine state only alongside a safe screen, not from the old shared guest screen key.
