# THE ANALYST — GAMING EXPERIENCE V2
## IMPLEMENT NOW: Complete implementation brief, starting from the latest official `origin/main`

**Date:** 2026-11-02. **Product UI:** natural Egyptian Arabic, RTL. **Audience:** adult/professional learners. **Implementation environment:** Windows + Codex + React 18 / TypeScript / Vite 5. **Work mode:** local isolated Git worktree from latest verified `origin/main`. **Objective:** actually build and locally test the new gaming experience, not just generate pictures or a concept report. **NO PUSH OR DEPLOY.**

## 0 — Product owner decisions (LOCKED)

These are the newest explicit decisions and override any contradictory sections of older briefs, Lovable conversations, or AI mockups:

1. **Light Premium Gaming Experience with STRONG game feel**, not a dark dashboard, not a loud neon rainbow arcade, and not a plain corporate website. Premium, cinematic, energetic and interactive. Main brand crimson `#A61E25`, restrained gold/amber for selection and successful actions; light neutral shell; original six game covers provide rich visuals.
2. **Public Landing (`/`)** stays a legitimate marketing and discovery page. Preserve meaningful hero/copy and auth/sign-up. Replace its 6 giant grid cards with a compact, cinematic **horizontal games showcase**, with drag/swipe + previous/next, visible touch affordance and playful hover/focus interactions. Do not duplicate the complete Hub layout outside auth.
3. **New verified account journey:** Sign up/verify → **Plans (Free/Annual)** → **Character Setup** with existing work department/industry → **Gaming Hub**. Returning completed user → Hub directly, without repeating the plan or avatar step. Resume unfinished users intelligently. Plan choice is **NOT** paid entitlement.
4. **Plans (`/plans`)** must become a focused beautiful **two-pass selection screen only**, with clear Free and Annual passes, verified dynamic price and honest subscription wording. Remove repeated game catalog/grid from plans. Do not remove the page or hide it behind a forced Hub modal.
5. **Character Setup (`/setup`)** must feel like creating an identity in a game, with existing real avatar options and satisfying selection response, while collecting only truly required name/gender/department/industry fields. No fabricated character performance stats. Real data and validation preserved.
6. **Game Hub (`/app`)** must be a responsive, compact, game-first library with 6 original accurate covers and real states. Desktop normally 3 columns × 2 rows; mobile grid/stack based on readability. Small top bar with avatar/player settings, subscription link and audio controls. No large pseudo-progress HUD, no static “محلل مبتدئ” rank, no fake XP, no opaque flame rating or progress masquerading as achievement.
7. **Player Center:** one discoverable avatar/profile/settings panel for existing name, avatar, industry, department, subscription and audio settings; editable fields use existing secure APIs only. It is not a second onboarding screen.
8. **Game feel:** beautiful hover/focus/tap effects, meaningful microanimations, crisp but controlled SFX, truly playable buttons, subtle celebratory state changes, and no blocked actions due to theatrics.
9. **Audio:** one coherent platform-level BGM/SFX session, audible and polished without harsh blasting, clean transitions between screens, no overlap with individual game narrations/music, easy sound controls. Browser autoplay restrictions apply: do not claim guaranteed loud sound at initial document load; unlock after eligible click/explicit sound activation, then preserve preference and context.
10. **Preserve every actual game:** No gameplay/story/code overhaul for any of the six. Do not copy code from unfinished `codex/investigation-file-v2` work. Existing free/paid entitlements must remain server-authoritative. One free game is a *commercial plan*, not permission to bypass current enforcement flags.
11. **No extra external UI reference designs as final artwork.** The previous generated composite board and second generated AI concept were misleading (dark theme, invented game covers, garbled Arabic). They are *rejected*. Use the real current screenshots and original production assets in `GAME_CATALOG` as ground truth.
12. **Build a WORKING local version NOW** in phases and make actual browser screenshots. Do not stop at purely visual proof. No push, PR, deploy, schema migrations, live payment tests, or destructive operations.

## 1 — Repository and branch safety (must happen BEFORE modifying any file)

