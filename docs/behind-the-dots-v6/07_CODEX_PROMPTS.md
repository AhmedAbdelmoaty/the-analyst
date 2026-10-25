# Paste into Codex — production task and checkpoints

## PROMPT 1 — START HERE (paste verbatim)
You are the lead gameplay engineer, 2D technical animator, narrative implementer, and visual QA engineer for The Analyst's EXISTING `Behind the Dots` game. The attached folder `BEHIND_THE_DOTS_CODEX_PRODUCTION_PACK` is your execution contract. Read `00_START_HERE.md` through `06_ENGINEERING_QA.md` completely, then read repository `AGENTS.md` and inspect actual code/assets. Follow the latest user decisions over older V5 briefs. **DO NOT create a standalone HTML prototype. DO NOT replace the three answer buttons with line dragging/sliders. DO NOT invent replacement characters.** Work only on a dedicated feature branch; preserve local changes. First report verified repo/asset facts and build a visually tested vertical slice: animated market + Leila/Glitch/Dotty camera-focused conversation + notebook transition + untimed point tutorial + round 1 with 3 tap choices + real pose-based right/wrong reactions. Generate matching art assets where tools permit, but do not claim real animation with a single translated PNG. Capture screenshots/videos on desktop and mobile and show exact paths and test results. Do not advance to four full rounds until vertical-slice visual quality is demonstrated. Never merge/deploy without approval.

## PROMPT 2 — AFTER VERTICAL SLICE PASSES
Continue from approved visual system, not a redesign. Implement the four challenges UP/UP/NONE/DOWN using `04_GAMEPLAY_DATA.md`, updated dialogue and evidence, 20-second countdown, 3 hearts, chase, idempotent scoring, pause, save migration, mobile controls. Preserve original three choice buttons. Add seeded data validity tests, reducer tests and full visual walkthrough. Report actual screenshots and outstanding issues.

## PROMPT 3 — AFTER FOUR ROUNDS PASS
Implement final evidence synthesis, plan choices A/B/C (B correct), distinct ACTED perfect/saved/Glitch endings with new poses and timeline, retry/review, responsive and reduced-motion versions. Record real playthrough of win and loss; compare each against scene specs and provide a gap table. Run tests, open PR, DO NOT merge or deploy.

## PROMPT 4 — VISUAL REJECTION / REPAIR
The current implementation does not meet the agreed game-feel standard. Do not respond with promises or more static mockups. Inspect the running build and compare frame by frame against `03_SCENES_MOTION.md` and `05_ASSETS.md`. Identify missing acting poses, absent camera focus, fake run cycles, static endings, chart clipping, or slow pacing. Fix the highest-impact gaps in the EXISTING React game. Supply before/after screenshots and actual video proof, and list anything blocked by missing assets.

## Codex communication rules
Use brief checkpoints with concrete evidence: 'Implemented X in files Y; verified with command Z; screenshot/video at path P; still missing Q'. Never say 'perfect' or 'fully animated' without actual visual proof. If no browser/asset generation access, explicitly say so and ask for only the needed setup. If the user asks for status, distinguish code committed, tests run, browser observed, GitHub pushed, and production published.
