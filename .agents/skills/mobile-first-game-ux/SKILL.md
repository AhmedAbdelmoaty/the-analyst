---
name: mobile-first-game-ux
description: Design or refine a browser game's mobile screen, HUD, dialogue, choices, cards or responsive layout in The Analyst. Use for spacing, overflow, touch, Arabic RTL or viewport-height problems; preserve existing art direction and gameplay.
---

# Mobile-first game UX

Start with the first playable screen at 360×740, 390×844 and 430×932 CSS pixels. Identify what the player must see and touch before scrolling. Keep the header compact, the primary choice or action near the play area, and character art subordinate to gameplay. Scale art with `clamp()` or container constraints while preserving its aspect ratio; place speech bubbles and cards so they do not obscure controls or clip at narrow widths.

Use deliberate spacing and readable Arabic typography. Respect RTL reading order and logical CSS properties while keeping numbers, timers and directional icons understandable. Prevent horizontal overflow. Support safe-area insets, keyboard focus, reduced motion and accessible touch targets (aim for at least 44×44 CSS pixels where practical). Keep tables, dialogs and choices usable on a phone: wrap or scroll a table within its own region, constrain dialogs to the visible viewport, and stack choices when needed.

Use available viewport height intentionally. Avoid large empty sections, unnecessary `min-height`, exaggerated padding and desktop compositions squeezed onto mobile. Do not impose fixed heights that clip content on smaller screens. Sticky or fixed actions are appropriate only when they stay clear of content, safe areas and on-screen keyboards. Keep layout stable during animation; animate transforms and opacity instead of changing document flow when possible.

Adapt at tablet and desktop widths with a purposeful composition rather than merely enlarging mobile panels. Reuse the existing game's assets, tokens and components; preserve story, timing, scoring, saves and navigation.

For visual changes, inspect one representative mobile view and one desktop view. Check the other named mobile sizes or tablet only when the changed layout creates a real overflow, height or composition risk. Fix visible issues, then stop; do not loop through redundant screenshots.