Repository: `D:\the-analyst` / GitHub `AhmedAbdelmoaty/the-analyst`. Main SHA verified independently on 2026-11-02: `5a2461e793a445ed0dd32dacd0700aecc26cdc05`. This is a historical checkpoint, NOT an instruction to pin to an outdated commit. Fetch `origin/main` and compare to GitHub again.

**Critical user context:** another Codex chat is working on `codex/investigation-file-v2`; screenshot showed **8 uncommitted files** and a reconnecting terminal. Those files must stay intact. A new chat with branch `main` and Worktree OFF could conflict with the other chat.

Mandatory preflight:

```
git -C D:\the-analyst rev-parse --show-toplevel
git -C D:\the-analyst remote -v
git -C D:\the-analyst branch --show-current
git -C D:\the-analyst status --short
git -C D:\the-analyst worktree list
git -C D:\the-analyst fetch origin main
git -C D:\the-analyst rev-parse origin/main
```

- Fetch is allowed. `git pull` on a dirty or wrong branch, `git reset --hard`, `git clean -fd`, `git stash` of another chat's work, `git checkout -f`, forced worktree changes, rebases/merges into the ongoing investigation branch are NOT allowed.
- Use Codex **New worktree ON**, starting from `main`, and then ensure its base SHA matches `origin/main` **after fetch**. Codex-managed worktrees may start from **local** `main`, which can be stale. If stale and new worktree is clean, safely create/switch to a new worktree branch at `origin/main` in that isolated worktree (or create another clean worktree from `origin/main`). Never modify the other worktree to accomplish this. Never claim to have the latest main based on the branch dropdown alone.
- Alternative controlled terminal command only if needed and destination not occupied: `git -C D:\the-analyst worktree add -b codex/gaming-experience-v2 D:\the-analyst-gaming-v2 origin/main` after fetch. If destination/branch already exists, use a unique name; don't overwrite.
- At task start report: root, active worktree path, branch or detached state, base SHA, current origin/main SHA, dirty status, and assurance that existing investigation worktree remains untouched.
- Never commit or push anything to `main` directly. The final implementation can later be reviewed and merged *into* main through an intentional process, once other game changes are reconciled.

## 2 — Read actual source-of-truth files before changes

`AGENTS.md`; `package.json`; `src/App.tsx`; `src/components/auth/Landing.tsx`; `src/pages/PlayerAuth.tsx`; `src/pages/AppEntry.tsx`; `src/pages/PlanChoice.tsx`; `src/pages/Setup.tsx`; `src/pages/Games.tsx`; `src/features/discovery/catalog.ts`; `src/features/discovery/GameCard.tsx`; `src/features/discovery/progress.ts`; `src/features/discovery/journey.ts`; `src/features/arena/ArenaGameCard.tsx`, `arena.css`, `bgm.ts`, `sfx.ts`; `src/features/subscription/{planIntent,paymentApi,AnnualPrice,pricing}.ts*`; `src/features/entitlement/{GameGate,useGameAccess}.ts*`; `src/features/profile/workProfile.ts`; `src/contexts/AuthContext.tsx`; `src/hooks` and `src/features/behind-the-dots/engine` for existing platform/game audio integration only.

The root routes on inspected main: `/`, `/login`, `/signup`, `/forgot-password`, `/plans`, `/setup`, `/app`, `/subscription`, `/subscription/summary`, game paths. Preserve aliases, protected routes and analytics/PWA behaviors. Inspect `src/pages/AppEntry.tsx` to understand where the Hub is actually mounted.

Original real `GAME_CATALOG` (use its actual id, `cover`, `route`, and `tier` fields; never hardcode new covers or links):
- `problem-framing` — **اسأل صح** — `/play` — free.
- `reward-decision` — **قرار التكريم** — `/games/reward-decision` — annual.
- `behind-the-dots` — **ورا النقط** — `/games/behind-the-dots` — annual.
- `crack-the-code` — **الشفرة الأخيرة** — `/games/crack-the-code` — annual.
- `decision-matrix` — **مصفوفة القرار** — `/games/decision-matrix` — annual.
- `investigation-file` — **ملف تحت التحقيق** — `/games/investigation-file` — annual.

