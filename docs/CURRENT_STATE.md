# Current state

**Scoped local update — 2026-10-20:** Behind the Dots from approved source commit `b552bf1` is integrated locally as the authenticated third game at `/games/behind-the-dots`, with a selection card and per-user browser save namespace. Production build and app TypeScript check pass. The focused game tests could not run because Bun is not installed. No commit, push, or deployment was made.

**Scoped local update — 2026-10-19:** The checkout was fast-forwarded to `origin/main` HEAD `25cb296639879ede73414466911768e79b7ddd65` (31 commits ahead of the prior local base). Reward Decision scene integration and automatic narration are reapplied as uncommitted local changes on that current base; `npm run build`, `npx tsc --noEmit`, targeted ESLint, and the isolated Playwright smoke passed. A safety stash `stash@{0}` preserves the pre-fast-forward working tree. No commit, push, or deployment was made. See [the integration record](REWARD_DECISION_CINEMATIC_INTEGRATION.md) and [acceptance brief](Reward_Decision_Final_Implementation_Brief_AR.md). The earlier review below remains historical for other surfaces; no database, Edge Function, or payment state was reverified here.

**Reviewed:** 2026-10-13 (Africa/Cairo)

**Historical local checkout review:** `main` at `23e7ee99be1fe522ecb9b37a2dc2990bd38b2457` (`Improve post-game subscription invitation`), reviewed 2026-10-13. Current checkout is recorded above.
**Evidence note:** repository state was inspected locally; no cloud console, deployed site, or live database was queried for this review.

## Confirmed in the checkout

- Shared phone-authenticated platform with `/app`, Problem Framing (`/play`), and Reward Decision (`/games/reward-decision`). Both games currently retain the existing sign-in protection and remain accessible.
- Work-profile onboarding/editing and Admin Users audience insights are implemented in source. `docs/USER_PROFILING_HANDOFF.md` reports that migrations `0008_user_profiling_audience.sql` and `0009_work_profile_column_comments.sql` were applied to Lovable Cloud and that the profile update/RPC checks passed on 2026-10-13. This report was not independently re-tested in this task.
- A LAN-safe UUID fallback and non-blocking analytics transition are present in the current source; the user reported that the black-screen issue was resolved after this change.
- `/plans`, annual subscription summary, “My subscription,” and the post-game invitation are interface/navigation only. The annual display rule is 1200 EGP, or 400 EGP for a confirmed Egyptian mobile number in Auth. The post-game invitation routes to `/plans`; payment remains unavailable.

## Git and parallel work

- Local `main` and the locally recorded `origin/main` ref were equal at review (`0` commits ahead/behind). No fetch was performed during this documentation task, so this is not a fresh remote check.
- The Arabic context file and documentation edits predated the current subscription-pricing task. Pricing UI, its focused tests, and the handoff were subsequently changed locally without a commit or push. Preserve and review these separately from the earlier documentation work.
- A managed worktree exists on `codex/post-game-upsell` at `bf1aee0`. That commit is an ancestor of current `main`; the separate worktree’s uncommitted status could not be inspected because Git rejected its ownership in this environment. Verify its status in the owning Windows session before reuse or archival.

## Deployment and service state

| Surface | Recorded state | What remains unverified here |
| --- | --- | --- |
| Git push | Current `main` HEAD is recorded equal to local `origin/main`; the remote was not fetched for this review. | Whether GitHub changed after the last local remote-ref update. |
| Frontend deployment | No evidence in this checkout that `23e7ee9` was published to Lovable or the company domain. | Published commit/build, domain routing, and current PWA behavior. |
| Database migrations | Profiling handoff reports `0008` and `0009` applied and selected checks passed in Lovable Cloud on 2026-10-13. | Direct confirmation of migration ledger and present grants/RLS. The handoff notes two email-only profiles with legacy-format phones whose profile updates fail until normalized. |
| Edge Function | `phone-auth` source is in the repository. | Which function version/settings are deployed; no deployment is inferred from Git. |
| Payments | Fawaterak is prospective; checkout, payment records, webhooks, and server entitlements are absent. Subscription payment action is disabled. The 400/1200 EGP rule is a frontend estimate only. | Merchant EGP acceptance/payment methods, test credentials, renewal/refund decisions, and server-side pricing. |

## Pending decisions and blockers

- The display prices are approved in EGP; actual EGP collection still needs merchant confirmation. Before payment work, confirm merchant/API access, enabled methods, fees, refunds/disputes, annual renewal behavior, and coverage of future games. No automatic renewal is approved.
- Before limiting game access, implement and test server-owned entitlements; current `/app` access is intentionally open to both authenticated games during development.
- The two legacy-format phone profiles described in the profiling handoff need a safe data correction plan before their work-profile updates can succeed. Do not delete accounts or normalize production data without an approved, account-specific procedure.
- Existing security review findings and live authorization checks remain as documented in [SECURITY_REVIEW.md](SECURITY_REVIEW.md); a successful build or Git push does not close them.
- The Arabic historical reference records outstanding Reward Decision narrative/visual follow-up. Recheck relevant code and approved production assets before treating those older items as current blockers.

See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the architecture map and [THE_ANALYST_PROJECT_CONTEXT_AR.md](THE_ANALYST_PROJECT_CONTEXT_AR.md) for detailed history and product rationale.

## 2026-10-21 — Reward Decision V2 (not published)
- New flow: story → Sales (two separate documents) and HR («ملف معيار الأداء») → Analysis Room (5 tools, real-data histograms) → two-question Deduction Notebook → Final Report → Mahmoud then Marwan calls → Game Results. Meeting and recommendation board retired from play.
- Outcome: both answers correct → Mahmoud/success (2/2); otherwise Marwan/failure (1/2 or 0/2). Saves are schema v5 (`rowad-v3`); older saves migrate without granting success.
- Server evaluator for `rowad-v3` is prepared in `docs/sql/reward-decision-v3-evaluation.sql` but NOT applied; `SERVER_V3_EVALUATION_ENABLED` stays false until the owner approves it. Admin win/loss still comes from the `complete` event outcome.
