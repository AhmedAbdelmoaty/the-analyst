# Security review — 2026-10-12

**Scope:** local `main` at `494d20726ea85ff1c3fba6381cbbf6e4de4331b4`, matching fetched `origin/main` (`0` ahead, `0` behind). This is a repository review, not a certification or an audit of the deployed Supabase project. Existing uncommitted lockfile, Arabic handoff, and local game assets were preserved.

## Coverage and evidence

- Read routes, account and admin UI, `phone-auth`, analytics clients, game submission, PWA, manifest, migration SQL, and export code. Searched repository source for credentials, logging, storage policies, and privileged RPCs.
- Scanned added lines in all 267 reachable Git commits (31,916 added lines) for selected private-key, provider-secret, privileged environment assignment, and JWT patterns. This targeted scan is **not** a full entropy/secret-scanner audit. Gitleaks and TruffleHog were not installed; CodeRabbit was not used because it would send source to an external review service.
- The sole JWT-pattern match was the tracked `.env` browser key. Its decoded role is `anon`; its value is deliberately omitted here. The source contains environment-variable *reads* for Chakra, OTP HMAC, and service-role credentials, with no matching privileged literal in the targeted history scan. A public anon key is not a server credential; its safety depends on correct RLS and RPC grants.
- Ran npm's advisory query on the lockfile with `--omit=dev`: **16 package entries (10 high, 6 moderate, 0 critical)** after lockfile reconciliation. These include `react-router-dom` and `exceljs` (runtime dependencies) and `postcss` and `tailwindcss` (direct development dependencies), plus transitives. npm reports some fixes only through a major Tailwind move or an ExcelJS downgrade; no automatic upgrade was applied. These are dependency findings, not demonstrated exploits or gameplay regressions. Because the base lockfile omitted whole trees, this review has no reliable before/after advisory count.
- Inspected local PWA references: five manifest/Apple icon PNG paths had no files under `public/__l5e`. On 2026-10-12 all five local files matched their corresponding public `https://the-analyst-game.lovable.app` assets byte-for-byte by SHA-256, with HTTP 200 and `image/png`; sizes also match their tracked metadata. Fifteen previously untracked Reward Decision WebPs were retained; each has a tracked `.asset.json` URL, a code import in `data/assets.ts` (the cover also appears in `Games.tsx`), and a local size matching metadata. No image IDs or manifest URLs changed.

## Lockfile reconciliation against `494d207`

`package.json` did not change. Its existing requirements for `@fontsource/cairo`, `country-flag-icons`, `exceljs`, `drizzle-kit`, `drizzle-orm`, `postgres`, and `vite-plugin-pwa` were absent from both the base lockfile root declarations and its package entries. `npm install --package-lock-only --ignore-scripts` filled those seven roots and their dependency trees: 477 package entries were added, and the now-unreferenced `@jridgewell/set-array` entry was removed. Re-resolution also changed **13 existing transitive versions** within allowed dependency ranges; the earlier description of the lockfile as only an ExcelJS alignment was incomplete. No direct manifest version or major package was intentionally upgraded.

| Existing transitive package | Base → current |
| --- | --- |
| `@jridgewell/gen-mapping` | 0.3.5 → 0.3.13 |
| `@jridgewell/sourcemap-codec` | 1.5.0 → 1.6.0 |
| `@jridgewell/trace-mapping` | 0.3.25 → 0.3.31 |
| `browserslist` | 4.25.1 → 4.29.3 |
| `caniuse-lite` | 1.0.30001727 → 1.0.30001815 |
| `debug` | 4.3.7 → 4.4.3 |
| `electron-to-chromium` | 1.5.192 → 1.5.449 |
| `foreground-child` | 3.3.0 → 3.3.1 |
| `hasown` | 2.0.2 → 2.0.4 |
| `is-core-module` | 2.15.1 → 2.17.0 |
| `node-releases` | 2.0.19 → 2.0.57 |
| `resolve` | 1.22.8 → 1.22.13 |
| `update-browserslist-db` | 1.1.3 → 1.3.3 |

The `@jridgewell/*` entries serve source-map tooling; the Browserslist entries serve browser-target data; `debug`, `foreground-child`, `hasown`, `is-core-module`, and `resolve` are shared transitive utilities. These changed as npm rebuilt an incomplete lockfile, not through a requested feature upgrade. The full package delta remains reviewable in `git diff -- package-lock.json`; a clean install and build passed with the current lockfile. Do not revert it without restoring the missing trees and repeating verification.

