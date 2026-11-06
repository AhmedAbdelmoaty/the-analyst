# Current state — 2026-11-06

Short, current status only. Detailed history lives in Git and in [THE_ANALYST_PROJECT_CONTEXT_AR.md](THE_ANALYST_PROJECT_CONTEXT_AR.md).

## Games (7)
All are in source and in the shared catalog; details in [GAME_REGISTRY.md](GAME_REGISTRY.md).
اسأل صح (free) · قرار التكريم · ورا النقط · الشفرة الأخيرة · مصفوفة القرار · ملف تحت التحقيق · أداء الفريق.

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
- «أداء الفريق» has no saved progress and no automated tests yet.
- Server evaluators trust client-submitted evidence.

## Known risks / pending
- `npm run lint` has pre-existing errors.
- Unused shadcn UI packages remain installed (kept to avoid breaking generated UI components).
- Root `sw.js` / `workbox-*.js` are PWA build outputs written by `vite.config.ts` (`swDest`); kept until the PWA output path is reviewed.
- Search Console not connected; public `/games` page deferred.