Do not import any uncommitted edits from the other investigation branch; do not rewrite individual game mechanics.

## 3 — Shared visual system: concrete targets

- Main hub/shell canvas: `#F4F7FC` with a **very restrained** pale-blue/lavender radial glow and low-opacity grid/technical pattern; not 80% dark navy, not beige. White `#FFFFFF` panels, ink `#101A2F`, secondary text `#52627B`, crimson `#A61E25`, amber `#F3B73C` for active/selected accents, narrow optional teal `#22AEB6` for supporting feedback. Background must stay perceptibly LIGHT while original cover art can remain dramatic/dark.
- Use existing Arabic Cairo and brand assets; occasional decorative Lalezar heading only if present and legible. Arabic UI copy must read properly (no AI nonsense or English in random places), strong RTL hierarchy.
- Unified geometry: header height ~58–72px on desktop, cards border radius 14–20px, smooth shadows not heavy black borders, balanced white space; no massive top hero pushing all six games below fold.
- Real game imagery is the star. Use one shared card framework with different data for six games, and a teaser variant on Landing. Do not force six distinct card background colors, 3D flipping, or glowing fire everywhere.
- Cards desktop compact 3 × 2 at >=1200 width, 2 columns on tablet, 1 on narrower mobile unless side-by-side remains readable. On desktop 1366×768 prioritize showing most game art above fold with at most minor natural scroll. Never hide essential CTA/copy or shrink readability to avoid all scroll.
- Responsive: 1440×900, 1366×768, 1280×800, 768×1024, 390×844, 360×800, zoom 200%; right-to-left carousel arrow semantics, touch support, no horizontal overflow beyond controlled strip.
- Mandatory focus and touch equivalents for hover. High contrast at text overlays; no game title or primary CTA available on hover ONLY. Works keyboard/Touch/Mouse.

**Motion tokens**: `hover lift translateY(-3px)`, scale 1.01–1.025, border/shadow elevation 150–220 ms; click press feedback 90–140 ms; avatar selection ring/shine 220–350 ms; menu/drawer 160–220 ms; entry reveal 200–350 ms. `prefers-reduced-motion` and user setting disable nonessential motion. No intense 3D tilt or endless pulses.

## 4 — Screen A: PUBLIC Landing (`/`, auth variants)

**As-is issues:** full 6-card grid is oversized and duplicates real Hub; auth page has a corporate/landing feel disconnected from new game shell.

**Build:** keep hero concept “متعة اللعب، وقيمة التعلّم.” and underlying auth/sign-up/WhatsApp verification and footers; adapt presentation to subtle playful premium visual grammar. Section “اختار مغامرتك” becomes a compact horizontal CINEMATIC GAME SHOWCASE using actual game covers from `GAME_CATALOG`, roughly 3 visible cards desktop, 2 tablet, 1.1 mobile with intentional next-card peek. Cards show image, exact title, skill category and teaser CTA. Carousel should be accessible via buttons, touch swipe and keyboard; scroll snapping; optional slow timed progress ONLY when easy to pause, after focus/hover/inactivity checks, with reduced motion off; no endless unpausable marquee. Primary CTA always visible. Subtle hover expansion/shadow and soft tick only after sound unlocked, no audio on pure anonymous page load. Don’t auto-launch protected routes without guards.

**Flow:** anonymous card click carries navigation intent (existing `selectGame`, not a grant of access) and exposes signup. Logged-in returning visitor routes to permitted game or Hub with preserved intent and safe gate. Avoid double auth UI and sending users back to signup loops. Preserve existing OTP and analytics behavior.

## 5 — Screen B: PLANS `/plans` (required first-time step)

**As-is issues:** current PlanChoice adds full game catalog after 2 pricing cards. User sees near-repeated Landing/Hub. Free and Annual pricing currently use real payment-related logic; do not regress it.

