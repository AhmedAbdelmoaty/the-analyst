# The Analyst

The Analyst is IMP's platform for analytical thinking games. It currently includes **Problem Framing** ("أقل من المتوقع.. مقارنة بإيه؟") and **Reward Decision** ("قرار التكريم"). Both games use the same player account and game selection page. Payment and paid access are **not implemented**.

## Architecture

- React 18, TypeScript, Vite 5, React Router 6, Tailwind CSS, shadcn/Radix, and Supabase JS.
- `/`, `/login`, `/signup`, and `/forgot-password`: public landing and player account forms. `/app`: authenticated entry and game selection. `/setup`: player profile. `/play`: Problem Framing. `/games/reward-decision`: Reward Decision.
- `/admin/login`: email sign-in. `/admin/board-9k2x`: existing result board. `/admin/stats`: lazily loaded analytics dashboard with CSV and on-demand XLSX export. Admin permissions come from `user_roles` and database checks, not route names.
- `supabase/functions/phone-auth` handles signup verification and password recovery. It sends OTP through ChakraHQ WhatsApp, stores HMACs server-side, and uses managed Supabase Auth. The frontend contains only public Supabase configuration.
- Problem Framing's time challenge, pause state, and checkpoints live in the browser; its completion is submitted to the backend. Reward Decision has a separate local save. Analytics visit and round events go through SQL RPCs. A local run using this project's `.env` can contact the configured live backend.
- PWA installation is optional. The worker is disabled in development and guarded in previews; account requests are not cached.

More detail: [project context](docs/PROJECT_CONTEXT.md) and [security review](docs/SECURITY_REVIEW.md). An older Arabic handoff is preserved as a separate local user file; it may predate current analytics work.

## Local setup

Use Node.js and npm; this checkout was verified with Node 24 and npm 11. Internet access is required for the existing cloud backend.

```sh
npm ci
npm run dev
```

Vite is configured for `http://localhost:8080`; use the address it prints if the port changes. The repo's `.env` contains only these **browser-visible** variable names:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use ignored `.env.local` for local overrides. Never put a Chakra token, OTP HMAC secret, Supabase service-role key, database migration credential, or future Fawaterak secret in a `VITE_` variable. The local frontend uses the configured cloud backend. Do not run migrations, send OTPs, or modify real accounts merely to check that the UI starts.

Lovable metadata in `*.asset.json` gives `__l5e` URLs rather than image bytes. The five PWA icons and 15 verified Reward Decision WebPs are under `public/__l5e` at their matching paths for local builds. Keep asset paths and portrait/landscape pairs intact.

## Verification commands

```sh
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
npm run lint
npm run build
bun test tests/reward-decision.test.ts tests/round-persistence.test.ts tests/admin-results.test.ts tests/admin-analytics.test.ts
```

The unit tests use Bun, which must be installed separately if you want to run them. At the reviewed commit, lint has pre-existing errors; see the [security review](docs/SECURITY_REVIEW.md) for the check result. `npm run preview` serves a local production build. Build success does not verify live authentication, OTP delivery, database permissions, or the deployed site.

## Deployment boundary

Editing locally or committing changes does not deploy them. Pushing the Git branch can update the Lovable-connected source; publishing the site is a separate action. Edge Function deployment, database migrations, environment secrets, and Auth settings must be reviewed and applied separately to the intended backend. The migration history spans `supabase/migrations` and `drizzle/migrations`; do not replay it wholesale on an existing database.

## Planned payments

Problem Framing is intended to remain free; additional games may require payment. Fawaterak is the prospective provider, pending merchant and product decisions. Pricing, currency, duration, recurrence, and future-game coverage are not set. Any eventual checkout must require an authenticated account, use provider-hosted payment, and grant access only after a verified server-side confirmation. There is no checkout or payment entitlement code in this repository today.
