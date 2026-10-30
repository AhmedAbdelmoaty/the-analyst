# THE ANALYST — Investigation File V3 Final Production Specification

**Purpose:** A single actionable production brief for Codex. Existing working game is the baseline. **Do not rebuild from scratch.** This document is a target specification, not proof of current implementation.

## 0. Non-negotiable workflow
- Stay on current `codex/investigation-file-v2` branch. Inspect actual HEAD, changed/uncommitted files, current game source, tests and existing assets first. Preserve unrelated work. Save a recoverable local checkpoint before edits. No reset/force push/merge/deploy; no push without approval.
- Four execution passes: (1) shared art direction and opening/ending readability; (2) evidence desk, comparison UX and Felfel; (3) animated employee lab; (4) end-to-end verification and fixes. Work through all passes autonomously, committing locally after a stable pass. Do not pause for routine approvals.
- Browser-verify at 1440x900, 1366x768 and 390x844; test gameplay, animations and overflow, not just build/tests. Maximum two targeted repair iterations per issue; if still blocked, document evidence and continue independent tasks. Never claim perfection or verification not performed.
- Avoid unnecessary dependencies, game engine, giant art asset generation, repetitive documentation or reimplementing stable business logic.

## 1. Experience and visual identity
- **Game-first, analysis-first:** a playful 2D cartoon business analysis adventure, NOT a crime investigation, grim noir room, SaaS dashboard, or a dark navy rectangle with beige cards. Preserve existing case/story and Felfel identity.
- Design vocabulary: bright illustrated office/workshop, warm cream `#FFF3D9`, parchment `#F7DEB0`, warm wood `#A9693E`, teal `#23B6BA`, light cyan `#A8EDF0`, sunshine `#F8C652`, coral `#E97A62`, ink `#40342D`. These are starting tokens: adjust for contrast and harmonious scene integration. Deep navy only as small supporting shadow/ink, never giant empty backgrounds. Keep accessible text contrast.
- Each screen must feel like one physical cartoon scene: painted wall/office depth, floor/desk plane, warm lighting, foreground props, coherent perspective, consistent edge thickness, shadow direction, and playful visual hierarchy. Prefer CSS/SVG layered illustrations to static full-screen reference images. No blank dark fields or mixed unrelated panel themes.
- Shared tactile UI: cream paper with slightly varied shape, clipped folders, pinned comparison sheets, colored index tabs, soft bevel and press travel for buttons; hover/focus/pressed/disabled states; avoid identical rectangular cards everywhere. Limit decoration that hides content. Arabic RTL, readable type (prefer existing font), Egyptian dialogue, consistent number formatting.
- Screens must fit desktop without needless document scrolling. No nested scrollbars in evidence comparison or inside popup. On mobile allow one primary page scroll if necessary. Use viewport-aware heights, CSS grid minmax(0,1fr), overflow discipline, and screenshot tests. No invisible text: all headings readable on their actual backgrounds.

## 2. Opening meeting / decision / ending
- Opening: lively illustrated meeting composition with CFO, HR and Felfel in coherent environment; paper report is the focal prop, not a floating UI panel on empty dark background. Speaker emphasis via subtle scale/lighting, speech bubble entrance, and short coordinated motion. Player can progress with obvious control. Keep exact historical figures.
- Verdict: choices are readable, accessible, visually selected only when actually selected; preserve evidence requirements, invalid/wrong paths and existing branching.
- Ending: illustrated character staging and readable paper title; no pale text on pale paper. Distinct success/review responses. Keep existing six-beat Simpson's Paradox explanation and its accuracy; if missing, implement with deliberate pacing, manual next/back and optional auto play/pause/replay/skip, without trapping player.

## 3. Evidence board / HR comparison
- Two main desk tabs only: `لوحة الأدلة` and `معمل التحليل`, preserving state between switches.
- Desk visual: an inviting tactile analysis table. HR records on one side; two visible pinned comparison slots side by side on the other. The selected pair is shown **immediately** after choosing two compatible records: no extra `عرض` action, no opening a hidden subpanel, no scroll inside the comparison. If an existing save action is required, keep it explicit and animated (paper clips into evidence folder). Preserve two distinct saved comparisons and the ability to inspect/replace/remove them.
- Present each pair with category, attendance, promoted/total, percent, and comparison meaning in legible typography. The player should understand same-level comparison and compare Junior versus Senior evidence without hunting through a long list. Saved evidence should be compact visible thumbnails/tabs rather than an overflowing mini-scrollbox. Keep comparison validity and verdict gating from existing logic.
- A short selection animation (lift paper → move/clip into slot → settle) should reflect a real state change. Never animate fake saved evidence.

## 4. Felfel acting and dialogs
- Preserve exact existing Felfel character assets and poses. A modal-like focus moment may dim/soft-blur background and position Felfel next to a connected speech bubble; animate enter ~250–400ms, bubble ~120–220ms later, exit ~180–280ms. Make pose changes contextual, not random. Do not make every hint modal; minor lab comments are nonblocking.
- **Dismissible** optional dialogs: click backdrop outside both character and bubble closes, as does `Esc` or clear `تمام` button. Clicks on character/bubble must not close. Mandatory story beats must not be dismissible in ways that skip required state transitions. Manage focus, accessible role, and background scroll lock with scroll position restored.
- Avoid overlapping Felfel with essential controls and avoid persistent giant character obscuring the game.