**Build:** dedicated Game Pass selection, no game grid. A light premium stage with two strong pass cards side-by-side desktop, stacked mobile: “ابدأ مجانًا” and “التجربة الكاملة”. Small tasteful premium emphasis on Annual, no fake discount/VIP status or invented promises. Display dynamic price from `AnnualPrice`, currency/duration and truthful access/renewal details from current product logic. One clear CTA each; polished pressed/selected sounds and states, short motion; never imply choosing Annual itself activates premium. Distinguish current `PAYMENT_UI_ENABLED` state. Explain active/pending/unknown/expired states from verified backend as needed.

**Required order:** verified fresh signup → Plans → Setup → Hub for Free. Annual intent → Plans → Setup → preserve existing `/subscription/summary`/checkout flow where appropriate, with explicit route back to Hub in pending/free status; do NOT silently bypass checkout or gate Setup. Returning full account → Hub; no Plans/Setup loop. Handle interrupted first-time flow and refresh. Existing `journey.ts` session-scoped onboarding stage is fragile; audit and improve only safely. If fully durable once-per-account tracking needs DB schema, do not migrate; implement best safe client flow and flag production hardening separately.

## 6 — Screen C: PLAYER CHARACTER SETUP `/setup`

**As-is issues:** current `Setup.tsx` offers two avatars with hardcoded “تركيز / سرعة / دقة” scores and uses an XP-style 0/4 display that reads like a game rank even though it counts fields. Character setup has unwanted vertical overflow and the associated profile form looks corporate.

**Build:** one focused bright game-entry composition on desktop (split avatar gallery + compact profile panel), accessible mobile vertical order. Use the **actual current two existing avatar assets**—never import Nintendo characters or generated fictional variants. Selection shows persistent selected border, short animated ring, real sample SFX. No invented performance or XP. If actual first/last name already known, display/pre-fill and do not force duplicate entry. Preserve existing DB constraints for `avatar_choice`, `gender`, `department`, `industry`, and Other text. Choose “قطاع العمل” and “القسم” with readable inputs and validation, not long indecipherable dropdowns.

Use a CTA `ابدأ مغامرتك` leading to the correct Hub/payment continuation after secure profile save. Do not add a mandatory 6th “enter experience” wall. The CTA can *also* unlock audio with an in-context sound toggle; returning user’s Login/Hub click can unlock BGM. Fast and delightful, not another step.

## 7 — Screen D: GAMING HUB `/app`

**As-is issues:** dark shell, heavy glow/grid, cards still too visually dominant and big on some screens, fragmented account actions, fake static title `محلل مبتدئ`, `done/6` “إنجازات” and completion bar that measures only reached-end save status, hardcoded flames (1–3 difficulty); effects/audios not consistently coordinated.

**Build:** a light branded platform shell, compact header with logo/short 'مغامراتك' identity, avatar/name dropdown or right-side settings drawer, music/SFX control, subscription entry and logout available in profile. Main heading `اختار مغامرتك`; optional useful `كمّل لعبتك` tile only when real resume state exists (no fake XP). Show six cards from catalog with real original covers and authentic game titles, compressed and elegantly overlayed.

**Each card:** actual title, short category, truthful access state (Free / Annual, verified allowed/locked/unknown as relevant), distinct progress state (`جديدة`, `قيد اللعب`, `وصلت للنهاية`). Primary action `ابدأ اللعب` / `كمّل اللعب` / `عرض النتيجة` / `افتح الوصول` based on real save/verified access. Reached end ≠ winner. One safe click target; keyboard Enter/Space; link to existing game gated route. No duplicate hover and CTA click causing double navigation. Hover movement/low scale + cool sheen/soft click; focus/touch state equivalent. No flames/rank/fake achievements.

**Player Center** accessible from header: avatar/name, edit work profile and safe profile fields using existing `updateProfile`/RLS, subscription status/upgrade linking existing routes, audio/display options, logout. Avoid new insecure account management or duplicating full screen overlays. On mobile use accessible sheet/drawer with clear close button.

## 8 — AUDIO: design, sourcing, implementation

