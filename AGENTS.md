# The Analyst — project rules

## How to work (keep tasks small)

1. Check `git status`, branch and HEAD; preserve local and untracked files.
2. Find the affected game in [GAME_REGISTRY.md](docs/GAME_REGISTRY.md) or the area in [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md).
3. Read only those source files and their direct dependencies — no whole-repo scans for narrow tasks.
4. Open broader references only when the task needs them: [CURRENT_STATE](docs/CURRENT_STATE.md), [security](docs/SECURITY_REVIEW.md), [profiling](docs/USER_PROFILING_HANDOFF.md), [subscription](docs/SUBSCRIPTION_UI_HANDOFF.md), [Paymob status](docs/PAYMOB_IMPLEMENTATION_STATUS.md), [Arabic full context](docs/THE_ANALYST_PROJECT_CONTEXT_AR.md). Setup/commands: [README](README.md).
5. Make small, focused changes; preserve unrelated behavior.
6. Choose checks by risk. FAST (isolated copy, CSS, UI or animation): edit directly and run only the relevant lint, typecheck or visual check. STANDARD (game flow or behavior): run typecheck/build and targeted tests; use one focused visual review when useful. CRITICAL (auth, payments, database, security, entitlement or save migration): validate affected boundaries more broadly, without touching production. Rerun a check only after a relevant fix; stop once the risk is resolved.
7. A commit, push or build is not a publication or deployment.
8. Keep completion reports brief: state the change, the checks actually run, and any remaining risk. For small tasks, do not create a planning document or repeat repository exploration. Consider available Skill descriptions even when the user names no Skill; load only those that materially help the task. See [Codex skills setup](docs/CODEX_SKILLS.md).

## Safety and behavior boundaries

- Treat configured Supabase/Lovable services as production unless an isolated test environment is verified. Local frontend runs can still contact live services.
- Do not expose credentials. Phone confirmation, WhatsApp OTP and password recovery belong to `phone-auth`; `profiles.phone` and roles remain protected. Never put Chakra, OTP-HMAC, service-role, or payment secrets in `VITE_` variables.
- Database migrations, Edge Function deployment, cloud settings, frontend publication, and Git push are separate actions. Never infer deployment from a commit or build. Do not mutate production data or deploy without explicit authorization.
- Preserve game dialogue, rules, scoring, timing, saves, and PWA behavior unless the task explicitly authorizes a scoped change. Server evaluators use client-submitted evidence; they do not independently attest gameplay.
- Analytics writes must remain owner-bound through approved RPCs; admin reporting and exports must retain server-side role checks. Do not aggregate private user data from paginated browser rows.
- Subscription UI is not an entitlement. All games currently retain existing authentication access; never grant paid access from browser state, plan intent, scores, or URL parameters.
- Stage unapproved payment Edge Functions and SQL under `docs/paymob/`, outside automatic deployment paths, so source preparation cannot mutate shared services; move/deploy/apply only with explicit approval.
- Payment fulfillment must bind provider-verified transaction/order/amount/currency/integration to a server-priced owner order, with atomic service-role-only RPCs and environment-separated entitlements; redirects and unsigned callback metadata never grant access.
- Preserve `.lovable/north-star/north-star.md` unchanged.

## Architecture rules

- Use the shared discovery catalog for public, authenticated and plan game previews and tier mapping; journey storage contains allowlisted navigation only, never payment access. Mark first-time plan onboarding only after successful account creation and verification, before sign-in; returning logins skip it.
- Keep Reward Decision presentation styles and reference-adapted components scoped to its feature; reuse its existing data, save controller and sound provider so other games and platform features remain unchanged.
- Dialogue documents use an independent reader; the HUD opens the separate case-file index, while the controller persists collection before visual feedback so animations cannot gate saving.
- Reward Decision server evaluation for a new case version is enabled only via `SERVER_V3_EVALUATION_ENABLED` after its SQL is approved and applied, so client and server scoring never diverge.
- GA4 tag lives once in index.html with send_page_view:false; GaPageViews inside BrowserRouter sends one page_view per path change, so new React routes inherit tracking. Iframe games are tracked at their parent route only; standalone HTML pages or other domains need their own tag.
- Iframe games load assets by runtime string paths; check JS/CSS/HTML string references before deleting any `public/` asset.

## Documentation maintenance

- When a feature, product decision or deployment state changes, update the relevant doc in the same task. Keep `docs/CURRENT_STATE.md` short and current; history belongs in Git, not new archive files.
- Generated test output, screenshots and preview captures are git-ignored; never commit them.