## 5. Employee-composition lab — functional visual game
- Use actual transparent sprite assets `junior-01..04.png`, `senior-01..04.png`, placed under `public/investigation-file/assets/employees/`. **Do not generate replacement employees.** Juniors: blue casual; seniors: formal dark suits; each has explicit Junior/Senior label. Render at comparable heights and with shared floor shadows.
- Two independent illuminated miniature employee chambers: `حضروا التدريب` (teal) and `ماحضروش التدريب` (amber). Each has its own tactile Junior-share slider and complementary Senior share. A compact results/balance instrument alongside, fixed within-level rates and original historical records in compact supporting strip, plus `جرّب توزيع 50/50` and `إعادة التوزيع الأصلي` controls. On desktop both chambers and results are seen together; mobile stacks cleanly.
- 20 **representative tokens** per chamber; each token approximately 5 percentage points, NOT a historical employee. 25% Junior = 5 J / 15 S; 50% = 10/10; 0% = 0/20; 100% = 20/0. Historical untrained Junior share is **600/700 = 85.7142857%**, visualized approximately as 17/20 J but calculated using exact fraction. Clearly label visualization as approximate.
- Slider updates calculation instantly. Changing composition triggers short visible movement: entering Junior tokens travel from a Junior reserve/path into empty slots while replaced Senior tokens exit via Senior path, and vice versa; survivors slide to new positions. **No individual changes seniority and no employee moves between attendance groups.** Motion: transform translation + gentle bob/tilt + floor shadow + landing bounce, ~180–650ms; full skeletal animation not needed. Rapid dragging cancels/coalesces stale animations; final count and placement must match latest value without duplicate sprites. Preserve keyboard, touch and reduced-motion support.
- Historical within-level promotion rates remain fixed: Junior trained 80/100=80%, untrained 450/600=75%; Senior trained 60/300=20%, untrained 10/100=10%. Actual aggregates trained 140/400=35%, untrained 460/700≈65.714%. Trained Junior share 100/400=25%; untrained Junior share 600/700≈85.714%.
- Hypothetical trained aggregate = `T*0.80 + (1-T)*0.20`; untrained = `U*0.75 + (1-U)*0.10` for independent Junior shares T/U. 50/50 both => 50% versus 42.5%. Preserve exact reset even if manual slider moves in 5% steps. **Never overwrite actual data with hypothetical results; do not imply causation.**
- Results: two responsive numerical bars and a compact brass mechanical balance whose lower pan indicates **higher hypothetical promotion rate**, not more employees. Neutral at equal rates, restrained tilt ≤12 degrees. Numeric values remain legible independently of animation. Felfel reacts once on first meaningful reversal with a short nonblocking discovery beat.
- Reference images are **concepts only**. Rebuild interactive scene from components, not as a flattened image. Use provided 8 PNGs as actual game assets. Consult Contrary Simpson's Paradox example for movement/interaction patterns, not copied story/assets; respect license if reusing any code.

## 6. Acceptance checks — no premature completion
1. Full game journey works: opening → evidence desk → analysis lab → verdict → ending; correct and wrong/missing-evidence paths work; save/resume behavior preserved where implemented.
2. Opening and ending have readable contrast and purposeful scene composition; no giant gloomy navy voids.
3. Evidence selection shows comparison immediately, no `عرض` step and no nested scroll. Saving/revisiting evidence works and is animated.
4. Felfel optional overlay closes on backdrop/Esc/button, not on bubble/character; mandatory flow stays safe; scroll position restored.
5. Lab: both sliders independent; exact baseline, 50/50, 0/100, 100/0, rapid drag and reset all correct; visible employee enter/exit and balance respond; no historical-data mutation.
6. At 1440x900, 1366x768 and 390x844 no clipped critical buttons, unreadable labels, overlap, horizontal overflow or broken tab switching. Reduced-motion mode and keyboard controls functional.
7. Run existing relevant tests, add focused calculation/interaction tests, and inspect browser screenshots/video where possible. Fix critical failures, then report verified/unverified separately.

## 7. Asset conventions and evidence
- `docs/investigation-file/references/approved-lab.png` — art direction reference (not runtime asset).
- `docs/investigation-file/references/employee-motion-guide.png` — choreography reference (not runtime sprite sheet).
- `docs/investigation-file/references/current-ui-issues/` — **rejected** screenshots documenting flaws, never a style target.
- `public/investigation-file/assets/employees/{junior,senior}-0{1,2,3,4}.png` — actual runtime sprites.
- If these assets are not present, inspect provided attachments/working tree. Do not silently pretend they exist or fabricate lookalikes; implement independent work and report missing assets precisely.

## 8. Definition of done
Finish when all feasible acceptance checks pass, actual browser review is performed, and a concise final report lists changed files, local commits, tests, screenshots/preview, and remaining blockers. Do not run indefinitely. Do not push, merge or deploy. No unrelated code changes.
