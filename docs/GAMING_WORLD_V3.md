# Luminous Gaming World V3 — local implementation

**Date:** 2026-11-03. **Branch:** `codex/light-premium-v2`.

The Hub, Character Setup, and Plans share a luminous environmental stage with sunlit stone, blue/violet depth, and warm gold. The public landing keeps its structure; its existing horizontal game shelf gains the same dimensional mission-tile treatment. The six catalog covers, exact titles, actual avatars, plan content, server-derived annual price, access decisions, and game saves come from the existing implementation. No generated metrics, artwork for games, or fictional benefits are displayed.

The background image at `src/assets/world/luminous-courtyard.webp` is original decorative environmental art generated with the built-in image tool and compressed to WebP. Prompt: “Create an original wide environmental background plate for a premium Arabic puzzle-adventure gaming web hub, image asset only. Luminous cinematic world at dawn: airy ancient-modern stone courtyard and distant layered architecture, blue-violet atmospheric depth, warm gold sunlight streaming diagonally, subtle red and electric blue accents, painterly-real 3D game art quality. The middle and lower half must be spacious and relatively calm so six actual game cover tiles and UI text can be composited in CSS. Gorgeous ambient depth, elegant, optimistic, tactile, premium. No people, no characters, no game covers, no cards, no logos, no lettering, no interface, no numbers, no icons, no borders. 16:9 landscape. This is decorative environmental art, not product mockup.”

Character Setup writes only the chosen avatar/gender and the existing work fields. It reads the name from the verified profile. If that name is missing, the existing Player Center profile editor provides the recovery path; the setup CTA remains disabled until the record is complete. Plans retain the Free and Annual choices and existing payment summary routing. CSS hover, focus, pressed, and reduced-motion states apply to the game tiles.

## Local review

- Start the synthetic preview with `node tests/gaming-v2/preview-server.mjs`, then open `http://127.0.0.1:8099/tests/gaming-v3/preview.html`.
- The server only answers local synthetic account/access calls and blocks checkout. Do not use a real account in this preview.
- Review BGM candidates and the Kenney effects at `http://127.0.0.1:8099/tests/gaming-v3/audition.html`. V2's CC0 tracks and central mixer remain in place. The default soundtrack is provisional until owner audition; it is not presented as approved.
- Desktop, tablet, and mobile browser captures are under `artifacts/gaming-v3/`. The screenshots use synthetic accounts, not production data.

## Acceptance record

- [x] Original six covers and titles; 3×2 desktop Hub and two columns at 360–430 px; no Hub carousel.
- [x] Existing avatar art; no duplicate name fields; Department and Industry retained.
- [x] Free and Annual passes only; source price and secure journey unchanged.
- [x] Public horizontal showcase retained and visually polished.
- [x] Hover, keyboard focus, pressed feedback; existing short UI sounds and reduced-motion handling.
- [x] Existing central audio control, unlock, persistence, and game-route silence verified by browser tests.
- [ ] Soundtrack candidate chosen by owner after audition.
- [ ] Production services and real payment flow intentionally untested in this local review.
