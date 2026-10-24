# Paymob Integration Handoff — The Analyst (for Dr. Ahmed)
Date: 2026-10-24. Integration: Paymob Intention API + Unified Checkout, one-time annual payment, manual renewal.

## A. Exact URLs

- **Transaction Processed Callback (server-to-server webhook, POST):**
  `https://cfpyfwcccjzzhltyordf.supabase.co/functions/v1/paymob-webhook`
  Deployed and verified reachable; currently fails closed (503) because no HMAC secret is configured yet. Paymob appends `?hmac=<signature>`; the function verifies per the official transaction-callback field order with HMAC-SHA512 and constant-time comparison.
- **Customer return URL (browser redirect after Unified Checkout):**
  `https://theanalystedu.com/subscription/return`
  Also passed per-intention as `redirection_url`. The return page never activates a subscription; it only triggers server-side status re-read/reconciliation.
- **Checkout/status/reconcile endpoints** (called by the app, not by Paymob):
  `.../functions/v1/paymob-checkout`, `.../functions/v1/paymob-subscription`, `.../functions/v1/paymob-reconcile` on the same host.
- Production domain: `https://theanalystedu.com` (return URL host must match the live site when launched).

## B. Required merchant information (enter only via Lovable Cloud Secrets / secure channel — never by chat or email)

Secret names the backend already reads (missing values = checkout safely disabled):

| Secret | Source in Paymob dashboard |
|---|---|
| `PAYMOB_TEST_SECRET_KEY` / `PAYMOB_LIVE_SECRET_KEY` | Settings → Account Info → Secret Key |
| `PAYMOB_TEST_PUBLIC_KEY` / `PAYMOB_LIVE_PUBLIC_KEY` | Same page → Public Key (used only to build the hosted checkout URL) |
| `PAYMOB_TEST_API_KEY` / `PAYMOB_LIVE_API_KEY` | Settings → Account Info → API Key (used for Transaction Inquiry reconciliation) |
| `PAYMOB_TEST_HMAC_SECRET` / `PAYMOB_LIVE_HMAC_SECRET` | Settings → Account Info → HMAC Secret |
| `PAYMOB_TEST_INTEGRATION_IDS` / `PAYMOB_LIVE_INTEGRATION_IDS` | Payment Integrations list — comma-separated IDs, one per enabled method (card, wallet, etc.) |

Non-secret configuration flags (also entered as backend config):
- `PAYMOB_ENVIRONMENT` = `test` first, `live` only at launch.
- `PAYMOB_ENABLED` = `true` only after sandbox success + launch approval (absent = everything off).
- `PAYMOB_APP_ORIGIN` = `https://theanalystedu.com`.
- `PAYMOB_WEBHOOK_URL` = the webhook URL in section A.

Also confirm with the merchant account: merchant region (EG), that every listed Integration ID supports EGP, and which payment methods are actually enabled (cards, wallets, kiosk/Fawry).

## C. Merchant dashboard actions

1. For **each** Integration ID (Test mode first): open the integration → Callback settings → set the **Transaction Processed Callback** to the webhook URL in section A (POST, JSON body `obj` + `?hmac=` query). Card callback configuration does not automatically cover wallets or kiosk methods — configure each method's integration separately.
2. Where the dashboard offers a Transaction Response/redirect callback, set the customer return URL in section A. The intention-level `notification_url`/`redirection_url` are already sent by our checkout call, but some methods require dashboard-level registration regardless.
3. Verify Test mode toggle for sandbox keys/IDs; repeat all steps with Live values only at launch.

## D. Webhook test procedure (after secrets are set)

1. Send an unsigned POST → expect 401/503, no state change.
2. Send a malformed body → expect 503, no state change.
3. Trigger a real Test-mode payment from Unified Checkout → expect 200 `{received:true}`, order becomes `paid`, one `annual_entitlements` row (12 calendar months) appears for the buyer.
4. Re-send the same callback (Paymob retries do this) → second delivery is deduplicated; entitlement count stays 1.
5. Test a failed payment and a refunded transaction → order `failed` / entitlement revoked.
6. Temporarily break the webhook and use the app's pending-payment retry (reconcile) → order resolves via Transaction Inquiry.

Diagnostics for delayed/missing callbacks: check Edge Function logs for the four paymob-* functions, `payment_webhook_events` rows, and `payment_status_audit` transitions.

## E. Launch procedure

1. Receive Test credentials → enter via Lovable Cloud Secrets (never chat/email) → set `PAYMOB_ENVIRONMENT=test`.
2. Register Test callbacks in the Paymob dashboard (section C).
3. Flip `PAYMOB_ENABLED=true` in the backend config and set `PAYMENT_UI_ENABLED=true` in code for the test deployment.
4. Run sandbox end-to-end: 400 EGP path (confirmed EG mobile account) and 1200 EGP path, success + failure + refund + duplicate callback.
5. Receive Live credentials, repeat secrets/dashboard steps with Live values.
6. Only after written launch approval: `PAYMOB_ENVIRONMENT=live`, publish frontend, and separately approve enabling paid-game restrictions.
