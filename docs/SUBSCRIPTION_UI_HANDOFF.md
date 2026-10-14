# Subscription UI handoff

## Current interface

The public `/plans` page and authenticated `/subscription/summary` use `src/features/subscription/AnnualPrice.tsx` and `pricing.ts` for one **display estimate**. The annual base is **1200 EGP for one year**. An authenticated account with a confirmed Egyptian mobile number in managed Supabase Auth sees **400 EGP for one year** and the 1200 EGP base crossed out. A guest, an unconfirmed account, or an account without a valid Egyptian mobile number sees 1200 EGP. While AuthContext is loading, neither page shows a previous account's price.

The price source is `user.phone` plus `user.phone_confirmed_at` from the current Supabase Auth session. Auth stores the international phone with or without a leading `+`; the display rule accepts exactly `+?201[0125]` followed by eight digits. `profiles.phone`, the country selector, browser storage, route parameters, and email confirmation do not establish the discount. The offer follows the confirmed phone, regardless of residence. **The payment server must independently determine the real amount and currency from the authenticated, confirmed account.** Never accept a client supplied amount or discount flag.

The existing `free`/`annual` value in `planIntent.ts` is tab scoped navigation intent only. It survives signup, login, verification, and `/setup`; it is consumed at `/app` for free or `/subscription/summary` for annual. A normal login without a choice goes to `/app`. Both games remain available behind existing sign-in/profile checks while entitlement enforcement is being designed. The summary's payment button is disabled and creates no order.

`/subscription` currently passes `null` to `SubscriptionDetails`, presenting plan discovery without assigning a tier. `model.ts` and `SubscriptionDetails.tsx` provide presentation for future server supplied free, pending, active, failed, expired, and temporary verification-error states. Tests use synthetic snapshots only; there are no subscription records, test entitlements, or client-side success routes in production.

## Future Fawaterak integration points

1. Add an authenticated subscription read scoped to the session owner for `/subscription`; use its verified response to feed `SubscriptionDetails`. A read failure should use the temporary verification-error display, not a free-tier assumption.
2. Connect the disabled action in `/subscription/summary` to a **server endpoint** that creates an order for the signed-in account. The server chooses 400 or 1200 EGP from its verified Auth identity and approved pricing configuration, then creates a Fawaterak invoice and returns only the hosted checkout destination.
3. Handle provider notifications server-side. Verify authenticity, invoice status, order/account binding, amount, and EGP currency; update order and annual entitlement atomically and idempotently. A year begins on confirmed payment. Repeated or late notifications must not add another year accidentally.
4. A future return from hosted checkout may show pending, failed, or verification-error information, but a return URL is never proof of payment. Reload the server-owned subscription state before showing active access.
5. Enforce paid access to games in backend policies/functions before adding client route gates. Browser state, plan intent, results, and URL parameters cannot grant entitlement. The current `/app` route deliberately exposes both authenticated games during development.

No Fawaterak endpoint, secret name, webhook signature scheme, invoice, database migration, or Edge Function has been implemented by this UI task. Keep all provider credentials outside `VITE_`, source, and docs.

## Inputs still needed from IMP's merchant account owner

- API test environment and integration details through an approved secret channel.
- Confirmation that EGP collection is enabled, the payment methods actually active, settlement/fees, and how notifications are configured.
- Coordination for adding secrets and the provider notification URL.
- Decisions on renewal, refunds/disputes, and coverage of games added during a paid year before live checkout.
