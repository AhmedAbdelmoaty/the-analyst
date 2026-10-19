# Reward Decision scene and narration integration

Local review: 2026-10-19, based on `main` HEAD `25cb296639879ede73414466911768e79b7ddd65` (`origin/main`). This integration is uncommitted and has not been pushed or deployed. The pre-update working tree is preserved in `stash@{0}`. The [final Arabic brief](Reward_Decision_Final_Implementation_Brief_AR.md) remains the acceptance contract; this page records the implemented mapping for maintenance.

## Scene map

All keys resolve to explicit landscape and portrait files in `data/assets.ts`. The delivered directory contains 34 distinct scene pairs and seven unchanged RGBA character masters. The cover uses the A09 corridor because there is no A00 image. The return, gap, and incoming-call backgrounds use the gender-matching A15 analyst office because there is no separate base A21 image.

| Story moment or line IDs | Semantic scene | Asset family |
| --- | --- | --- |
| Cover | `corridor` | A09 |
| Celebration intro, `celebration_01` | `opening` | A01 |
| `celebration_02`, `celebration_03`, pending approval card | `marwan-reply` | A02 |
| `debate_01`, `debate_02` | `debate` | A04 |
| `debate_03` | `policy-debate` | A05 |
| CEO door transition | `door-male/female` | A06 |
| `briefing_01`, `briefing_02` | `briefing-male/female` | A07 |
| `briefing_03`, transition to hub | `final-directions` | A08; portrait is PNG |
| Interactive office choice | `corridor` | A09 |
| `sales_01`, `sales_02` | `sales-male/female` | A11 |
| `sales_03`, individual-record handover | `sales-records` | A12 |
| `hr_01`, `hr_02` | `hr-male/female` | A13 |
| `hr_03` | `hr-guidance` | A14 |
| Interactive workbench, office return, call gap, incoming call | `analyst-male/female` | A15 |
| Interactive recommendation | `report-male/female` | A17 |
| `meeting_01` | `meeting-opening` | A18 opening |
| `meeting_02` | `meeting-player-male/female` | A18 player |
| `meeting_03_*` through `meeting_05_*`, only when `evaluation.reason === 'complete'` | `meeting-neutral` | A19 |
| `meeting_03_*` through `meeting_05_*`, all other reasons | `meeting-concerned` | A20 |
| Call lines with Mahmoud speaking, submitted team Marwan / Mahmoud | `phone-mahmoud-upset/happy` | A21 |
| Call lines with Marwan speaking, submitted team Marwan / Mahmoud | `phone-marwan-happy/upset` | A21 |
| Player call lines, submitted team Marwan / Mahmoud | `phone-player-male/female-concerned/calm` | A21 |
| Manual debrief, replay, and exit | `completed-folder` | A25 |

The actual delivered portrait filename `d-a17-analyst-reviews-report-male-P.webp` lacks the brief's initial `r`. The manifest intentionally references the file as delivered; no source asset was renamed or altered. The `Mahmoud’s` master filename contains a Unicode right single quotation mark.

## Automatic narration

`engine/narrativeClock.ts` reveals Arabic graphemes at about 34 ms each. It then holds the complete line for 1.6–3.4 seconds, with a minimum total reading duration for long lines. The scheduler owns one semantic line/phase key, freezes remaining time while paused, hidden, or blocked by the case file/document flight, and guards callbacks by run identity and line. Optional tap/keyboard reveal does not force progression. The hub, workbench, recommendation, document reader, incoming Answer, cover start, and debrief remain player controlled. The existing save boundaries and analytics paths remain in place.

`ScenePlayer` crossfades for 320 ms within a location and 420 ms between locations; responsive `<picture>` chooses the matching portrait or landscape image. Same-key dialogue lines keep a stable image. Reduced-motion preference suppresses motion through the existing motion configuration and CSS.

## Verification boundary

`npm run build`, `npx tsc --noEmit`, targeted ESLint, and the synthetic Playwright smoke test passed on the current base. Playwright intercepts every non-local request; it exercises male/female runs, both office visit orders, supported/unsupported meeting outcomes, both manual call answers, pause, file overlay, hidden-tab freeze, 320 px portrait, desktop, and mobile landscape. Bun unit tests could not be rerun in this Windows environment because Bun is not installed. Full `npm run lint` still reports 12 errors and 13 warnings in unrelated/pre-existing files; the changed game files have no lint errors. This is not a live backend or production account test. No application database, auth, subscription, or cloud service was changed for this integration.
