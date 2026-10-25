# React implementation, quality gates, testing and reporting
## Source paths (verify current)
`src/features/behind-the-dots/BehindTheDotsGame.tsx`, `behind-the-dots.css`, `components/ScatterPlot.tsx`, `data/cases.ts`, `data/dialogue.ts`, `engine/gameState.ts`, `engine/datasets.ts`, `engine/correlation.ts`, `engine/persistence.ts`, `engine/sound.ts`, `src/App.tsx`, `src/pages/Games.tsx`, `tests/behind-the-dots-v5.test.mts`, `tests/behind-the-dots.test.ts`, existing visual harness. Current V5 has three cases, correct final plan A, max score 9, and may stop at zero hearts. V6 needs four cases, correct plan B, max score 12 and explicit capture/practice rule. Test fixtures must change accordingly.

## Recommended architecture (adapt to existing code, no blind rewrite)
`GameState` reducer owns story phase, case index, score, hearts, evidence, capture/practice status, final plan and ending; animation is a projection of state, not separate game truth. Add typed `SceneDirector` (scene/shot/camera focus + safe timeline controls), `ActorSprite` (poses/frames), `WorldStage` (layered cart market), `NotebookTransition`, `ChaseLane`, `EvidenceBook`, `EndingSequence`. Keep scatterplot as accessible SVG with fixed 3 answer choices and valid labels. Prefer lightweight CSS/WAAPI/Framer Motion already in project; cancel pending timers/animations on unmount, pause, skip and scene change. Use a single clock source for timer and chase progress. Sound mute must apply to all cues.

## Implementation order / visual gates
G0 AUDIT: branch, HEAD, dirty files, current route, assets inventory, screenshots of V5, baseline tests; document facts.
G1 VERTICAL SLICE: original Leila/cart art; layered living market; Leila->Glitch->Dotty camera focus; entrance acting with new poses; notebook zoom/flip; guided point tutorial; round 1 with three tap answers and real right/wrong reaction. **Record desktop + mobile clips/screenshots.** If it looks like static stickers or generic quiz, DO NOT continue to G2.
G2 SYSTEMS: four scientifically valid cases, seeded generator, corrected dialogues, four-slot evidence book, heart/timeout/pause/capture/practice rules; unit tests.
G3 POLISH: rounds 2–4 distinct props, chase and animation transitions, sound, microfeedback, scene rhythm, responsive.
G4 ENDINGS: evidence-based final plan, three acted endings, replay, save migration.
G5 VERIFY: automated suite + human-visible full playthrough correct, wrong, timeout, capture, replay, skip and reduced-motion; report failures honestly.

## Non-negotiable acceptance tests
- User can finish 4 challenges in correct order with answers UP, UP, NONE, DOWN. No draggable trend line anywhere in challenge UI.
- New datasets have 12 points/case, realistic ranges, correct correlations across 100 seeded runs; C3 always sold <= prepared; C4 percentages 0..100.
- Tutorial allows point placement with fallback, retries without heart loss or time; skip only on replay.
- Timer 20s and 3 hearts; correct +3, wrong/timeout exactly -1 heart; rapid double taps cannot double-score; all four evidence pages appear.
- Pause/hidden tab stops clock, camera, sprite cycles, CSS/WAAPI animations, audio, typewriter; resume accurately. Muted means silent.
- 0 hearts triggers visible Glitch chase win and practice mode for remaining rounds, then Glitch ending (unless user later changes this rule).
- Plan B gives perfect only if 4 correct, otherwise saved when survived; A/C cause Glitch ending. V5 save safely migrated/reset without losing meta preferences.
- Intro: speaker focus visibly changes Leila -> Glitch -> Dotty with background actors still reacting; notebook visually opens and zooms to chart.
- Dotty and Glitch have visually different run/jump/stumble poses; evidence of frame changes; static PNG translate is insufficient.
- Distinct perfect/saved/Glitch outcome animations before results overlay; retry functional.
- 390x844 and 1440x900 no clipped actors/axes/buttons; keyboard/touch/focus/RTL/reduced motion work.
- No changes to production DB/auth/payment or other games. No merge/publish without approval.

## Deliverable evidence checklist
1. Git branch and commit SHAs; changed files summary.
2. Build/lint/test commands and pass/fail outputs (never invent).
3. Screenshots of intro, speaker focus, notebook, each case, heart break, chase, all three endings at desktop and mobile.
4. Short real browser video clips of intro->tutorial and correct/wrong reactions, plus win/loss.
5. Asset manifest: reused/new/generated, frame counts, license/source, missing poses.
6. Known defects, FPS/performance issues, accessibility issues, unfinished scenes and next actions.
7. PR for review; DO NOT auto-merge/deploy.

## QA failure policy
If an image generator or browser recorder is unavailable, stop calling the scene 'complete'. Implement what can be verified, explicitly mark blocked art/visual gates, and ask for missing inputs. Do not substitute emoji placeholders or stock art and present it as finished. If tests fail, report them. Avoid rewriting other platform code to make the game appear to pass.
