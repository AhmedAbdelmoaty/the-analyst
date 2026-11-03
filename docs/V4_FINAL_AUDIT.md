# V4 final audit and pre-merge cleanup

**2026-11-03.** Branch `codex/light-premium-v2`; pushed baseline HEAD `7c7a6ee0661cbcb41893ea73d169013bc639b7a7` before this local cleanup. Baseline comparison: `origin/main` at `5a2461e793a445ed0dd32dacd0700aecc26cdc05`, confirmed by `git fetch origin main` during this audit.

## Cleanup boundary

The 67 tracked files under `artifacts/gaming-v2/`, `artifacts/gaming-v3/`, and `artifacts/gaming-v4/` total **35,641,435 bytes**. They are generated screenshots, Playwright `.last-run.json` output, and V2 exploratory music analysis/player files. `git rm --cached` removed their Git tracking only: all files remain in this worktree for review. `.gitignore` prevents the test runners from adding them again. The Playwright specs generate captures at these paths; no application runtime imports them. Documentation mentions their location as local review evidence. The production source and build output are unchanged by this cleanup.

Retained: the V4 `arcade-arena.webp` background and all original game covers; the V3 `luminous-courtyard.webp` because `tests/gaming-v3/preview.html` still uses it; all shipped audio, CC0 license and provenance files; the candidate tracks because the V2/V3/V4 audition pages and audio manifest reference them; V2/V3/V4 test source, fixture and preview HTML; implementation and security documentation. `dist/` is already ignored and has no tracked files.

No source component, style, audio, asset, route, payment, backend, game, or save file was changed in this cleanup. Test observations and merge recommendation are recorded below after verification.

## Verification and boundaries

After cleanup, `tsc -p tsconfig.app.json --noEmit`, `tsc -p tsconfig.node.json --noEmit`, production `npm run build`, `npm test` (12/12), V2 Playwright (21/21), V3 Playwright (8/8), and V4 Playwright (11/11) passed. A new isolated V4 regression test navigated from each of the six original Hub cards to its existing route (1/1). Focused ESLint reported **0 errors, 2 existing Fast Refresh warnings** in `PlatformAudio.tsx`. Vite reported its existing large-chunk warning. `git diff --check` passed.

The synthetic browser suites cover the first-time Plans → Setup → Hub continuation after account verification, the returning-player Hub, both plans and 400 EGP verified-phone display, unknown/denied access, profile editing, truthful local progress badges, audio unlock/mute/volume/game-route silence, responsive Desktop/Tablet/Mobile screenshots, hover, keyboard, carousel manual/automatic/reduced-motion behavior, and absence of duplicate name inputs. Fresh captures are available locally under `artifacts/gaming-v4/` after running the tests. Visual inspection of the 1280 px Hub and 390 px Character/Plans captures found no obvious clipping or horizontal overflow; the tests assert viewport width at 360/390/768/1280 px.

Synthetic browser fixtures cannot certify live Signup/OTP, Supabase RLS, provider payment, or server entitlements. The repository currently has no active payment checkout or server-enforced paid-game entitlement; existing documentation describes the Annual amount as a UI display price and the payment action as disabled. Deep save/resume gameplay was outside this UI-only audit and was not exercised in all six games. These are verification limits, not V4 cleanup changes.

**Recommendation: GO for reviewing a UI-only merge into `main`; NO-GO for treating that merge as production deployment approval.** Preserve the existing payment/access boundary, separately verify live authentication and server security before publication, and do not claim paid access enforcement from these frontend tests. No push, merge, deployment or production data operation was performed in this audit.
