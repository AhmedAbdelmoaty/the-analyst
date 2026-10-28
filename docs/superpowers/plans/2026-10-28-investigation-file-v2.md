# Investigation File V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the sixth game a clear, tactile Simpson's Paradox puzzle with live, independent counterfactual mixes, evidence-built confrontation, and non-punitive incomplete evidence.

**Architecture:** Keep the existing static HTML/CSS/ES module bundle and current React iframe route. Put testable aggregation, mix calculations, evidence validation, and verdict resolution in `case-data.mjs` and `engine.mjs`; keep scene/input/render/audio logic in `investigation.mjs` and existing persistence contract.

**Tech Stack:** Vanilla HTML/CSS/ES modules, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-28-investigation-file-v2-design.md`

## Global Constraints

- Preserve Case #3 counts and historical values exactly; never mutate them through hypothetical controls.
- Any shared Junior/Senior mix may demonstrate the reversal; do not require a 50/50 mix.
- Each experimental slider controls only its own group and the other group's share remains its complement to 100%.
- A correct recommendation with missing evidence returns to investigation without recording a loss.
- Exactly two final outcomes; no changes to other games, auth, subscriptions, or shared platform progress.
- Preserve current Contrary-inspired cartoon art, motion, sounds, RTL and mobile behavior.

## Review Focus

- Missing, malformed, duplicate, cross-level, or over-complete evidence must never produce false success or false loss; validate in engine tests.
- Mix values at 0%, 1%, 25%, 50%, 85.7%, 99%, and 100% must compute within the correct group, remain finite, and never mutate historical records; validate pure functions.
- A common mix at values other than 50% must count as a valid counterfactual proof when it reverses aggregate direction; validate exact representative rates.
- Changing one slider must not mutate the other slider's state; verify DOM interaction and live output.
- Choosing correct recommendation with incomplete evidence must allow return and preserve evidence; verify desktop and mobile end-to-end flows.

---

### Task 1: Extract testable V2 logic and verdict states

**Files:**
- Modify: `public/investigation-file/js/case-data.mjs`
- Modify: `public/investigation-file/js/engine.mjs`
- Test: `tests/investigation-file-integration.test.mjs`

**Interfaces:**
- `counterfactualRates(juniorShare)` computes trained/untrained rates at one shared mix.
- `resolveVerdict(evidence, verdict)` returns `needs-evidence`, `success`, or `failure` with missing evidence identifiers where applicable.
- Evidence records which fair pairs were inspected, actual composition reviewed, a non-actual common mix was tested with reversal observed, and which argument components were built.

- [x] Add tests for source counts/rates, original 35% versus 65.7%, 50/50 gives 50% versus 42.5%, and a non-50 shared mix (for example 25/25) reverses direction.
- [x] Add tests proving incomplete correct recommendation yields `needs-evidence`, complete logical evidence plus cautious recommendation yields success, unsupported recommendation yields failure, and incomplete/wrong evidence never yields success.
- [x] Run `node --test tests/investigation-file-integration.test.mjs`; confirm new assertions fail against V1 logic.
- [x] Implement only the pure calculation and evidence/verdict logic needed by those tests.
- [x] Re-run the focused test and existing integration test; expect all pass (8/8).

### Task 2: Build live independent distribution board

**Files:**
- Modify: `public/investigation-file/index.html`
- Modify: `public/investigation-file/css/investigation.css`
- Modify: `public/investigation-file/js/investigation.mjs`
- Test: `tests/e2e/investigation-file.spec.ts`

**Interfaces:**
- Board state holds independent `trainedJuniorShare` and `untrainedJuniorShare` values; each corresponding Senior share is `1 - juniorShare`.
- A single render path updates slider outputs and counterfactual rate bars on every input event.
- Historical counts/rates render from immutable Case #3 records and never depend on hypothetical state.

- [x] Add E2E assertions that moving the trained slider changes only trained mix and live rates; moving the untrained slider changes only its mix and live rates.
- [x] Add a non-50 matching mix scenario and assert that it reveals trained aggregate above untrained.
- [x] Add a historical-data assertion before and after multiple hypothetical adjustments.
- [x] Run the focused Playwright test and confirm it fails because V1 lacks live outputs / independent proof semantics.
- [x] Implement the board with clear historical versus hypothetical labels, direct percentages, complementary shares, accessible slider labels/value outputs, and responsive tactile motion.
- [x] Run focused browser tests at desktop and mobile viewports; expect input/output independence and no horizontal overflow (10/10).

### Task 3: Make the final confrontation evidence-driven

**Files:**
- Modify: `public/investigation-file/index.html`
- Modify: `public/investigation-file/js/investigation.mjs`
- Modify: `public/investigation-file/css/investigation.css`
- Modify: `tests/e2e/investigation-file.spec.ts`
- Modify: `tests/investigation-file-integration.test.mjs`

**Interfaces:**
- The confrontation offers evidence pieces for Junior comparison, Senior comparison, historical mix, and the player's successful common-mix experiment; fitting them into the objection changes whether the objection is supported.
- Correct cautious verdict with incomplete evidence returns to the desk and names missing proof without calling `finishRun`.
- Complete supported objection plus cautious recommendation calls success; unsupported decision or invalid argument calls failure with a concrete explanation.

- [x] Add E2E paths for a correct decision with missing evidence (return to desk, preserve case, no failure ending), wrong decisions (failure), and evidence-built success.
- [x] Add a path showing incomplete evidence cannot satisfy the objection and that completing the evidence then permits success.
- [x] Run E2E tests and confirm missing-evidence case currently ends as failure and evidence selection has no effect.
- [x] Implement an evidence assembly interaction using the current clips/cards/paper visual language, clear missing-proof feedback, and exactly two terminal outcomes.
- [x] Re-run focused logic and browser tests; the return state and two endings pass.

### Task 4: Polish reuse, mobile, and scoped integration

**Files:**
- Modify as needed: `public/investigation-file/index.html`, `css/investigation.css`, `js/audio.mjs`, `js/investigation.mjs`
- Modify: `tests/e2e/investigation-file.spec.ts`
- Modify if needed: `docs/INVESTIGATION_FILE_HANDOFF_AR.md`

- [ ] Manually verify keyboard/touch operation, focus visibility, reduced-motion preference, mute behavior, sound feedback, and replay.
- [x] Add/fix focused Playwright assertions for the endings, return-to-investigation without loss, arbitrary shared mixes, and mobile layout.
- [x] Run `node --test tests/investigation-file-integration.test.mjs`, focused Playwright investigation tests, both TypeScript no-emit checks, changed-file ESLint, and `npm run build`.
- [x] Finish final diff/scope review and verify no push or publish. Only the Investigation File bundle, its focused tests, and handoff/design docs are changed; the main checkout remains clean.

