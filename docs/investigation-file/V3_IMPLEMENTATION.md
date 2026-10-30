# Investigation File V3 — local implementation

Date: 2026-10-29. Branch: `codex/investigation-file-v2`. Scope: `public/investigation-file/`, focused tests, and these notes. The platform route and per-user local progress format are unchanged. This work is local; it is neither pushed nor published.

## V3 art and UX pass — 2026-10-30

Built on the recovered V3 rather than replacing its game flow. The office now uses layered navy night lighting, a walnut investigation desk, pinned paper materials, and amber/teal/coral accents. The investigation has two keyboard-accessible tabs: a compact evidence board and a visually distinct analysis lab. Saved comparisons are summarized in a compact expandable evidence folder and can still be recalled to the clips. The lab keeps source HR rates visually fixed while its independent hypothetical composition sliders update adjacent animated rate meters; the historical and hypothetical values remain separately labeled.

Felfel’s hint sequence now dims the office, enters before revealing his bubble, and returns keyboard focus on dismissal. Intro dialogue emphasizes the current speaker. Decision choices share a neutral default and only the selected verdict is highlighted. The ending explanation can auto-advance, pause/resume, replay, advance manually, or be skipped. Responsive rules stack the evidence board and clips on narrow screens, keep comparison sheets readable, and prevent horizontal overflow. Reduced-motion and mute controls remain supported. Case data, evidence validity, verdict logic, owner-scoped storage, platform route, other games, and subscriptions are unchanged.

Visual review used Playwright captures from desktop and mobile for the lab, Felfel hint, success/failure endings, and final explanation. Generated `test-results/` output is ignored; approved game artwork and audio assets are untouched.

## Case and verdict

The fixed HR Case #3 counts are Junior attended 80/100, Junior absent 450/600, Senior attended 60/300, and Senior absent 10/100. The aggregate rates are 140/400 (35%) and 460/700 (65.714%). The actual Junior shares are 25% and 600/700 (85.714%). Rates are recalculated from fixed within-level rates when the independent hypothetical composition sliders move. At a shared 50/50 mix, the hypothetical rates are 50% and 42.5%.

The player can save any two comparisons. Two different, same-level, different-attendance comparisons plus a pause-and-evaluate decision and the composition explanation support success. Wrong decisions or explanations produce a failure ending. A correct judgment with incomplete comparisons returns to the desk without completing the run. A hypothetical snapshot is optional. If a player attaches an unsupported observation to a snapshot, the game asks them to correct or remove it before finalizing a correct judgment. Historical records never change. No observational comparison is presented as proof of training causation.

## Scenes and character

The intro leads to the investigation desk, then to the meeting and one of two endings. Both endings offer a manually advanced six-beat reveal of the aggregate rates, two within-level comparisons, actual compositions, one explicitly hypothetical common composition, and finally Simpson's Paradox and the causation limit.

The user-provided approved character sheet is preserved as `felfel-reference.png`. The four isolated transparent, full-body poses in `public/investigation-file/assets/felfel/` were made with built-in image generation using that sheet as the authoritative edit/reference and inspected visually. The prompt set required the same long pale-gray neck and nose, half-lidded eyes, black fedora with red band, charcoal trench coat, red scarf, dark paws and tail, satchel, magnifier, heavy ink outlines and warm painted shading. Individual poses requested: calm idle, magnifier inspection/thinking, raised-folder discovery celebration, and kind disappointment. CSS keyframes provide short entrance, talk, inspection, surprise, discovery, celebration, concern, and exit actions from those consistent key poses. These are derived game assets, not Contrary assets.

The paper, thick outline, button lift, color and sound language follows the existing Investigation File adaptation of Contrary. The existing `public/investigation-file/CONTRARY-LICENSE.txt` retains the upstream MIT notice for reused elements and selected SFX. No third-party detective-board screenshot art or undocumented Contrary music is copied.

The alternate Felfel poses are decoded during the opening scene so later reactions appear complete when the scene changes. Selected desktop and mobile visual checks are in `previews/`.

## Verification

Nine focused integration tests and all 22 desktop/mobile Playwright scenarios passed for the current pass. Commands: `node --check public/investigation-file/js/investigation.mjs`, `node --test tests/investigation-file-integration.test.mjs`, `npx playwright test tests/e2e/investigation-file.spec.ts --workers=1`, `npm run build`, and `git diff --check`. The Playwright scenarios exercise opening-speaker focus, both office tabs, retained comparisons, both endings, missing evidence, exact reset, independent 5% slider moves, snapshot interpretation, three hints, reveal, keyboard, mobile, mute and reduced motion. Desktop and mobile captures were reviewed for the analysis lab and Felfel hint, plus the endings and reveal. Set `INVESTIGATION_CAPTURE_PREVIEWS=1` before the Playwright command to regenerate full-page screenshots; routine test runs skip these captures.
