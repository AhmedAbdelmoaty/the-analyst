# Current state

**Behind the Dots V6 animation and audio update — 2026-10-25:** On `feature/behind-the-dots-v6-adventure`, the four approved challenges, original three answers, 20-second timer, three hearts, evidence decision, and user-scoped saves remain intact. Added replayable GSAP ending choreography, sprite run frames and character poses, sound controls for music/SFX/ambience, and local licensed sound assets. Verification: 5/5 engine tests, 20/20 desktop/mobile Playwright scenarios, both TypeScript projects, production build, and focused ESLint with no errors (one existing React hook dependency warning). Browser captures are in [V6 verification](behind-the-dots-v6/verification/README.md); audio sources, licenses, event map, and unavailable cues are in the [audio manifest](../public/assets/behind-dots/audio/manifest.json). The ambience is a quiet refrigeration loop, not market crowd ambience; no dedicated jump/landing cue or continuous background score is available. No merge or deployment.

**Paymob preparation — 2026-10-24:** Disabled checkout/status/return UI and four staged payment functions are in source. Review-only SQL and local synthetic tests are under `docs/paymob/`; nothing was applied to Cloud or deployed/published. Existing games/auth/saves/admin access remain unchanged. Merchant credentials, isolated Test deployment approval, timestamp/refund contracts and full Paymob sandbox E2E are required before any enablement. See [Paymob handoff](paymob/HANDOFF_AR.md).

**Scoped local update — 2026-10-22:** Fixed Behind the Dots chart clipping at its source: SVG intrinsic height was expanding the grid row beyond its chart panel, so the plot now draws inside a constrained, aspect-preserving viewport. Rechecked current `main` through the same LAN preview URL on desktop (1366×768) and mobile (390×844): all chart axes and labels fit, with no page scroll. The mobile tutorial keeps the original two-step lesson flow and shows the whole plot. Correct-answer action was visually inspected in the live scene; its character movement and reward effects stay on top of the chart without hiding its axes. The local Vite preview is running at `http://192.168.30.39:8081`. No automated tests were run at the user's request. No commit, push, or deployment was made.

**Scoped local update — 2026-10-22:** Behind the Dots was rebuilt from the approved V5 package with the three fixed scatter-plot cases, 20-second rounds, three hearts, and one evidence-based recommendation. Added the interactive-only tutorial, Egyptian colloquial story, animated cast, responsive chart and outcome screens, and a V5 save namespace that preserves older progress. Focused Node tests, both TypeScript projects, production build, and desktop/mobile browser QA passed. The `file://` prototype could not be opened under the browser policy; its code and reference screenshots were inspected. No commit, push, or deployment was made.

**Scoped local update — 2026-10-22:** Reward Decision Analysis Room, Deduction Notebook, persistent case timer HUD, and all three result states received a responsive UI refinement. Follow-ups give desktop histograms more vertical space while retaining their aspect ratio, align the analysis tabs with the title row to raise the charts, and revise the opening celebration to congratulate Marwan’s team on the preliminary win while Sherif’s formal announcement and the ceremony remain pending. Real histogram data, questions, scoring, and saves were preserved. `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.node.json --noEmit`, and `npm run build` passed. Isolated browser QA captured desktop/mobile screens, confirmed all five metric buttons toggle at 390×844, confirmed four notebook choices and no horizontal overflow through 360×740. Bun tests could not run because Bun is unavailable. No commit, push, or deployment was made.

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

**Scoped local update — 2026-10-22:** Integrated Abdulhakim Elsayed’s dependency-free Crack the Code source as the authenticated fourth game at `/games/crack-the-code`. The original HTML/CSS/JavaScript and assets are served separately inside a full-viewport iframe; saves are namespaced by authenticated player ID, and the game’s platform logo returns to `/app`. Production build and app TypeScript checks passed. The ZIP-supplied test suite passed; desktop and touch-enabled mobile browser checks confirmed keypad input, no horizontal overflow at 390 px and 360 px, and unauthenticated route redirection. Desktop and mobile screenshots are saved under `artifacts/crack-the-code/`. No commit, push, deployment, or backend change was made.



**Scoped local update — 2026-10-22:** Replaced Crack the Code with the newer three-vault ZIP version. Preserved the authenticated route/card, per-player save namespace and mobile layout adaptation; existing level scores/unlocks remain compatible, while the active puzzle resumes only when its updated puzzle data is valid. The ZIP's full Node validation suite, both TypeScript checks, production build and git diff --check passed. No commit, push, or deployment was made.
