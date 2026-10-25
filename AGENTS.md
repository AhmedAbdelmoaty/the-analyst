# The Analyst — project rules

## Start with the relevant context

- Check `git status`, branch, and HEAD before editing; preserve local and untracked files.
- Read [README.md](README.md) for setup and commands, [CURRENT_STATE.md](docs/CURRENT_STATE.md) for the latest recorded status, and [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) for the architecture map.
- For task details, consult only the relevant reference: [security review](docs/SECURITY_REVIEW.md), [user profiling](docs/USER_PROFILING_HANDOFF.md), [subscription UI and payment boundary](docs/SUBSCRIPTION_UI_HANDOFF.md), or the [comprehensive Arabic context](docs/THE_ANALYST_PROJECT_CONTEXT_AR.md). [The older Arabic handoff](docs/The-Analyst_Codex_Handoff_AR.md) is historical.
- Do not scan or read the whole repository for a narrow task; follow the affected code path and its dependencies.

## Safety and behavior boundaries

- Treat configured Supabase/Lovable services as production unless an isolated test environment is verified. Local frontend runs can still contact live services.
- Do not expose credentials. Phone confirmation, WhatsApp OTP and password recovery belong to `phone-auth`; `profiles.phone` and roles remain protected. Never put Chakra, OTP-HMAC, service-role, or payment secrets in `VITE_` variables.
- Database migrations, Edge Function deployment, cloud settings, frontend publication, and Git push are separate actions. Never infer deployment from a commit or build. Do not mutate production data or deploy without explicit authorization.
- Preserve game dialogue, rules, scoring, timing, saves, and PWA behavior unless the task explicitly authorizes a scoped change. Server evaluators use client-submitted evidence; they do not independently attest gameplay.
- Analytics writes must remain owner-bound through approved RPCs; admin reporting and exports must retain server-side role checks. Do not aggregate private user data from paginated browser rows.
- Subscription UI is not an entitlement. Both games currently retain existing authentication access; never grant paid access from browser state, plan intent, scores, or URL parameters.
- Stage unapproved payment Edge Functions and SQL under `docs/paymob/`, outside automatic deployment paths, so source preparation cannot mutate shared services; move/deploy/apply only with explicit approval.
- Payment fulfillment must bind provider-verified transaction/order/amount/currency/integration to a server-priced owner order, with atomic service-role-only RPCs and environment-separated entitlements; redirects and unsigned callback metadata never grant access.

## Documentation maintenance

- Keep Reward Decision presentation styles and reference-adapted components scoped to its feature; reuse its existing data, save controller and sound provider so other games and platform features remain unchanged.
- Dialogue documents use an independent reader; the HUD opens the separate case-file index, while the controller persists collection before visual feedback so animations cannot gate saving.

When a significant feature, product decision, or deployment state changes, update the relevant documentation as part of that task. Minor edits do not require broad documentation rewrites. Keep `docs/CURRENT_STATE.md` short and dated; preserve historical context in its reference without presenting it as current behavior.

- Reward Decision server evaluation for a new case version is enabled only via `SERVER_V3_EVALUATION_ENABLED` after its SQL is approved and applied, so client and server scoring never diverge.

- Use the shared discovery catalog for public, authenticated and plan game previews and tier mapping; journey storage contains allowlisted navigation only, never payment access. Mark first-time plan onboarding only after successful account creation and verification, before sign-in; returning logins skip it.
