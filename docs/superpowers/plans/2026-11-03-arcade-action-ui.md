# Arcade Action UI Implementation Plan

> **For agentic workers:** Execute this plan task by task, checking each result against the approved design in `docs/GAMING_ARCADE_V4.md`.

**Goal:** Turn the V3 shell into a lively arcade/action gaming experience across Hub, Character, Plans, Player Center and Landing.

**Architecture:** Keep React route and business logic unchanged. Put the new look in a scoped stylesheet, use one compressed decorative background asset, add bounded pointer feedback to existing cards, and add an accessible timer to the existing Landing showcase.

**Tech Stack:** React, TypeScript, Vite, CSS, Playwright.

**Spec:** `docs/GAMING_ARCADE_V4.md`

## Global Constraints

- Six original covers, Arabic titles, two original portraits, Free and Annual only.
- Preserve game internals, entitlement/payment flow, local save state and other worktrees.
- Respect keyboard/touch, reduced motion, audio unlock and mobile width 360–430 px.

## Review Focus

- Auto-advance pauses during user interaction and reduced motion.
- RTL manual arrows and touch still work after auto-advance.
- Cards keep their real access/progress action and all six fit the desktop 3×2 grid.
- Account editor and plan choices remain functional.
- No sideways overflow or clipped controls at 360 px.

---

## Tasks

- [x] Add compressed abstract arcade environment and scoped Hub/mission-card styling; capture desktop and mobile screenshots.
- [x] Restyle Character, Plans and Player Center using the same arcade materials; verify existing flows.
- [x] Add autoplay, pause/resume, interaction pause and reduced-motion handling to Landing showcase; test RTL navigation.
- [x] Run focused Playwright, typecheck, lint and build; inspect screenshots; document remaining risks and local preview.
