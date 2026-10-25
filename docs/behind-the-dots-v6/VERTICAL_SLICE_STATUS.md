# Behind the Dots V6 vertical slice

**Date:** 2026-10-25  
**Branch:** `feature/behind-the-dots-v6-adventure`  
**Scope:** first reviewable slice only; no merge, push, or deployment.

## Implemented

- Animated Cairo market opening with Leila, Glitch and Dotty, with five dialogue beats, speaker focus, pose changes, and entrance acting.
- Notebook opening into a two-step interactive tutorial. The player plots day six, reveals the earlier days, and selects one of the original relationship answers.
- Challenge one: heat and ice-cream sales, twelve plotted days, the original three answer buttons, 20-second timer, and three-heart HUD.
- Correct, wrong, and timeout/heart-loss reactions, including separate character pose frames, chart feedback, and score/heart updates.
- Responsive presentation checked at 1440×900 and 390×844.

## Character assets and motion

The V5 market art and canonical V5 Leila, Dotty, and Glitch images remain the identity references. New OpenAI-generated, reference-guided transparent frames live under `public/assets/behind-dots/v6/`; their pose and source-sheet inventory is in `asset-manifest.json`.

- Leila: enter, talk, worried, and happy acting poses.
- Dotty: idle, enter, stumble, celebrate, and four running-cycle frames.
- Glitch: idle, enter, stumble, taunt, and four running-cycle frames.
- Camera focus and environment movement follow dialogue speakers and scenes. Character acting uses distinct generated poses and running frames; timed CSS easing supports entrances and transitions.

## Verification

- `npx tsc -p tsconfig.app.json --noEmit` passed.
- `npm run build` passed (Vite reported only its existing large-chunk advisory).
- `git diff --check` passed.
- Browser review: desktop opening, all five dialogue beats, notebook tutorial, tutorial plot and answer flow, first challenge, correct answer, and wrong answer with one heart lost.
- Browser review: mobile opening, dialogue, first challenge and timeout/heart loss at 390×844. No clipped challenge controls or horizontal overflow were visible.

## Remaining scope and limitations

- Challenges two and three, recommendation, and endings are intentionally not implemented as V6 work.
- Character acting is made from separately generated aligned pose images and four-frame run cycles. It is frame-based acting, not a deformable skeletal rig.
- The production brief's referenced 11-panel storyboard was not present in the supplied directory; the nine supplied specification files remain the implementation authority.
- Browser screenshots were inspected during this run. The CUA browser returned them inline and does not expose a file-save action, so this record does not claim downloadable screenshot files.