**Local reference library:** `D:\PatternWorlds-Library` only read/copy selected licensed assets. Existing verified-by-owner Kenney `UI Audio` + `Interface Sounds` CC0. Ask Codex to discover exact nested paths and read `License.txt`, not assume Windows path or pack structure. SFX shortlist should be drawn from actually playable WAV/OGG files: hovered card (tiny nonintrusive tick), button click, successful choice, avatar select, settings panel, game launch, locked access, successful *real* completed action. Maintain single normalized SFX palette, not harsh mismatched sounds. Never use forest ambience/footsteps merely because it is in library.

**Existing actual tracks:** code references `arena-hub-theme.mp3.asset.json` (~3.29 MB) and `arena-setup-theme.mp3.asset.json` (~1.82 MB) pointing to Lovable-hosted URLs; must check availability, ownership, licensing and listening quality, not infer that all older music was synthesized (older SFX are synthesized in `src/features/arena/sfx.ts`). One option is retain/refine existing if audited. If sound is unsatisfactory, audition CC0 tracks from actual creator `https://tallbeard.itch.io/music-loop-bundle` (Abstraction), with alternate `https://opengameart.org/content/main-menu-music-loop`; check every selected file's license and download only needed tracks, not huge packs. Kenney `https://kenney.nl/assets/music-jingles` is optional for short stingers. The user has authorized sourcing suitable CC0 music for the local work; if access is blocked, present exact original URLs and a working fallback, don't use suspicious mirrors.

**Audio behavior:** A single platform audio service/mixer with independent BGM and SFX volumes and mute, preferences persistent per device/browser, a clear enabled/disabled state, and ability to stop/resume without spawning duplicate players. Audio unlock from eligible user click/tap, not an unpromised audible autoplay on initial page load. Once activated, entry/Setup/Hub crossfade within ~250–500ms, actual game launch lowers/pauses platform BGM when in-game audio/narration plays, return resumes only if previously enabled. No overlapping tracks on route transitions, replayed loops, or leaked event listeners. Avoid `onPointerMove` SFX; hover sound only on distinct pointer-enter with rate limiting, suppressed on mobile touch and on first frame under resting cursor. Initial mix balanced and punchy, not ear-damaging; user-requested 'clearly audible' = crisp relative level and good mix, NOT maximum gain. Track actual output state before drawing waveform UI. Test with game voice tracks.

**Review deliverables:** Select up to 3 Hub music candidates + 2 Setup cues + 6–8 event SFX with a LOCAL audio audition page, sourced license evidence and filename mapping. Choose an approved high-quality default from actual audio, report why. If cannot hear audio in Codex environment, don't claim selection has been listened to; give browser audition for owner. Final use is subject to listening review; implementation can proceed with a safe verified default and swappable manifest.

## 9 — ENGINEERING: minimize blast radius

Prefer existing React/Tailwind/Framer Motion/GSAP and current audio facilities. No new game engine, no wholesale replatform or CSS global override. Reuse existing catalog and player auth/profile/entitlement APIs. Proposed additive modules: `src/features/platform-shell/`, `src/features/platform-audio/`, shared `GameCoverCard` variants; adapt current `src/components/auth/Landing.tsx`, `src/pages/PlanChoice.tsx`, `src/pages/Setup.tsx`, `src/pages/Games.tsx`, `src/features/arena/arena.css`. Match existing CSS conventions and component library. Avoid giant reformat unrelated files. No refactors inside `src/features/investigation-file`, `src/features/reward-decision`, `src/features/behind-the-dots`, `src/features/decision-matrix`, payment functions or admin routes.

Banners and plan badge must be truthful about currently configured access: your business intent is Free game 1 + paid other five **once enforcement is truly enabled**. Do not hardcode this as enforced today when `paid_game_enforcement` is OFF; do not flip backend flags. Payments, Paymob, RLS, DB migrations, service secrets, user data changes and live testing are excluded. local app may connect to live Supabase, so avoid destructive operations and real charges.

## 10 — EXECUTION PLAN: DO NOT STOP AT STATIC MOCKUPS

Execute now as a LOCAL branch/worktree in four concrete milestones, with screenshots and passing checks after each; continue through implementation unless real risk/security blocker:

**M0: Baseline** — preflight latest `origin/main`, status/worktree safeguards, copy V1 brief/read references, inspect code, run build/tests in safe local workspace, record current screen baselines or report auth limitations. Create `IMPLEMENTATION_LOG.md` and `RISKS.md`.