## Confirmed findings and status

| Priority | Finding and evidence | Status / action |
| --- | --- | --- |
| High before paid access or prize decisions | `track_round_event` in `drizzle/migrations/0006_round_start_order_fix.sql` derives `user_id` from `auth.uid()` but computes `server_outcome` from client-supplied `_payload`. `pf_evaluate` trusts submitted framing/history/track state; `rd_evaluate` trusts submitted team, arguments, tools, and collected docs. `set_completed_player_qualified` then uses that calculated outcome. A signed-in caller can submit a fabricated strong payload for **their own** round without proving the UI path. | Open architectural trust gap. Server scoring is consistent with submitted values, not independent gameplay attestation. Do not use it to grant paid access, valuable rewards, or anti-cheat claims. A later design needs server-owned progression/evidence or a separate trusted eligibility rule, with isolated-backend regression tests and a reviewed deployment. No broad gameplay or SQL rewrite was made here. |
| Medium | The base lockfile omitted seven already declared direct requirements and their trees, so clean installation could fail. The working lockfile already contained local changes from an earlier setup. | Reconciled using `npm install --package-lock-only --ignore-scripts`; 13 existing transitive versions also changed. Direct manifest versions stayed unchanged. See the exact delta above and the install/build checks below. |
| Medium | npm audit reports advisories in the current dependency tree, notably the direct React Router package and the lazily loaded admin export library. | Open. Review individual advisories, exact installed versions, exploit paths, and safe update candidates in a dedicated dependency change. Do not apply npm's major Tailwind move or ExcelJS downgrade without regression coverage. |
| Low, local packaging | Manifest and Apple-touch icon paths lacked local PNG bytes. | Fixed locally with five files that match the published assets by SHA-256 and metadata size; the production build contains them. Published-site behavior after a future sync remains unverified. |

## Repository controls observed; deployment unverified

- `phone-auth` keeps Chakra and HMAC values in server environment reads; OTPs are HMACed, SQL `otp_attempt` locks the challenge row, and reset tokens are single-use database updates. The source has send/verify rate limits and logs only provider status or generic errors. Live function deployment, JWT verification setting, CORS behavior, rate-limit persistence, and Auth phone auto-confirm setting still require inspection in Lovable/Supabase.
- `profiles` RLS selects by `auth.uid()` and the later Drizzle SQL revokes generic client writes, regranting updates only for name/gender/avatar columns. `user_roles` has read policies but no client write policy in the inspected migrations. `completed_players` later has an own-account insert policy and a server trigger for `qualified`. These are source claims until live grants, policies, triggers, and migration order are checked.
- Analytics tables have RLS enabled and `0005_analytics_revoke_client_table_access.sql` revokes anon/authenticated table grants. `track_round_event` uses `auth.uid()` for stored owner and does not accept a caller-provided user ID. `track_visit` binds a signed-in segment to `auth.uid()` and uses a hashed secret for anonymous segments. The `admin_*` SECURITY DEFINER functions reviewed check `has_role(auth.uid(), 'admin')` before returning PII or changing test flags; their fixed search path and grants are in the migrations. These checks do not establish what SQL is deployed now.
- `/admin/stats` and `/admin/board-9k2x` have client guards, but protection must come from RLS/RPC checks. Exported user data includes phone numbers, so access and download handling deserve an admin-role live test. CSV/XLSX export neutralizes general text formula prefixes; numeric phone strings are emitted in a controlled text formula to preserve formatting.
- Browser saves and analytics queues are writable by the account holder's browser. The round client checks the active session before flushing its queue, but a user can still forge activity for **their own** account via the allowed RPC; active time is client-reported and bounded by server wall time, not independently measured. Neither local storage nor a game outcome is a payment entitlement.
- No application Supabase Storage API use or storage bucket policy appeared in the reviewed source. Verify the live project's buckets/policies separately if any exist.

## Verification performed

