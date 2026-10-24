# Paymob Implementation Status — The Analyst
Date: 2026-10-24. Scope: additive, non-destructive payment foundation. No live charges, no paid-game restrictions enabled.

## Readiness register

| Deliverable | State | Evidence |
|---|---|---|
| DB schema (payment_orders, payment_attempts, payment_webhook_events, annual_entitlements, payment_status_audit) | IMPLEMENTED AND VERIFIED | Migration `drizzle/migrations/0010_paymob_payment_foundation.sql` applied to connected Lovable Cloud DB; tables and owner RLS policies confirmed by direct catalog queries. |
| Server RPCs payment_begin / payment_apply_event | IMPLEMENTED AND VERIFIED | Present in live DB; EXECUTE revoked from anon/authenticated, granted to service_role only. Local PostgreSQL harness passed: RLS ownership, idempotency, duplicate prevention, pending/failed/paid/refund/void, leap-year 12-month expiry. |
| paymob-checkout function | DEPLOYED BUT NOT VERIFIED (credentials) | Deployed to connected project. No-auth request → 401. Full flow waits for Test Secret Key + Integration IDs. |
| paymob-webhook function | DEPLOYED AND NEGATIVE-VERIFIED | URL reachable; unsigned POST → 503 fail-closed; malformed body → 503; OPTIONS → 200. Valid-HMAC path tested only with synthetic fixtures in unit tests. |
| paymob-subscription function | DEPLOYED BUT NOT VERIFIED (credentials) | Deployed; no-auth → 401. |
| paymob-reconcile function | DEPLOYED BUT NOT VERIFIED (credentials) | Deployed; no-auth → 401. Uses Paymob Transaction Inquiry; waits for Test API Key. |
| Frontend wiring (summary button, return page, status hook) | IMPLEMENTED BUT LAUNCH-GATED | `PAYMENT_UI_ENABLED = false` in `src/features/subscription/paymentApi.ts`; server additionally refuses without `PAYMOB_ENABLED=true` + credentials. API layer, safe checkout-URL validation, pending-order reconciliation call all coded and unit-tested. |
| Pricing rules 400/1200 EGP server-side | IMPLEMENTED AND VERIFIED | `priceForIdentity` reads verified Auth identity only; unit tests cover eligible EG phone, unconfirmed phone, tampering irrelevance. |
| Entitlement control for games | NOT IMPLEMENTED (by design) | No public enforcement until launch authorization. Current development access unchanged. Server-owned entitlement reads exist via annual_entitlements RLS; route guards are a separate approved step. |
| Admin payment views | NOT IMPLEMENTED | Server-only tables are queryable by existing admin RPC pattern; a minimal admin payments panel is a follow-up task, intentionally not auto-built. |
| Sandbox end-to-end payment | WAITING FOR PAYMOB CREDENTIALS | Requires Test Secret/Public Keys, Integration IDs, HMAC Secret, API Key. |
| Paymob dashboard callback config | WAITING FOR PAYMOB DASHBOARD CONFIGURATION | URLs listed in HANDOFF doc; must be registered per integration/payment method in the merchant portal. |
| Live launch | WAITING FOR LIVE LAUNCH APPROVAL | Plus Live credentials and separate mode flag. |

## Deployed endpoints (verified reachable 2026-10-24)

- Webhook (Transaction Processed Callback, server-to-server): `https://cfpyfwcccjzzhltyordf.supabase.co/functions/v1/paymob-webhook`
- Checkout initiation: `https://cfpyfwcccjzzhltyordf.supabase.co/functions/v1/paymob-checkout`
- Subscription status: `https://cfpyfwcccjzzhltyordf.supabase.co/functions/v1/paymob-subscription`
- Reconciliation: `https://cfpyfwcccjzzhltyordf.supabase.co/functions/v1/paymob-reconcile`
- Customer return route (frontend): `https://theanalystedu.com/subscription/return` (route implemented; live after next frontend publish).

## Tests run

- `bun test tests/paymob.test.ts tests/subscription-ui.test.ts tests/subscription-pricing-ui.test.tsx` → 32 pass / 0 fail (103 assertions): HMAC canonical string + timing-safe verify, valid/invalid fixtures, transaction state mapping, amount/currency/order/integration matching, checkout URL validation, pricing eligibility, UI states.
- `scripts/test-paymob-db.sh` (local ephemeral PostgreSQL) → schema applies cleanly; RLS owner isolation; RPC idempotency; duplicate callback; multiple attempts on one order; refund/void revocation; 12-calendar-month expiry incl. leap year.
- Deno type-check of all four function entrypoints → clean (earlier run; sources unchanged since).
- Live negative-security probes against deployed endpoints (results above).

## Not run / not claimable

- No real or sandbox Paymob transaction has occurred. No valid-HMAC live callback has been received from Paymob. No paid entitlement exists for any real user. Frontend was not published in this task.