**M1: Flow + Plans + Setup** — implement pass-only Plans, preserve auth/OTP/payment intent, setup character and profile logic, test initial flow including interrupted/returning account. No invented abilities. Screenshot desktop/mobile.

**M2: Hub + Player Center + Cards** — real six covers 3×2 responsive with progress/access states and correct actions; compact top nav, profile/settings. Remove flames and fake rank/progress. Card hover/focus/touch and responsive. Screenshot desktop/mobile.

**M3: Landing Showcase + Unified Audio** — compact horizontal carousel with keyboard/swipe controls, original covers, sound-enabled game shell, audio audition and actual BGM/SFX integration with correct route transitions. Screenshot and hearing test.

**M4: QA + Finishing** — run `npm run build` and actual repo test/lint scripts if present, add focused tests, validate all navigation and payment boundaries, verify screen sizes and reduced motion, check source/license evidence, inspect bundle size and audio traffic, fix defects; deliver working local dev URL/launch instructions and `QA_REPORT.md` with actual outputs and known omissions.

Do not add fake sound choices before assets are audited. Do not claim testing remote production from a local preview. If testing authenticated flows requires a safe test account not available, implement unit/integration mocks and report the missing E2E proof instead of weakening auth.

**Hard stop only** on dangerous operations (protected backend or live payments), unfixable permission/network blocker, or substantial unapproved scope change. Do not require extra approval for normal local frontend edits once this brief is accepted. No push, deploy, destructive Git, migrations, or merge.

## 11 — ACCEPTANCE CHECKLIST (NO SHORTCUTS)

- Latest `origin/main` verified after fetch; active worktree independent from pending investigation-game edits; no loss/change to other branch or any local uncommitted user data.
- Auth new flow verified Plan→Setup→Hub (free); annual plan intent preserved with payment summary/verification as configured, unknown/pending handled truthfully; returning completed player goes straight Hub; no loops on refresh.
- Plans = exactly two pass cards; no second six-game catalog. Actual dynamic pricing correct; no fake annual activation.
- Setup uses actual avatars, work profile validations and actual save; no fake stats, no unnecessary repeat of name; desktop 1366×768 and 360px mobile usable.
- Landing clearly remains a Landing with compact horizontal real-game showcase; swipe/buttons/focus/reduced motion; correct auth redirects.
- Hub light premium visually, six correct original covers/titles/routes, compact cards, real state/access labels, profile audio and subscription menu; no flames, fake rank/XP/achievements.
- SFX on hover/select/click/launch feels crisp, doesn’t spam. Music loop verified or placeholder declared; enables after user gesture, can be muted/adjusted, no overlap with game sound, no autoplay lie; no clipping.
- Mobile/desktop 1440, 1366, 1280, 768, 390, 360 widths; keyboard focus, taps, zoom, color contrast and `prefers-reduced-motion` all validated.
- No direct rewrite of six games, no auth/schema/backend/Paymob/RLS/payment/analytics/PWA regressions. No Git push/PR/merge/deploy.
- Deliver final local branch/worktree path, base SHA, changed files, tests and screenshot paths, audio audition URL, preview URL, QA notes. Only then request review of the implementation.

## 12 — Reference snapshots provided in pack

`REFERENCES/AS_IS_HUB_DARK.png`, `REFERENCES/AS_IS_HUB_HEADER.png`, `REFERENCES/AS_IS_PLANS_WITH_GAMES.png`, `REFERENCES/AS_IS_LANDING_BIG_CARDS.png`. These images are **current/problem baseline screenshots**, NOT desired visual solutions. They were provided by product owner. The images generated earlier by AI are not the target and should be ignored. The real covers in code win if screenshot/cover differs.

---

**Authority order:** newest owner decisions and THIS V2 brief > previous V1 brief for execution order > actual verified code for factual implementation > dated historical docs. Existing `AGENTS.md` and security controls always remain binding. If V2 requirements conflict with live entitlement/checkout safety, preserve safety and document clearly.
