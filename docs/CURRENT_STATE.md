# Current state — 2026-11-08

Short, current status only. Detailed history lives in Git and in [THE_ANALYST_PROJECT_CONTEXT_AR.md](THE_ANALYST_PROJECT_CONTEXT_AR.md).

## Investigation File
- The approved Egyptian Arabic opening, responsive evidence/lab/decision layouts, two tab-specific Felfel hints, and six-step explanation are now on `main`. Case data, verdict rules, scoring, saves, and platform behavior are unchanged.

## Games (8 in source)
All are in source and in the shared catalog; details in [GAME_REGISTRY.md](GAME_REGISTRY.md).
اسأل صح (free) · قرار التكريم · ورا النقط · الشفرة الأخيرة · مصفوفة القرار · ملف تحت التحقيق · أداء الفريق · مفارقة الربح.

## Platform
- Phone/password sign-up with WhatsApp OTP (`phone-auth`); admin via `user_roles`.
- Player setup (character, department, industry), branded arcade hub, public landing showcase, `/plans`.
- Catalog-driven admin statistics (`/admin/stats`) through protected `admin_*` RPCs; CSV/XLSX export.
- Analytics: owner-bound visit/round RPCs, GA4 (one page_view per route), Meta Pixel incl. `CompleteRegistration`.
- SEO: `sitemap.xml`, `robots.txt`, per-route canonical/OG, Organization/WebSite JSON-LD.
- Optional PWA (worker disabled in dev/preview).

## Source, GitHub, publication
- **Source / GitHub:** `main` is synced with Lovable through the `lovable-sync` branch (owner merged; Lovable reported "In sync").
- **Published:** owner reported publishing the version including «أداء الفريق» to theanalystedu.com. Later edits (repository cleanup) are not published until Publish is clicked.

## Payments
Paymob foundation exists (DB tables/RPCs and server functions reported deployed) but the payment button is gated off, sandbox testing waits for credentials, and **no paid entitlement is enforced**. See [PAYMOB_IMPLEMENTATION_STATUS.md](PAYMOB_IMPLEMENTATION_STATUS.md).

## Saves and limitations
- Game progress is browser localStorage per user (does not sync across devices). Problem Framing also submits completion to the backend.
- Profit Paradox is implemented in source as a five-level React game with full-viewport office scenes, floating controls, word-by-word character dialogue, automatic focus shifts, shuffled choice cards, interactive margin and revenue-mix charts, win/loss decision endings, a personal three-choice learning review, and a local per-user checkpoint. Four expression sprites were edited from the supplied cartoon characters; the original six poses remain available. No backend changes; it is not published.
- Server evaluators trust client-submitted evidence.
- Problem Framing now uses compact shared Home/Pause/Settings controls, game-only settings, and explicit handling when its saved checkpoint and timer cannot be reconciled. The office replay action was removed. Its existing per-user save keys remain unchanged.
- Problem Framing scene checkpoints now retain dialogue phase and line for the Mansour briefing, VELARO arrival, and ending call. The scene-progress record reads the prior single-scene format; older saves that never recorded a line can only resume at that scene's start.
- Reward Decision keeps its existing run controller and exact-position save; its HUD now opens game sound and restart settings. Behind the Dots keeps its own timed reducer and audio buses, with a compact settings entry and confirmed restart. Team Performance now saves its per-user round phase, selected answer, score, outcome, and option order locally.
- Crack the Code, Decision Matrix, and Investigation File remain iframe games. `IframeGameShell` exposes only commands acknowledged by the same-origin game. Crack the Code and Decision Matrix pause their actual timers and narration; Investigation File has no round timer and pauses interactions/animations/audio. The external 3rem return strips were removed from Decision Matrix and Investigation File.
- Investigation File now stores an optional owner-scoped checkpoint (scene, dialogue position, selections, hints, mix controls, and verdict choices) alongside the prior v1 progress record. Older in-progress records without a checkpoint still open at the introduction; completed outcomes remain intact.

## Known risks / pending
- `npm run lint` has pre-existing errors.
- Unused shadcn UI packages remain installed (kept to avoid breaking generated UI components).
- Root `sw.js` / `workbox-*.js` are PWA build outputs written by `vite.config.ts` (`swDest`); kept until the PWA output path is reviewed.
- Search Console not connected; public `/games` page deferred.
