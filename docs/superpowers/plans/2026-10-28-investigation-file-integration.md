# Investigation File Integration Plan

**Goal:** Add «ملف تحت التحقيق» as The Analyst's sixth authenticated game while preserving its Case #3 logic and Contrary cartoon feel.

**Architecture:** Package the existing vanilla HTML/CSS/ES modules and selected assets as a static same-origin game under `public/investigation-file/`. Add a protected React iframe route, one shared-catalog entry, and an owner-scoped browser progress record compatible with the existing static-game pattern.

**Audio:** Replace oscillator beeps with clearly mapped Contrary SFX for office entry, scene turns, record selection, clip attachment, weighing experiments, UI actions, and distinct win/failure endings. Reuse discrete effects only; do not bundle music whose provenance cannot be verified.

**Files:** `public/investigation-file/**`; `src/pages/InvestigationFileRoute.tsx`; `src/App.tsx`; `src/features/discovery/catalog.ts`; `src/features/discovery/progress.ts`; `src/lib/gameRoutes.ts`; focused Node integration tests; README and current/architecture docs.

**Non-goals:** No change to training data, puzzle rules, game dialogue, or outcomes; no entitlement/payment changes, server analytics schema, migrations, deployment, push, or unrelated game changes.

**Verification:** Node checks for Case #3 calculations, audio manifest/file provenance, save isolation/outcomes, and route/catalog wiring; TypeScript, lint on changed files if available, production build, and browser playthrough of both endings at desktop and mobile widths.
