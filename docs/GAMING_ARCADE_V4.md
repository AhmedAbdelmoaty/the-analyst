# Arcade Action UI — approved implementation direction

**2026-11-03.** The owner selected Arcade Rush blended with the stronger color and motion of Comic Action Playground, leaning toward the latter. Implement on `codex/light-premium-v2` only.

- Replace the scenic city background with an abstract action arcade arena. Use the original six game covers, Arabic titles, avatars, real profile/access state and two existing plans.
- Hub: keep the desktop 3×2 and mobile two-column catalog; make each card feel like a physical selectable game with vivid distinct frame colors, a visible play control, pointer tilt, cover zoom, light sweep, focus/pressed states and restrained UI sound.
- Player Center, Character Setup and Plans share the same arcade materials, typography and button language without changing their account, persistence or payment behavior.
- Landing: advance one existing catalog card automatically every five seconds, loop to start, retain arrows and manual drag, provide a pause/resume control, pause during interaction or hidden tab, and disable autoplay for reduced motion.
- Verify desktop/tablet/mobile screenshots, navigation, access states, keyboard/touch/reduced motion, audio boundaries, preview, typecheck and build. No game internals, backend, payment fulfillment, push or deployment.

## Local implementation record

The arcade background is `src/assets/world/arcade-arena.webp` (130 KB), generated with the built-in image tool. Final prompt: “Create a high-quality original 16:9 environmental background plate ONLY for a colorful action arcade game-selection website, inspired by premium arcade energy and comic action. No UI, no cards, no text, no logo, no people, no characters, no game covers. A bright abstract playable arena made of layered cobalt-blue and deep violet platforms, sweeping electric cyan light tracks, warm orange and magenta edge lights, subtle halftone and dynamic geometric speed streaks, dramatic depth and glossy floor reflections. Keep the central 75% relatively calm and darker for six authentic game cover cards to be overlaid; concentrate energetic lighting at the edges and top. Luminous, premium, colorful, exciting, not gloomy or a generic dashboard. Absolutely no buildings, minarets, domes, mosque-like architecture, arches, fantasy city, landscape or flowers. No fake statistics, icons, badges or physical game machines. Decorative background image only.” The earlier scenic V3 asset is no longer referenced by the runtime CSS.

`src/features/platform-shell/arcade.css` skins the existing shell. `GameCoverCard.tsx` adds bounded pointer tilt and keeps the actual card action and access decision. `GameShowcase.tsx` advances the existing strip one card every five seconds and provides pause/resume while retaining manual drag, arrows and RTL keyboard navigation. It stops advancing while hovered, focused, touched, hidden, manually paused or under reduced motion. No carousel was added to the authenticated Hub.

Review at `http://127.0.0.1:8099/tests/gaming-v4/preview.html` using synthetic accounts only; audio audition at `/tests/gaming-v4/audition.html`. Real browser captures are in `artifacts/gaming-v4/`. The soundtrack remains provisional pending owner listening; UI audio and its provenance are unchanged.

## Verification

- V4 Playwright: 11 passed, including desktop/tablet/mobile layouts, card hover/focus, automatic advance, interaction pause/resume, loop and reduced-motion behavior.
- Existing V2 Playwright: 21 passed after allowing a harmless one-pixel RTL `scrollLeft` rounding difference in its showcase assertion.
- TypeScript, focused ESLint, 12 unit tests, production build and `git diff --check` passed.
- The live Chrome preview and audio audition were opened from the local server. No production account, payment or backend action was used.
- The soundtrack selections are still provisional until the owner listens and chooses. This UI pass did not change gameplay internals, payment fulfillment or deployment state.