| Check | Result |
| --- | --- |
| `git fetch origin main` and compare | Completed; no divergence. No fast-forward because the working tree had local changes. |
| Targeted Git-history and `.env` classification | Completed as described above; no privileged literal matched the selected patterns. |
| `npm audit --json --omit=dev` | Completed; 16 advisory entries. Exit 1 denotes reported vulnerabilities. |
| `npm ci --no-audit --no-fund` | Passed; 792 packages installed from the reconciled lockfile. |
| `npx tsc -p tsconfig.app.json --noEmit` and `npx tsc -p tsconfig.node.json --noEmit` | Both passed. |
| `npm run lint` (rerun 2026-10-12) | Failed with 12 errors and 11 warnings in unchanged application/test/function source (notably explicit `any` and one `prefer-const`). This is the existing lint baseline, separate from the documentation, lockfile, and asset changes; no new lint failure was observed in changed source. |
| `npm run build` (rerun 2026-10-12) | Passed. Vite reported large-chunk warnings; admin statistics and Excel remain separate chunks. All 5 PWA PNGs and 15 Reward Decision WebPs are present in `dist` at their referenced paths. |
| Built frontend marker scan | No `CHAKRA_ACCESS_TOKEN`, `OTP_HMAC_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `FAWATERAK_`, `sb_secret_`, or `sk_live_` marker found in built JS/CSS/HTML/JSON. This pattern scan does not prove the absence of every possible secret. |
| Four Bun suites in README | Passed on 2026-10-12 with the official `bun@1.4.3` npm package via `npm exec --yes --package=bun@1.4.3 -- bun test tests/reward-decision.test.ts tests/round-persistence.test.ts tests/admin-results.test.ts tests/admin-analytics.test.ts`: 45 passed, 0 failed, 186 assertions. The first sandboxed npm invocation could not access the registry/cache (`EACCES`); approved registry access allowed the run without changing project dependencies. |
| Synthetic CSV/XLSX export | Passed locally using `toCsv` and `buildXlsx` with fake Arabic, formula-like name, and phone data. CSV retained UTF-8 BOM and escaped formula input; XLSX produced a 6,671-byte ZIP workbook, reloaded through ExcelJS with the expected row, text phone value, and `@` number format. No admin RPC or production data was used. |
| Local navigation smoke test | Passed with Vite on `127.0.0.1:8087` and `VITE_SUPABASE_URL=http://127.0.0.1:9` plus dummy project/key overrides (confirmed in served module). Browser reached public landing, `/login`, `/forgot-password`, and `/admin/login`; anonymous `/app` redirected to `/`, and `/admin/stats` redirected to `/admin/login`. Authenticated selection, games, and admin export UI were not exercised because no isolated backend identities were available. |
| PWA/game asset references | Five PNGs matched published bytes and tracked metadata; all 15 local Reward Decision WebPs matched tracked metadata paths/sizes and code imports. |
| Live role/OTP/payment checks | Not run. The configured backend is treated as production, and no isolated database or test identities were provided. |

## Required isolated-backend and Lovable checks

1. In a **separate test project**, apply the correct migration chain deliberately, deploy `phone-auth` with test secrets, and inspect function JWT verification, Auth phone auto-confirm, CORS, and rate limits. Do not replay both migration histories against production.
2. With anonymous, user A, user B, and admin sessions: inspect actual grants/RLS in `pg_catalog`; verify A cannot select/update B's profile, `user_roles`, completions, visits, rounds, events, flags, or export logs. Verify neither A nor B can write roles or `profiles.phone` or call admin export/detail/test-flag RPCs. Verify `track_round_event` records only the caller's `auth.uid()` and rejects anonymous calls and malformed payloads. Confirm admin can access only intended reporting functions.
3. Test OTP concurrency, resend/verify throttles, reset-token single use, and phone-confirm state with test numbers only. Observe logs for accidental codes, passwords, reset tokens, phone numbers, and provider response bodies.
4. Check the current Lovable site build and PWA icon responses after any approved Git sync, then independently verify which Edge Function and SQL versions are actually deployed. Confirm audit/export visibility and the qualified trigger with test data in isolation.
5. Before Fawaterak work, confirm IMP's merchant API/webhook contract and remaining product decisions. Create server-owned payment records and entitlements; verify webhook signature/authenticity, idempotency, amount/currency/order binding, expiry/refund behavior, and account ownership. The browser must not grant access from redirect parameters, local storage, or game scores. A later local change added subscription display screens only; this review did not test a payment integration or entitlement enforcement.
