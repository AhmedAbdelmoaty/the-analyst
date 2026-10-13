# The Analyst — project context

Reviewed against local `main` at `494d20726ea85ff1c3fba6381cbbf6e4de4331b4` on 2026-10-12. Source and migration files describe intended behavior; they do not establish the live database state.

## Product and identity

IMP (Institute of Management Professionals) uses The Analyst for story-led practice in analytical thinking and business decisions. The audience includes working professionals and managers. Existing branding uses The Analyst and IMP marks, Cairo for Arabic, and red `#A61E25` with light account/game surfaces and dark photographic scene overlays. Preserve the approved game content, dialogue, audio, timing, scoring, images, and user flow.

The platform currently offers two games through a shared authenticated `/app` selection page:

| Game | Route | Current behavior |
| --- | --- | --- |
| Problem Framing, "أقل من المتوقع.. مقارنة بإيه؟" | `/play` | Investigate an apparently weak sales result, examine the comparison baseline, and submit a report. Has a seven-minute active-play challenge, global pause, per-user browser checkpoints, and backend completion reporting. |
| Reward Decision, "قرار التكريم" | `/games/reward-decision` | Compare two teams using a fixed dataset and evidence tools, freeze one recommendation, and receive conditional meeting feedback. It has a separate local save and statistics-only active counter; no shared gameplay timer or leaderboard. |

## Current implementation

- Frontend: React 18, TypeScript, Vite 5, React Router 6, Tailwind CSS, Radix/shadcn, Framer Motion. Landing and account forms are separate from lazily loaded game routes.
- Player accounts: native Supabase phone/password; `phone-auth` handles signup, WhatsApp OTP verification, and recovery using ChakraHQ server-side. Admins use email/password at `/admin/login`. `user_roles` is the authorization source.
- Profile, roles, completions, visit segments, game rounds, and round events are described by Supabase and Drizzle migration files. There are two migration histories; determine the actual deployed schema before applying any change.
- Analytics: browser trackers send visits and per-account round events to `track_visit` and `track_round_event`. Admin reads use protected `admin_*` RPCs. `/admin/stats` provides account/game activity and CSV/XLSX export; `/admin/board-9k2x` remains the original result board. Legacy completions can be represented as `source = 'legacy'` without invented starts.
- Player work details use stable department and industry IDs with optional validated Other text. New `/setup` submissions require both categories; the original identity completion rule still controls game access, so old accounts without work details remain usable. `/app` prompts existing accounts once (dismissal stored on their own profile row) and always links to `/profile/work` for later editing. Gender in audience reports means selected character, as an approximation. Country is derived from stored E.164 calling code; shared prefixes such as `+1` and `+7` are marked ambiguous, and missing/invalid numbers are unknown.
- The Users tab includes four audience distributions and server-side demographic filters. `admin_users` returns the current filtered page and aggregate counts for the same account population, avoiding browser-side aggregation across pages. Other free text is included in row/detail/export views and protected against spreadsheet formulas. The forward-only SQL addition is `drizzle/migrations/0008_user_profiling_audience.sql`; it has not been applied to a live or isolated backend.
- Storage: browser save keys are per account and game. This is not cloud save. Realtime, role checks, and analytics still depend on the configured cloud backend.
- PWA: optional install, scoped manifest, guarded worker registration, deferred updates during game routes, no offline guarantee for accounts or results. Some Lovable assets use `__l5e` metadata paths; local matching files belong under `public/__l5e`.

## Trust and deployment boundaries

The frontend's `VITE_SUPABASE_*` values are public configuration. Chakra, OTP HMAC, service-role, migration, and future payment credentials must stay server-side. Route guards improve navigation, while database policies and RPC authorization must enforce access. A local run can contact the configured live Supabase project. Git changes, Lovable publication, Edge Function deployment, SQL migrations, and backend configuration are separate steps.

For user profiling activation, first confirm which migration history is recorded by the target database. The current Drizzle history contains the newest `admin_users` definition (`0007_simple_admin_activity`); apply only the new `0008_user_profiling_audience` migration after that prerequisite is confirmed. Do not replay the older `supabase/migrations` or historical Drizzle migrations. Test on an isolated database first, then verify self-row updates, denied protected-column updates, admin-only reporting, filters, details, paging, and exports before deploying the matching frontend. See [profiling handoff](USER_PROFILING_HANDOFF.md).

The server evaluation functions apply game rules to **client-supplied** answers, evidence history, tools, and documents. This supports consistent scoring and analytics but does not independently prove a player followed the UI path or spent the reported active time. See [security review](SECURITY_REVIEW.md).

## Subscription interface and pending payments

The interface now presents a free “اسأل صح” tier and $10 for one year of all currently available games at public `/plans`. A choice is a session-scoped navigation intent through signup/login and profile setup, not an account tier. Free opens `/app` game selection; paid opens `/subscription/summary` with payment disabled. Free routing to `/app` is temporary until server-side subscription access is implemented; both games retain their existing sign-in protection and availability. A login without a plan choice continues to `/app`. `/subscription` does not infer a tier when no subscription service exists. Fawaterak remains a prospective provider pending merchant confirmation. There is no checkout, webhook, payment ledger, or entitlement enforcement. Before implementation, confirm merchant/API details, billing recurrence, refund handling, and future-game coverage. Checkout must require a signed-in account and a provider-hosted payment page; grant/revoke entitlements only through verified server-side events. Game scores and browser storage must never grant paid access. See [subscription handoff](SUBSCRIPTION_UI_HANDOFF.md).
