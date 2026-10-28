# The Analyst — project overview

The Analyst is IMP’s shared platform for story-led practice in analytical thinking and business decisions. It contains **Problem Framing** (`/play`, “اسأل صح”), **Reward Decision** (`/games/reward-decision`, “قرار التكريم”), **Behind the Dots** (`/games/behind-the-dots`, “ورا النقط”), **Crack the Code** (`/games/crack-the-code`, “الشفرة الأخيرة”), **Decision Matrix** (`/games/decision-matrix`, “مصفوفة القرار — أول يوم في الشركة”), and **Investigation File** (`/games/investigation-file`, “ملف تحت التحقيق”). They are selected from the authenticated `/app` page and use a shared player account. Browser saves for Behind the Dots, Crack the Code, Decision Matrix, and Investigation File use separate per-user local storage namespaces; they do not sync between devices. Crack the Code migrates compatible v1 preferences and level progress to its v2 save while preserving the legacy save. Preserve approved game content and behavior unless a task explicitly changes it.

## Architecture map

| Area | Entry points |
| --- | --- |
| Routes and access | `src/App.tsx`, `src/contexts/AuthContext.tsx`, `src/pages/Games.tsx` |
| Phone auth and WhatsApp OTP | `src/lib/phoneAuth.ts`, `supabase/functions/phone-auth/` |
| Problem Framing | `src/components/game/`, `src/lib/pf-*` |
| Reward Decision | `src/features/reward-decision/` |
| Behind the Dots | `src/features/behind-the-dots/`, `src/pages/BehindTheDotsRoute.tsx` |
| Crack the Code | `src/pages/CrackTheCodeRoute.tsx`, `public/crack-the-code/` |
| Decision Matrix | `public/decision-matrix/`, `src/pages/DecisionMatrixRoute.tsx`, [handoff](DECISION_MATRIX_HANDOFF_AR.md) |
| Investigation File | `public/investigation-file/`, `src/pages/InvestigationFileRoute.tsx`, [handoff](INVESTIGATION_FILE_HANDOFF_AR.md) |
| Work profiles and audience insights | `src/features/profile/`, `src/features/admin-stats/`, `src/pages/AdminStats.tsx` |
| Visits, rounds, admin reporting | `src/lib/analytics/`, `src/components/analytics/`, `drizzle/migrations/` |
| Subscription screens | `src/features/subscription/`, `src/pages/PlanChoice.tsx`, `src/pages/SubscriptionSummary.tsx`, `src/pages/MySubscription.tsx` |
| PWA and Lovable assets | `public/manifest.webmanifest`, `src/lib/registerAppWorker.ts`, `vite.config.ts`, `public/__l5e/` |

The frontend is React, TypeScript, and Vite. Supabase/Lovable Cloud provides managed auth, PostgreSQL, SQL RPCs/RLS, and Deno Edge Functions. Browser saves are not cloud saves. The repository has both Drizzle and Supabase migration histories; inspect the target database’s applied history before any migration work.

## Current boundaries

- Player login is phone/password with WhatsApp OTP handled by the server-side `phone-auth` function. Admin access uses email auth and `user_roles`.
- Admin statistics are served through protected `admin_*` RPCs; analytics tables are not directly writable by clients.
- Work-profile fields and audience reporting are implemented in source. `docs/USER_PROFILING_HANDOFF.md` records that migrations `0008` and `0009` were applied to Lovable Cloud; treat that as reported evidence and independently verify the target environment before relying on it.
- `/plans`, subscription summary, `/subscription`, and the post-game invitation are UI/navigation only. The annual display price is 1200 EGP, or 400 EGP for an Auth-confirmed Egyptian mobile number. The annual CTA is disabled for payment; no payment ledger, webhook, verified entitlement, or game restriction is implemented. All six games remain available behind the existing authentication and completed-profile checks.
- Crack the Code uses a full-screen iframe and per-user browser save. Its v2 storage migrates compatible v1 preferences and level progress without deleting the legacy save; stale active puzzle sessions are not resumed.
- A local frontend run may still contact the configured live backend. Git push, Lovable frontend publication, SQL migration, Edge Function deployment, and cloud configuration are separate.

## Read next

- Latest recorded statuses: [CURRENT_STATE.md](CURRENT_STATE.md)
- Product decisions, historical rationale, game details, and known issues (Arabic): [THE_ANALYST_PROJECT_CONTEXT_AR.md](THE_ANALYST_PROJECT_CONTEXT_AR.md)
- Security scope and limitations: [SECURITY_REVIEW.md](SECURITY_REVIEW.md)
- Profiling schema and activation notes: [USER_PROFILING_HANDOFF.md](USER_PROFILING_HANDOFF.md)
- Subscription UI and future payment boundary: [SUBSCRIPTION_UI_HANDOFF.md](SUBSCRIPTION_UI_HANDOFF.md)
- Setup and verified commands: [README.md](../README.md)
