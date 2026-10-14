# Reward Decision UI redesign — local progress

Updated: 2026-10-14. Working checkout: `main` at `23e7ee99be1fe522ecb9b37a2dc2990bd38b2457`; this work is uncommitted. Do not touch the pre-existing subscription and documentation changes in this checkout.

## Completed locally

- Added a scoped visual layer for Reward Decision, with fixed portrait frames, speaker tones by conversation, paper/file surfaces, restrained motion, and a phone-shaped incoming call. No story text, team data, evaluation rule, save schema, backend, or first-game source has changed.
- Reworked the analysis file as a tabbed index with one document or tool result opened at a time. Document collection remains persisted before visual flight; the flight uses the displayed card and HUD folder positions and has a reduced-motion fallback.
- Replaced illustrative chart heights with common 10-point bins calculated from the approved member values. Both teams share a 60–150% axis; a smooth path joins observed bin heights. Tool overlays use existing statistic functions. Mobile preserves both team summaries.
- Replaced the recommendation selects with neutral, keyboard-accessible cards and two argument slots while retaining the current draft IDs and submission evaluation.
- Added a frontend-only preview at `/dev/reward-decision-preview.html`. It mounts no auth, analytics, save, or game controller and is not an entry in the production Vite build.

## Verification so far

- `npx tsc -p tsconfig.app.json --noEmit`: passed.
- Bun `tests/reward-decision.test.ts tests/reward-decision-ui.test.ts tests/round-persistence.test.ts tests/admin-analytics.test.ts tests/admin-results.test.ts`: 52 passed, 0 failed.
- Targeted ESLint for all edited game/preview/test TypeScript files: passed without warnings. Full `npm run lint`: 11 errors and 11 warnings in files outside this task (including existing AuthContext, phone-auth, previewAuthStorage, and round-persistence tests).
- `npm run build`: passed. Existing large-chunk advisory remains.
- Isolated visual preview inspected at exact 320, 360, 390, and 1280 CSS-pixel widths for dialogue, histogram, file, recommendation, call, offices, and debrief; no document-level horizontal overflow. Verified mobile team switching, bin counts, tool show/hide, card selections, disabled/enabled submission, file opening and Escape. No real account or production data was used.

## Next

1. The actual authenticated controller flow, document flight on a real handoff, audio cleanup across a call, and pause/reload with a visible browser were not exercised end to end: the configured backend is treated as production, so the preview deliberately excludes auth, analytics and saves. Engine/persistence tests cover state rules, but an isolated backend is needed for full playtesting.
2. External Perception Lab and statistics-game source was unavailable from this environment; reference screenshots and the local first-game implementation were used.

Known pre-existing narrative issue: some unsupported meeting outcomes and later call wording may imply different approval states. This UI task does not rewrite those paths.
