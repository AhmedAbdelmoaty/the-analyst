# The Analyst

The Analyst is IMP's platform for analytical thinking games. It includes **Problem Framing** ("أقل من المتوقع.. مقارنة بإيه؟"), **Reward Decision** ("قرار التكريم"), **Behind the Dots** ("ورا النقط"), **Crack the Code** ("الشفرة الأخيرة"), and **Decision Matrix** ("مصفوفة القرار — أول يوم في الشركة"). The games use the shared player account and game selection page. Behind the Dots, Crack the Code, and Decision Matrix store progress in browser local storage under separate namespaces for each authenticated user; these saves do not sync between devices. Crack the Code migrates compatible v1 preferences and level progress into its v2 save while preserving the old save. Subscription screens show a free “اسأل صح” plan and an annual display price of 1200 EGP, or 400 EGP for accounts with a confirmed Egyptian mobile number. Payment and paid access are **not implemented**.

## Architecture

- React 18, TypeScript, Vite 5, React Router 6, Tailwind CSS, shadcn/Radix, and Supabase JS.
- `/`, `/login`, `/signup`, and `/forgot-password`: public landing and player account forms. `/app`: authenticated entry and game selection. `/setup`: player profile. `/play`: Problem Framing. `/games/reward-decision`: Reward Decision. `/games/behind-the-dots`: Behind the Dots. `/games/crack-the-code`: Crack the Code, served in a full-screen iframe with per-user local saves. `/games/decision-matrix`: Decision Matrix in an authenticated standalone iframe with per-user local saves.
- `/plans`: public plan comparison. Choosing a plan carries a tab-scoped navigation intent through the existing account and profile flow; free leads to `/app` game selection and paid leads to `/subscription/summary`, where payment is disabled. `/subscription`: authenticated subscription page, currently showing a plan discovery card. Free routing to `/app` is temporary until server-side subscription access is implemented; all five games retain their sign-in and completed-profile protection and availability. These routes do not grant or restrict game access.
- `/admin/login`: email sign-in. `/admin/board-9k2x`: existing result board. `/admin/stats`: lazily loaded analytics dashboard with CSV and on-demand XLSX export. Admin permissions come from `user_roles` and database checks, not route names.
- New player setup collects department and industry after character selection. Existing complete accounts are not blocked by missing work details; `/app` offers a dismissible prompt and permanent `/profile/work` editor. Country insights derive from stored E.164 phone calling codes; shared prefixes and missing values are reported as ambiguous/unknown.
- The Users tab audience panels and filters are backed by protected `admin_users` database aggregation. They count accounts, not activity events; Other text is neutralized in CSV/XLSX exports.
- `supabase/functions/phone-auth` handles signup verification and password recovery. It sends OTP through ChakraHQ WhatsApp, stores HMACs server-side, and uses managed Supabase Auth. The frontend contains only public Supabase configuration.
- Problem Framing's time challenge, pause state, and checkpoints live in the browser; its completion is submitted to the backend. Reward Decision has a separate local save. Behind the Dots and Crack the Code use per-user local storage keys. Crack the Code's v2 save keeps compatible v1 scores/unlocks and preferences while leaving the original save intact and discarding an outdated active puzzle. Analytics visit and round events go through SQL RPCs. A local run using this project's `.env` can contact the configured live backend.
- PWA installation is optional. The worker is disabled in development and guarded in previews; account requests are not cached.

More detail: [project context](docs/PROJECT_CONTEXT.md), [current state](docs/CURRENT_STATE.md), and [security review](docs/SECURITY_REVIEW.md). The [comprehensive Arabic reference](docs/THE_ANALYST_PROJECT_CONTEXT_AR.md) preserves historical decisions separately from current status.

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

Reward Decision's newer local cinematic scene set lives in `src/features/reward-decision/assets/scenes/` (34 landscape/portrait pairs plus seven character masters). See [the scoped integration record](docs/REWARD_DECISION_CINEMATIC_INTEGRATION.md) for the semantic line mapping and asset-name exception. These files and code must be included together in a future commit/deployment; local presence alone does not mean they are published.

## Verification commands

```sh
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
npm run lint
npm run build
bun test tests/reward-decision.test.ts tests/round-persistence.test.ts tests/admin-results.test.ts tests/admin-analytics.test.ts
bun test tests/subscription-ui.test.ts tests/subscription-pricing-ui.test.tsx
npm --prefix tests/crack-the-code test
node tests/crack-the-code-save-migration.test.cjs
node --test tests/decision-matrix-integration.test.mjs
```

The unit tests use Bun, which must be installed separately if you want to run them. At the reviewed commit, lint has pre-existing errors; see the [security review](docs/SECURITY_REVIEW.md) for the check result. `npm run preview` serves a local production build. Build success does not verify live authentication, OTP delivery, database permissions, or the deployed site.

## Deployment boundary

Editing locally or committing changes does not deploy them. Pushing the Git branch can update the Lovable-connected source; publishing the site is a separate action. Edge Function deployment, database migrations, environment secrets, and Auth settings must be reviewed and applied separately to the intended backend. The migration history spans `supabase/migrations` and `drizzle/migrations`; do not replay it wholesale on an existing database.

## Subscription UI and planned payments

The UI presents a free “اسأل صح” tier and an annual plan for all available games. Its display price is 1200 EGP, reduced to 400 EGP only when the current Auth account has a confirmed Egyptian mobile number. The paid plan leads to an authenticated summary with a disabled payment button. All five games remain accessible under their current sign-in checks. Fawaterak is the prospective provider; EGP collection and enabled methods still need merchant confirmation. There is no checkout, subscription record, or entitlement enforcement in this repository today. A future server checkout must calculate the amount again from the verified account and grant access only after verified payment confirmation. See [subscription handoff](docs/SUBSCRIPTION_UI_HANDOFF.md) for integration points.
